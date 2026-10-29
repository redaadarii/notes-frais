-- Databricks notebook source
-- MAGIC %md
-- MAGIC # 01 — Création des tables
-- MAGIC
-- MAGIC Crée les 5 tables du modèle dans le schéma **déclaré par le bundle** (`resources/schema.yml`).
-- MAGIC Ce notebook ne crée ni le schéma ni le volume : c'est le rôle du bundle.
-- MAGIC
-- MAGIC **Idempotent** : `CREATE TABLE IF NOT EXISTS`, et chaque contrainte est supprimée puis recréée.

-- COMMAND ----------

-- Paramètres : fournis par le job. Les valeurs DEFAULT servent seulement pour une exécution manuelle.
CREATE WIDGET TEXT catalog DEFAULT 'workspace';

-- COMMAND ----------

CREATE WIDGET TEXT schema DEFAULT 'dev_redaadari_notes_frais';

-- COMMAND ----------

-- IDENTIFIER() : le texte du paramètre devient un nom d'objet, sans risque d'injection SQL.
USE CATALOG IDENTIFIER(:catalog);
USE SCHEMA IDENTIFIER(:schema);
SELECT current_catalog() AS catalogue, current_schema() AS schema_courant;

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Référentiels

-- COMMAND ----------

CREATE TABLE IF NOT EXISTS employees (
  email         STRING  NOT NULL COMMENT "Identifiant = e-mail de connexion",
  full_name     STRING  NOT NULL COMMENT "Nom affiché",
  manager_email STRING           COMMENT "Manager direct ; NULL = sommet de la hiérarchie",
  cost_center   STRING  NOT NULL COMMENT "Centre de coût, repris dans l'export comptable",
  active        BOOLEAN NOT NULL COMMENT "Un collaborateur inactif ne peut plus rien saisir",
  CONSTRAINT pk_employees PRIMARY KEY (email)
)
COMMENT "Collaborateurs et hiérarchie (équivalent de l'attribut manager d'Entra ID)";

-- Idempotence d'une contrainte CHECK : on la supprime si elle existe, puis on la recrée.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS not_own_manager;
ALTER TABLE employees ADD CONSTRAINT not_own_manager CHECK (manager_email IS NULL OR manager_email <> email);

-- COMMAND ----------

CREATE TABLE IF NOT EXISTS categories (
  code             STRING        NOT NULL COMMENT "Code technique, ex. MEAL",
  label            STRING        NOT NULL COMMENT "Libellé affiché",
  unit_limit       DECIMAL(12,2)          COMMENT "Plafond par dépense ; NULL = sans plafond",
  receipt_required BOOLEAN       NOT NULL COMMENT "Justificatif obligatoire pour soumettre",
  gl_account       STRING        NOT NULL COMMENT "Compte comptable utilisé par l'export",
  CONSTRAINT pk_categories PRIMARY KEY (code)
)
COMMENT "Catégories de dépenses et règles associées";

ALTER TABLE categories DROP CONSTRAINT IF EXISTS positive_unit_limit;
ALTER TABLE categories ADD CONSTRAINT positive_unit_limit CHECK (unit_limit IS NULL OR unit_limit > 0);

-- COMMAND ----------

-- MAGIC %md
-- MAGIC ## Notes de frais, lignes et historique

-- COMMAND ----------

CREATE TABLE IF NOT EXISTS expense_reports (
  id                  STRING        NOT NULL COMMENT "UUID généré par l'application",
  employee_email      STRING        NOT NULL COMMENT "Auteur de la note",
  title               STRING        NOT NULL,
  period              STRING        NOT NULL COMMENT "Mois concerné, AAAA-MM",
  status              STRING        NOT NULL COMMENT "Voir la contrainte valid_status",
  total_amount        DECIMAL(12,2) NOT NULL COMMENT "Somme des lignes, calculée par l'application",
  manager_email       STRING                 COMMENT "Manager FIGÉ au moment de la soumission",
  created_at          TIMESTAMP     NOT NULL,
  submitted_at        TIMESTAMP,
  manager_decision_by STRING,
  manager_decision_at TIMESTAMP,
  finance_decision_by STRING,
  finance_decision_at TIMESTAMP,
  rejection_reason    STRING,
  export_batch        STRING                 COMMENT "Identifiant du lot d'export comptable",
  exported_at         TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL,
  CONSTRAINT pk_expense_reports PRIMARY KEY (id),
  CONSTRAINT fk_reports_employee FOREIGN KEY (employee_email) REFERENCES employees (email)
)
COMMENT "Notes de frais (en-têtes)";

ALTER TABLE expense_reports DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE expense_reports ADD CONSTRAINT valid_status
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'EXPORTED'));

ALTER TABLE expense_reports DROP CONSTRAINT IF EXISTS valid_period;
ALTER TABLE expense_reports ADD CONSTRAINT valid_period CHECK (period RLIKE '^[0-9]{4}-(0[1-9]|1[0-2])$');

ALTER TABLE expense_reports DROP CONSTRAINT IF EXISTS non_negative_total;
ALTER TABLE expense_reports ADD CONSTRAINT non_negative_total CHECK (total_amount >= 0);

-- COMMAND ----------

CREATE TABLE IF NOT EXISTS expense_lines (
  id            STRING        NOT NULL COMMENT "UUID généré par l'application",
  report_id     STRING        NOT NULL,
  expense_date  DATE          NOT NULL,
  category_code STRING        NOT NULL,
  description   STRING        NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  receipt_path  STRING                 COMMENT "Chemin du justificatif dans le volume receipts",
  created_at    TIMESTAMP     NOT NULL,
  CONSTRAINT pk_expense_lines PRIMARY KEY (id),
  CONSTRAINT fk_lines_report   FOREIGN KEY (report_id)     REFERENCES expense_reports (id),
  CONSTRAINT fk_lines_category FOREIGN KEY (category_code) REFERENCES categories (code)
)
COMMENT "Lignes de dépense d'une note";

ALTER TABLE expense_lines DROP CONSTRAINT IF EXISTS positive_amount;
ALTER TABLE expense_lines ADD CONSTRAINT positive_amount CHECK (amount > 0);

-- COMMAND ----------

CREATE TABLE IF NOT EXISTS report_events (
  id          STRING    NOT NULL COMMENT "UUID",
  report_id   STRING    NOT NULL,
  action      STRING    NOT NULL COMMENT "CREATE, SUBMIT, APPROVE, REJECT, EXPORT…",
  actor       STRING    NOT NULL COMMENT "E-mail de la personne, ou nom du job",
  from_status STRING,
  to_status   STRING,
  comment     STRING,
  created_at  TIMESTAMP NOT NULL,
  CONSTRAINT pk_report_events PRIMARY KEY (id),
  CONSTRAINT fk_events_report FOREIGN KEY (report_id) REFERENCES expense_reports (id)
)
COMMENT "Historique de chaque note : qui a fait quoi, quand (audit)";

-- COMMAND ----------

SHOW TABLES;