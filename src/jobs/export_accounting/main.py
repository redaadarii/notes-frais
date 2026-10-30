"""Export comptable mensuel des notes de frais validées.

Étapes, dans cet ordre volontaire :
  1. lire les notes APPROVED de la période ;
  2. écrire le classeur Excel dans le volume « exports » ;
  3. seulement ensuite, passer les notes en EXPORTED et tracer l'événement.
Si l'étape 3 échoue, le fichier existe mais les notes restent APPROVED : un nouveau run
les réexporte. L'ordre inverse pourrait marquer des notes exportées sans aucun fichier.

Lancé par l'application (bouton « Lancer l'export ») ou par la planification mensuelle.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
from pathlib import Path

from pyspark.sql import SparkSession

from period import resolve_period
from workbook import ExportLine, build_workbook

ACTOR = "job:export_accounting"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--schema", required=True)
    parser.add_argument("--period", default="", help="AAAA-MM ; vide = mois précédent")
    parser.add_argument("--requested-by", default="", help="E-mail de la personne qui a lancé l'export")
    args = parser.parse_args()
    args.period = resolve_period(args.period, date.today())
    return args


def read_approved_lines(spark: SparkSession, period: str) -> list[ExportLine]:
    rows = spark.sql(
        """
        SELECT r.id AS report_id, r.title AS report_title, r.employee_email,
               e.full_name AS employee_name, e.cost_center,
               l.expense_date, c.gl_account, c.label AS category_label, l.description, l.amount
        FROM expense_reports r
        JOIN employees e     ON e.email = r.employee_email
        JOIN expense_lines l ON l.report_id = r.id
        JOIN categories c    ON c.code = l.category_code
        WHERE r.status = 'APPROVED' AND r.period = :period
        """,
        args={"period": period},
    ).collect()
    return [ExportLine(**row.asDict()) for row in rows]


def write_to_volume(content: bytes, catalog: str, schema: str, period: str, batch_id: str) -> str:
    # Les volumes Unity Catalog sont montés comme un système de fichiers : open() suffit.
    folder = Path(f"/Volumes/{catalog}/{schema}/exports/{period}")
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{batch_id}.xlsx"
    path.write_bytes(content)
    return str(path)


def mark_exported(spark: SparkSession, report_ids: list[str], batch_id: str, requested_by: str) -> None:
    spark.createDataFrame([(i,) for i in report_ids], "id STRING").createOrReplaceTempView("exported_ids")

    # « AND status = 'APPROVED' » : une note modifiée entre la lecture et l'écriture n'est pas touchée.
    spark.sql(
        """
        MERGE INTO expense_reports AS r
        USING exported_ids AS x ON r.id = x.id AND r.status = 'APPROVED'
        WHEN MATCHED THEN UPDATE SET
          status = 'EXPORTED', export_batch = :batch, exported_at = current_timestamp(),
          updated_at = current_timestamp()
        """,
        args={"batch": batch_id},
    )
    comment = f"Lot {batch_id}" + (f", lancé par {requested_by}" if requested_by else "")
    spark.sql(
        """
        INSERT INTO report_events (id, report_id, action, actor, from_status, to_status, comment, created_at)
        SELECT uuid(), r.id, 'EXPORT', :actor, 'APPROVED', 'EXPORTED', :comment, current_timestamp()
        FROM expense_reports r JOIN exported_ids x ON r.id = x.id
        WHERE r.export_batch = :batch
        """,
        args={"actor": ACTOR, "comment": comment, "batch": batch_id},
    )


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.getOrCreate()
    spark.sql(f"USE CATALOG `{args.catalog}`")
    spark.sql(f"USE SCHEMA `{args.schema}`")

    lines = read_approved_lines(spark, args.period)
    if not lines:
        print(f"Aucune note validée à exporter pour {args.period}.")
        return

    batch_id = f"EXP-{args.period}-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"
    path = write_to_volume(build_workbook(lines, args.period, batch_id), args.catalog, args.schema, args.period, batch_id)

    report_ids = sorted({line.report_id for line in lines})
    mark_exported(spark, report_ids, batch_id, args.requested_by)
    print(f"{len(report_ids)} note(s), {len(lines)} ligne(s) exportées dans {path}")


if __name__ == "__main__":
    main()
