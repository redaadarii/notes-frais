# Databricks notebook source
# MAGIC %md
# MAGIC # Notes de frais — modèle de données
# MAGIC **Idempotent** : `IF NOT EXISTS` + `MERGE` → relançable sans rien casser ni dupliquer.

# COMMAND ----------

dbutils.widgets.text("catalog", "workspace")
dbutils.widgets.text("schema", "notes_frais_dev")
catalog = dbutils.widgets.get("catalog")
schema = dbutils.widgets.get("schema")
cs = f"{catalog}.{schema}"

spark.sql(f"CREATE SCHEMA IF NOT EXISTS {cs} COMMENT 'Notes de frais'")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {cs}.receipts COMMENT 'Justificatifs déposés par l’application'")
print(f"✅ Schéma {cs} et volume receipts prêts")

# COMMAND ----------

def add_constraint(table: str, name: str, expression: str) -> None:
    """Ajoute une contrainte CHECK seulement si elle n'existe pas encore (idempotence)."""
    props = {r.key: r.value for r in spark.sql(f"SHOW TBLPROPERTIES {cs}.{table}").collect()}
    if f"delta.constraints.{name}" not in props:
        spark.sql(f"ALTER TABLE {cs}.{table} ADD CONSTRAINT {name} CHECK ({expression})")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Référentiels : collaborateurs (avec leur manager) et catégories de dépenses

# COMMAND ----------

spark.sql(f"""
  CREATE TABLE IF NOT EXISTS {cs}.employees (
    email         STRING  NOT NULL COMMENT 'Identifiant = e-mail de connexion',
    full_name     STRING  NOT NULL,
    manager_email STRING           COMMENT 'NULL = sommet de la hiérarchie',
    cost_center   STRING  NOT NULL COMMENT 'Centre de coût, repris dans l’export comptable',
    active        BOOLEAN NOT NULL,
    CONSTRAINT pk_employees PRIMARY KEY (email)
  ) COMMENT 'Collaborateurs et hiérarchie (équivalent de l’attribut manager d’Entra ID)'
""")
add_constraint("employees", "not_own_manager", "manager_email IS NULL OR manager_email <> email")

spark.sql(f"""
  MERGE INTO {cs}.employees AS target
  USING (
    SELECT * FROM VALUES
      ('sara.finance@exemple.com',   'Sara Bennani',  NULL,                         'FIN',    true),
      ('karim.manager@exemple.com',  'Karim Alaoui',  'sara.finance@exemple.com',   'VENTES', true),
      ('nadia.manager@exemple.com',  'Nadia Tazi',    'sara.finance@exemple.com',   'IT',     true),
      ('redaadari@gmail.com',        'Reda Adari',    'karim.manager@exemple.com',  'VENTES', true),
      ('yasmine.employe@exemple.com','Yasmine Idrissi','karim.manager@exemple.com', 'VENTES', true),
      ('omar.employe@exemple.com',   'Omar Fassi',    'nadia.manager@exemple.com',  'IT',     true)
    AS t(email, full_name, manager_email, cost_center, active)
  ) AS source
  ON target.email = source.email
  WHEN MATCHED THEN UPDATE SET *
  WHEN NOT MATCHED THEN INSERT *
""")

spark.sql(f"""
  CREATE TABLE IF NOT EXISTS {cs}.categories (
    code             STRING        NOT NULL,
    label            STRING        NOT NULL,
    unit_limit       DECIMAL(12,2)          COMMENT 'Plafond par dépense (NULL = pas de plafond)',
    receipt_required BOOLEAN       NOT NULL,
    gl_account       STRING        NOT NULL COMMENT 'Compte comptable de l’export',
    CONSTRAINT pk_categories PRIMARY KEY (code)
  ) COMMENT 'Catégories de dépenses et règles associées'
""")

