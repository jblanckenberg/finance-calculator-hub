from pathlib import Path
from inject_newsletter import inject, SCRIPT_TAG, SLOT_DIV

def test_inject_adds_both_when_missing(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(
        "<head>\n  <title>x</title>\n</head>\n"
        '<body><div class="footer-cross-link" style="x">y</div></body>',
        encoding="utf-8",
    )
    counts = inject(tmp_path, dry_run=False)
    assert counts == {"script": 1, "slot": 1}
    body = f.read_text(encoding="utf-8")
    assert SCRIPT_TAG in body
    assert SLOT_DIV in body
    # slot must appear before the cross-link div
    assert body.index(SLOT_DIV) < body.index('<div class="footer-cross-link"')

def test_inject_idempotent(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text(
        f"<head>\n  {SCRIPT_TAG}\n</head>\n"
        f'<body>{SLOT_DIV}\n      <div class="footer-cross-link">y</div></body>',
        encoding="utf-8",
    )
    counts = inject(tmp_path, dry_run=False)
    assert counts == {"script": 0, "slot": 0}

def test_inject_skips_excluded_directories(tmp_path: Path):
    nm = tmp_path / "node_modules" / "vendor"
    nm.mkdir(parents=True)
    vendor = nm / "page.html"
    vendor.write_text("<head></head><div class=\"footer-cross-link\">y</div>", encoding="utf-8")
    real = tmp_path / "real.html"
    real.write_text("<head></head><div class=\"footer-cross-link\">y</div>", encoding="utf-8")
    inject(tmp_path, dry_run=False)
    assert SCRIPT_TAG not in vendor.read_text(encoding="utf-8")
    assert SCRIPT_TAG in real.read_text(encoding="utf-8")

def test_inject_handles_no_cross_link(tmp_path: Path):
    f = tmp_path / "page.html"
    f.write_text("<head></head><body>nothing</body>", encoding="utf-8")
    counts = inject(tmp_path, dry_run=False)
    assert counts == {"script": 1, "slot": 0}
