"""Règles sur la période comptable (AAAA-MM). Module pur, testé en local."""

from __future__ import annotations

import re
from datetime import date

PERIOD_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def previous_month(today: date) -> str:
    year, month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    return f"{year:04d}-{month:02d}"


def resolve_period(raw: str, today: date) -> str:
    """Période demandée, ou mois précédent si vide (cas de la planification mensuelle)."""
    period = raw.strip() or previous_month(today)
    if not PERIOD_PATTERN.match(period):
        raise ValueError(f"Période invalide : {period!r} (format AAAA-MM attendu)")
    return period
