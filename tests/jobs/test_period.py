from datetime import date

import pytest

from period import previous_month, resolve_period


@pytest.mark.parametrize(
    ("today", "expected"),
    [(date(2026, 10, 15), "2026-09"), (date(2026, 1, 1), "2025-12")],
)
def test_previous_month(today, expected):
    assert previous_month(today) == expected


def test_resolve_period_defaults_to_previous_month():
    assert resolve_period("  ", date(2026, 3, 1)) == "2026-02"


def test_resolve_period_keeps_explicit_value():
    assert resolve_period("2026-07", date(2026, 3, 1)) == "2026-07"


@pytest.mark.parametrize("raw", ["2026-13", "2026-7", "juillet", "2026/07"])
def test_resolve_period_rejects_invalid_format(raw):
    with pytest.raises(ValueError, match="Période invalide"):
        resolve_period(raw, date(2026, 3, 1))
