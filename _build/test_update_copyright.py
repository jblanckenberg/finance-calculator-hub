from pathlib import Path
from update_copyright import sweep, OLD_YEAR, NEW_YEAR

def test_sweep_replaces_copyright_year(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(f"<footer>© {OLD_YEAR} FinCalcHub</footer>", encoding="utf-8")
    n = sweep(tmp_path, dry_run=False)
    assert n == 1
    assert f"© {NEW_YEAR} FinCalcHub" in f.read_text(encoding="utf-8")

def test_sweep_replaces_breadcrumb_year(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(f'"name":"Calculator {OLD_YEAR} — USA"', encoding="utf-8")
    sweep(tmp_path, dry_run=False)
    assert f"Calculator {NEW_YEAR} — USA" in f.read_text(encoding="utf-8")

def test_sweep_dry_run_does_not_modify(tmp_path: Path):
    f = tmp_path / "page.html"
    original = f"<footer>© {OLD_YEAR} FinCalcHub</footer>"
    f.write_text(original, encoding="utf-8")
    n = sweep(tmp_path, dry_run=True)
    assert n == 1
    assert f.read_text(encoding="utf-8") == original

def test_sweep_skips_already_current(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(f"<footer>© {NEW_YEAR} FinCalcHub</footer>", encoding="utf-8")
    n = sweep(tmp_path, dry_run=False)
    assert n == 0

def test_sweep_skips_excluded_directories(tmp_path: Path):
    nm = tmp_path / "node_modules" / "vendor"
    nm.mkdir(parents=True)
    vendor = nm / "page.html"
    vendor.write_text(f"<footer>© {OLD_YEAR} FinCalcHub</footer>", encoding="utf-8")

    real = tmp_path / "real_page.html"
    real.write_text(f"<footer>© {OLD_YEAR} FinCalcHub</footer>", encoding="utf-8")

    n = sweep(tmp_path, dry_run=False)
    assert n == 1
    assert f"© {OLD_YEAR} FinCalcHub" in vendor.read_text(encoding="utf-8")
    assert f"© {NEW_YEAR} FinCalcHub" in real.read_text(encoding="utf-8")
