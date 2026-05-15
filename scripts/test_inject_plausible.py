from pathlib import Path
from inject_plausible import inject, SNIPPET

def test_inject_adds_snippet_when_missing(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text("<head>\n  <title>x</title>\n</head>", encoding="utf-8")
    n = inject(tmp_path, dry_run=False)
    assert n == 1
    assert SNIPPET in f.read_text(encoding="utf-8")

def test_inject_idempotent(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(f"<head>\n  <title>x</title>\n  {SNIPPET}\n</head>", encoding="utf-8")
    n = inject(tmp_path, dry_run=False)
    assert n == 0

def test_inject_skips_files_without_head(tmp_path: Path):
    f = tmp_path / "page.html"
    original = "<html><body>no head</body></html>"
    f.write_text(original, encoding="utf-8")
    n = inject(tmp_path, dry_run=False)
    assert n == 0
    assert f.read_text(encoding="utf-8") == original

def test_inject_skips_excluded_directories(tmp_path: Path):
    nm = tmp_path / "node_modules" / "vendor"
    nm.mkdir(parents=True)
    vendor = nm / "page.html"
    vendor.write_text("<head>\n  <title>x</title>\n</head>", encoding="utf-8")

    real = tmp_path / "real_page.html"
    real.write_text("<head>\n  <title>x</title>\n</head>", encoding="utf-8")

    n = inject(tmp_path, dry_run=False)
    assert n == 1
    assert SNIPPET not in vendor.read_text(encoding="utf-8")
    assert SNIPPET in real.read_text(encoding="utf-8")
