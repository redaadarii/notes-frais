-- Databricks notebook source
-- MAGIC %md
-- MAGIC # 03 — Contrôle de qualité des données
-- MAGIC
-- MAGIC Une contrainte `CHECK` ne voit qu'**une ligne à la fois**. Les règles qui comparent
-- MAGIC **plusieurs lignes** (le manager existe-t-il ? la hiérarchie boucle-t-elle ?) sont vérifiées ici.
-- MAGIC
-- MAGIC Toutes les règles sont évaluées **ensemble** ; si une seule échoue, le notebook (donc le job) échoue.

-- COMMAND ----------

CREATE WIDGET TEXT catalog DEFAULT 'workspace';

-- COMMAND ----------

CREATE WIDGET TEXT schema DEFAULT 'dev_redaadari_notes_frais';

-- COMMAND ----------

USE CATALOG IDENTIFIER(:catalog);
USE SCHEMA IDENTIFIER(:schema);

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Chaînes hiérarchiques (requête récursive)
-- MAGIC Pour chaque collaborateur, on remonte de manager en manager. On s'arrête au sommet,
-- MAGIC ou dès qu'on retombe sur une personne déjà vue : c'est une **boucle**.

-- COMMAND ----------

CREATE OR REPLACE TEMPORARY VIEW hierarchy_chains AS
WITH RECURSIVE chains (email, next_manager, path) AS (
  -- Point de départ : chaque collaborateur actif, seul dans son chemin
  SELECT email, manager_email, array(email)
  FROM employees
  WHERE active

  UNION ALL

  -- Étape : on ajoute le manager suivant au chemin, sauf s'il y est déjà
  SELECT c.email, e.manager_email, array_append(c.path, e.email)
  FROM chains c
  JOIN employees e ON e.email = c.next_manager
  WHERE NOT array_contains(c.path, e.email)
)
SELECT email,
       path,
       array_contains(path, next_manager) AS is_cycle -- le manager suivant est déjà dans le chemin
FROM chains;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Les règles
-- MAGIC Chaque règle renvoie les lignes **en anomalie**. Tout est réuni dans une seule vue.

-- COMMAND ----------

CREATE OR REPLACE TEMPORARY VIEW anomalies AS
SELECT 'Manager inconnu' AS rule, concat(e.email, ' → ', e.manager_email) AS detail
FROM employees e
LEFT JOIN employees m ON e.manager_email = m.email
WHERE e.active AND e.manager_email IS NOT NULL AND m.email IS NULL

UNION ALL
SELECT 'Manager inactif', concat(e.email, ' → ', e.manager_email)
FROM employees e
JOIN employees m ON e.manager_email = m.email
WHERE e.active AND NOT m.active

UNION ALL
SELECT 'E-mail en double', concat(lower(email), ' (', CAST(COUNT(*) AS STRING), ' fois)')
FROM employees
GROUP BY lower(email)
HAVING COUNT(*) > 1

UNION ALL
SELECT 'Compte comptable invalide (4 chiffres attendus)', concat(code, ' : ', gl_account)
FROM categories
WHERE NOT gl_account RLIKE '^[0-9]{4}$'

UNION ALL
SELECT DISTINCT 'Boucle dans la hiérarchie', concat_ws(' → ', path)
FROM hierarchy_chains
WHERE is_cycle;

-- COMMAND ----------

-- Les anomalies trouvées (tableau vide = tout va bien)
SELECT * FROM anomalies ORDER BY rule;

-- COMMAND ----------

-- La hiérarchie complète, pour une vérification visuelle : le chemin le plus long de chaque collaborateur.
SELECT email AS collaborateur,
       concat_ws(' → ', max_by(path, size(path))) AS chaine_hierarchique
FROM hierarchy_chains
GROUP BY email
ORDER BY collaborateur;

-- COMMAND ----------

-- Verdict : raise_error() fait ÉCHOUER la cellule, donc la tâche, donc le job.
SELECT CASE
         WHEN (SELECT COUNT(*) FROM anomalies) = 0 THEN '✅ Toutes les règles sont respectées'
         ELSE raise_error(concat(
           CAST((SELECT COUNT(*) FROM anomalies) AS STRING),
           ' anomalie(s) de qualité : voir le tableau des anomalies ci-dessus'
         ))
       END AS verdict;