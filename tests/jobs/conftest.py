"""Les jobs sont des scripts autonomes (spark_python_task) : on rend leurs modules importables."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src" / "jobs" / "export_accounting"))
