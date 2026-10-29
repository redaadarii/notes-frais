-- Databricks notebook source
-- MAGIC %md
-- MAGIC # 02 — Chargement des référentiels
-- MAGIC
-- MAGIC | Technique | Pourquoi |
-- MAGIC |---|---|
-- MAGIC | Données écrites dans le notebook, versionnées dans Git | Le référentiel de dev est relisible et reproductible |
-- MAGIC | `MERGE` | Insère les nouveaux, met à jour les existants : relançable sans doublon |
-- MAGIC | `WHEN NOT MATCHED BY SOURCE` | Un collaborateur retiré de la liste est **désactivé**, jamais supprimé |

-- COMMAND ----------

CREATE WIDGET TEXT catalog DEFAULT 'workspace';

-- COMMAND ----------

CREATE WIDGET TEXT schema DEFAULT 'dev_redaadari_notes_frais';

-- COMMAND ----------

USE CATALOG IDENTIFIER(:catalog);
USE SCHEMA IDENTIFIER(:schema);

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Collaborateurs
-- MAGIC En entreprise, cette liste viendrait d'**Entra ID** (attribut `manager`, via Microsoft Graph) ou du SIRH.

-- COMMAND ----------

MERGE INTO employees AS target
USING (
  -- MERGE refuse les alias de colonnes sur sa source : on nomme les colonnes
  -- dans une sous-requête (AS t(...)), puis on aliase la sous-requête.
  SELECT * FROM VALUES
    ('sara.finance@exemple.com',    'Sara Bennani',    CAST(NULL AS STRING),        'FIN'),
    ('karim.manager@exemple.com',   'Karim Alaoui',    'sara.finance@exemple.com',  'VENTES'),
    ('nadia.manager@exemple.com',   'Nadia Tazi',      'sara.finance@exemple.com',  'IT'),
    ('redaadari@gmail.com',         'Reda Adari',      'karim.manager@exemple.com', 'VENTES'),
    ('yasmine.employe@exemple.com', 'Yasmine Idrissi', 'karim.manager@exemple.com', 'VENTES'),
    ('omar.employe@exemple.com',    'Omar Fassi',      'nadia.manager@exemple.com', 'IT')
  AS t(email, full_name, manager_email, cost_center)
) AS source
ON target.email = source.email
WHEN MATCHED THEN UPDATE SET
  full_name     = source.full_name,
  manager_email = source.manager_email,
  cost_center   = source.cost_center,
  active        = true
WHEN NOT MATCHED THEN
  INSERT (email, full_name, manager_email, cost_center, active)
  VALUES (source.email, source.full_name, source.manager_email, source.cost_center, true)
-- Présent dans la table mais absent de la liste : on désactive (l'historique de ses notes est conservé).
WHEN NOT MATCHED BY SOURCE AND target.active THEN UPDATE SET active = false;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Catégories de dépense
-- MAGIC Pas de `NOT MATCHED BY SOURCE` ici : une catégorie retirée est peut-être utilisée par des lignes existantes.

-- COMMAND ----------

MERGE INTO categories AS target
USING (
  SELECT * FROM VALUES
    --  code,        libellé,                    plafond,                         justificatif, compte
    ('MEAL',      'Repas',                    CAST(300.00  AS DECIMAL(12,2)), true,  '6257'),
    ('TRANSPORT', 'Transport',                CAST(NULL    AS DECIMAL(12,2)), true,  '6241'),
    ('HOTEL',     'Hébergement',              CAST(1500.00 AS DECIMAL(12,2)), true,  '6251'),
    ('MILEAGE',   'Indemnités kilométriques', CAST(NULL    AS DECIMAL(12,2)), false, '6252'),
    ('SUPPLIES',  'Petites fournitures',      CAST(500.00  AS DECIMAL(12,2)), true,  '6061')
  AS t(code, label, unit_limit, receipt_required, gl_account)
) AS source
ON target.code = source.code
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;