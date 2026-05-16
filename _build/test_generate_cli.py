import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent

def test_generate_cli_writes_all_pages(tmp_path):
    site = tmp_path / "site"
    site.mkdir()
    (site / "_build").mkdir()
    shutil.copytree(ROOT / "templates", site / "_build" / "templates")
    shutil.copytree(ROOT / "bodies", site / "_build" / "bodies")
    shutil.copytree(ROOT / "data", site / "_build" / "data")
    shutil.copytree(ROOT / "schemas", site / "_build" / "schemas")
    shutil.copy(ROOT / "generate.py", site / "_build" / "generate.py")
    shutil.copy(ROOT / "generate_comparisons.py", site / "_build" / "generate_comparisons.py")

    result = subprocess.run(
        [sys.executable, str(site / "_build" / "generate.py"), "--apply"],
        cwd=str(site / "_build"),
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert (site / "compound-interest" / "index.html").exists()
    assert (site / "mortgage" / "index.html").exists()
    assert (site / "compound-interest" / "uk" / "index.html").exists()
    assert (site / "take-home-pay" / "za" / "index.html").exists()

def test_generate_cli_dry_run_does_not_write(tmp_path):
    site = tmp_path / "site"
    site.mkdir()
    (site / "_build").mkdir()
    shutil.copytree(ROOT / "templates", site / "_build" / "templates")
    shutil.copytree(ROOT / "bodies", site / "_build" / "bodies")
    shutil.copytree(ROOT / "data", site / "_build" / "data")
    shutil.copytree(ROOT / "schemas", site / "_build" / "schemas")
    shutil.copy(ROOT / "generate.py", site / "_build" / "generate.py")
    shutil.copy(ROOT / "generate_comparisons.py", site / "_build" / "generate_comparisons.py")

    result = subprocess.run(
        [sys.executable, str(site / "_build" / "generate.py")],
        cwd=str(site / "_build"),
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert not (site / "compound-interest" / "uk" / "index.html").exists()
