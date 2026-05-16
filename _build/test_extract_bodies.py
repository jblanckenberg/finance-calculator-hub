from pathlib import Path
from extract_bodies import extract_body, BODY_START_RE, BODY_END_RE

ROOT = Path(__file__).resolve().parent.parent

def test_extract_body_returns_main_content():
    src = (ROOT / "compound-interest" / "index.html").read_text(encoding="utf-8")
    body = extract_body(src)
    assert 'id="principal"' in body
    assert "<header>" not in body
    assert "<footer>" not in body
    assert "<title>" not in body

def test_extract_body_idempotent():
    src = (ROOT / "compound-interest" / "index.html").read_text(encoding="utf-8")
    a = extract_body(src)
    b = extract_body(src)
    assert a == b