spark.sql(f"""
  MERGE INTO {cs}.categories AS target
  USING (
    SELECT * FROM VALUES
      ('MEAL',      'Repas',              300.00,  true,  '6257'),
      ('TRANSPORT', 'Transport',          NULL,    true,  '6241'),
      ('HOTEL',     'Hébergement',        1500.00, true,  '6251'),
      ('MILEAGE',   'Indemnités km',      NULL,    false, '6252'),
      ('SUPPLIES',  'Petites fournitures', 500.00, true,  '6061')
    AS t(code, label, unit_limit, receipt_required, gl_account)
  ) AS source
  ON target.code = source.code
  WHEN MATCHED THEN UPDATE SET *
  WHEN NOT MATCHED THEN INSERT *
""")
print("✅ Référentiels à jour")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Notes, lignes et historique

# COMMAND ----------

spark.sql(f"""
  CREATE TABLE IF NOT EXISTS {cs}.expense_reports (
    id                  STRING        NOT NULL COMMENT 'UUID généré par l’application',
    employee_email      STRING        NOT NULL,
    title               STRING        NOT NULL,
    period              STRING        NOT NULL COMMENT 'AAAA-MM',
    status              STRING        NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL,
    manager_email       STRING                 COMMENT 'Figé à la soumission',
    created_at          TIMESTAMP     NOT NULL,
    submitted_at        TIMESTAMP,
    manager_decision_by STRING,
    manager_decision_at TIMESTAMP,
    finance_decision_by STRING,
    finance_decision_at TIMESTAMP,
    rejection_reason    STRING,
    export_batch        STRING                 COMMENT 'Lot d’export comptable',
    exported_at         TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL,
    CONSTRAINT pk_expense_reports PRIMARY KEY (id)
  ) COMMENT 'Notes de frais (en-têtes)'
""")
add_constraint(
    "expense_reports", "valid_status",
    "status IN ('DRAFT','SUBMITTED','MANAGER_APPROVED','APPROVED','REJECTED','EXPORTED')",
)

spark.sql(f"""
  CREATE TABLE IF NOT EXISTS {cs}.expense_lines (
    id            STRING        NOT NULL,
    report_id     STRING        NOT NULL,
    expense_date  DATE          NOT NULL,
    category_code STRING        NOT NULL,
    description   STRING        NOT NULL,
    amount        DECIMAL(12,2) NOT NULL,
    receipt_path  STRING                 COMMENT 'Chemin du justificatif dans le volume',
    created_at    TIMESTAMP     NOT NULL,
    CONSTRAINT pk_expense_lines PRIMARY KEY (id)
  ) COMMENT 'Lignes de dépense d’une note'
""")
add_constraint("expense_lines", "positive_amount", "amount > 0")

spark.sql(f"""
  CREATE TABLE IF NOT EXISTS {cs}.report_events (
    id          STRING    NOT NULL,
    report_id   STRING    NOT NULL,
    action      STRING    NOT NULL COMMENT 'CREATE, SUBMIT, APPROVE, REJECT, EXPORT…',
    actor       STRING    NOT NULL,
    from_status STRING,
    to_status   STRING,
    comment     STRING,
    created_at  TIMESTAMP NOT NULL
  ) COMMENT 'Historique : chaque changement de statut est tracé (audit)'
""")
print("✅ Tables expense_reports, expense_lines, report_events prêtes")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Contrôle de cohérence de la hiérarchie
# MAGIC Une contrainte CHECK ne peut pas vérifier qu’un manager **existe** dans la table :
# MAGIC on le contrôle ici, et le job échoue si la hiérarchie est incohérente.

# COMMAND ----------

orphans = spark.sql(f"""
  SELECT e.email, e.manager_email
  FROM {cs}.employees e
  LEFT JOIN {cs}.employees m ON e.manager_email = m.email
  WHERE e.manager_email IS NOT NULL AND m.email IS NULL
""").collect()
assert not orphans, f"Managers inconnus : {[(r.email, r.manager_email) for r in orphans]}"

display(spark.sql(f"""
  SELECT e.full_name AS collaborateur, e.cost_center, m.full_name AS manager
  FROM {cs}.employees e
  LEFT JOIN {cs}.employees m ON e.manager_email = m.email
  ORDER BY m.full_name NULLS FIRST, e.full_name
"""))