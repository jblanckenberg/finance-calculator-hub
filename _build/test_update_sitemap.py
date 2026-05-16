from pathlib import Path
import xml.etree.ElementTree as ET

from update_sitemap import build_sitemap

ROOT = Path(__file__).resolve().parent.parent

def test_build_sitemap_includes_variant_urls(tmp_path):
    fake = tmp_path / "site"
    fake.mkdir()
    (fake / "compound-interest").mkdir()
    (fake / "compound-interest" / "index.html").write_text("x", encoding="utf-8")
    (fake / "compound-interest" / "uk").mkdir()
    (fake / "compound-interest" / "uk" / "index.html").write_text("x", encoding="utf-8")
    (fake / "blog").mkdir()
    (fake / "blog" / "post").mkdir()
    (fake / "blog" / "post" / "index.html").write_text("x", encoding="utf-8")
    xml = build_sitemap(root=fake, base_url="https://finncalc.com")
    assert "https://finncalc.com/compound-interest/" in xml
    assert "https://finncalc.com/compound-interest/uk/" in xml
    assert "https://finncalc.com/blog/post/" in xml

def test_built_sitemap_is_valid_xml(tmp_path):
    fake = tmp_path / "site"
    fake.mkdir()
    (fake / "x").mkdir()
    (fake / "x" / "index.html").write_text("x", encoding="utf-8")
    xml = build_sitemap(root=fake, base_url="https://finncalc.com")
    parsed = ET.fromstring(xml)
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    locs = [el.text for el in parsed.iter(f"{ns}loc")]
    assert "https://finncalc.com/x/" in locs

def test_variant_urls_get_priority_07(tmp_path):
    fake = tmp_path / "site"
    fake.mkdir()
    (fake / "calc").mkdir()
    (fake / "calc" / "index.html").write_text("x", encoding="utf-8")
    (fake / "calc" / "uk").mkdir()
    (fake / "calc" / "uk" / "index.html").write_text("x", encoding="utf-8")
    xml = build_sitemap(root=fake, base_url="https://finncalc.com")
    assert "<loc>https://finncalc.com/calc/uk/</loc>" in xml
    variant_block_start = xml.index("<loc>https://finncalc.com/calc/uk/</loc>")
    snippet = xml[variant_block_start: variant_block_start + 400]
    assert "<priority>0.7</priority>" in snippet
