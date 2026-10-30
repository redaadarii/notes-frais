-- Databricks notebook source
-- MAGIC %md
-- MAGIC # Contrôles automatiques des notes de frais
-- MAGIC
-- MAGIC Les règles **bloquantes** (au moins une ligne, justificatif obligatoire) sont appliquées par
-- MAGIC l'application au moment de la soumission. Ce job calcule les **signaux d'alerte** destinés aux
-- MAGIC valideurs : ils n'empêchent rien, ils attirent l'attention.
-- MAGIC
-- MAGIC | Règle | Signification |
-- MAGIC |---|---|
-- MAGIC | `OVER_LIMIT` | Montant supérieur au plafond de la catégorie |
-- MAGIC | `MISSING_RECEIPT` | Justificatif obligatoire absent |
-- MAGIC | `DUPLICATE` | Même collaborateur, même date, même catégorie, même montant sur une autre ligne |
-- MAGIC | `OUT_OF_PERIOD` | Date de dépense hors du mois de la note |
-- MAGIC
-- MAGIC **Idempotent** : les anomalies des notes contrôlées sont remplacées à chaque exécution.

-- COMMAND ----------

CREATE WIDGET TEXT catalog DEFAULT 'workspace';

-- COMMAND ----------

CREATE WIDGET TEXT schema DEFAULT 'dev_redaadari_notes_frais';

-- COMMAND ----------

USE CATALOG IDENTIFIER(:catalog);
USE SCHEMA IDENTIFIER(:schema);

-- COMMAND ----------

-- Périmètre : les notes qu'un valideur peut encore traiter.
CREATE OR REPLACE TEMPORARY VIEW lines_in_scope AS
SELECT l.*, r.employee_email, r.period, c.unit_limit, c.receipt_required, c.label AS category_label
FROM expense_lines l
JOIN expense_reports r ON r.id = l.report_id
JOIN categories c      ON c.code = l.category_code
WHERE r.status IN ('SUBMITTED', 'MANAGER_APPROVED');

-- COMMAND ----------

CREATE OR REPLACE TEMPORARY VIEW detected_checks AS
SELECT report_id, id AS line_id, 'OVER_LIMIT' AS rule,
       -- %.2f n'accepte pas le type DECIMAL : conversion en DOUBLE, pour l'affichage uniquement
       format_string('%s : %.2f € pour un plafond de %.2f €', category_label,
                     CAST(amount AS DOUBLE), CAST(unit_limit AS DOUBLE)) AS detail
FROM lines_in_scope
WHERE unit_limit IS NOT NULL AND amount > unit_limit

UNION ALL
SELECT report_id, id, 'MISSING_RECEIPT',
       format_string('%s du %s : justificatif obligatoire absent', category_label, CAST(expense_date AS STRING))
FROM lines_in_scope
WHERE receipt_required AND receipt_path IS NULL

UNION ALL
-- Le doublon est cherché dans TOUTES les notes du collaborateur, y compris déjà validées ou exportées.
SELECT s.report_id, s.id, 'DUPLICATE',
       format_string('Dépense identique déjà saisie dans la note « %s » (%s)', o.title, o.status)
FROM lines_in_scope s
JOIN expense_lines o_line
  ON  o_line.id <> s.id
  AND o_line.expense_date  = s.expense_date
  AND o_line.category_code = s.category_code
  AND o_line.amount        = s.amount
JOIN expense_reports o
  ON  o.id = o_line.report_id
  AND o.employee_email = s.employee_email
  AND o.status <> 'REJECTED'

UNION ALL
SELECT report_id, id, 'OUT_OF_PERIOD',
       format_string('Dépense du %s dans une note de %s', CAST(expense_date AS STRING), period)
FROM lines_in_scope
WHERE date_format(expense_date, 'yyyy-MM') <> period;

-- COMMAND ----------

-- Remplacement atomique : une seule instruction MERGE supprime les anomalies périmées
-- et insère les nouvelles. Un lecteur ne voit jamais un état intermédiaire.
MERGE INTO report_checks AS target
USING (
  SELECT DISTINCT report_id, line_id, rule, detail FROM detected_checks
) AS source
ON  target.report_id = source.report_id
AND target.line_id <=> source.line_id
AND target.rule = source.rule
AND target.detail = source.detail
WHEN MATCHED THEN UPDATE SET checked_at = current_timestamp()
WHEN NOT MATCHED THEN
  INSERT (report_id, line_id, rule, detail, checked_at)
  VALUES (source.report_id, source.line_id, source.rule, source.detail, current_timestamp())
-- Anomalie corrigée, ou note sortie du périmètre (validée, rejetée, exportée) : on la retire.
WHEN NOT MATCHED BY SOURCE THEN DELETE;

-- COMMAND ----------

-- Synthèse visible dans la sortie du run
SELECT rule, COUNT(*) AS anomalies, COUNT(DISTINCT report_id) AS notes
FROM report_checks
GROUP BY rule
ORDER BY rule;
