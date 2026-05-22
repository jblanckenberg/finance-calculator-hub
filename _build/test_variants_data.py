import json
from pathlib import Path
import jsonschema

DATA = Path(__file__).resolve().parent / "data" / "variants.json"
SCHEMA = Path(__file__).resolve().parent / "data" / "schema.json"
CALCS = Path(__file__).resolve().parent / "data" / "calculators.json"

def _load():
    return json.loads(DATA.read_text(encoding="utf-8"))

def test_total_variant_count_is_20():
    data = _load()
    flat = [v for cm in data.values() for v in cm.values()]
    assert len(flat) == 20

def test_every_parent_calc_exists():
    data = _load()
    calcs = json.loads(CALCS.read_text(encoding="utf-8"))
    for slug in data:
        assert slug in calcs, f"variant references unknown calc {slug}"

def test_variants_validate_against_schema():
    data = _load()
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    variant_schema = {**schema["definitions"]["Variant"], "$defs": schema["definitions"]}
    for cm in data.values():
        for v in cm.values():
            jsonschema.validate(instance=v, schema=variant_schema)

def test_geo_variants_have_hreflang_country():
    data = _load()
    for cm in data.values():
        for v in cm.values():
            if v["kind"] == "geo":
                assert v["hreflangCountry"] in {"en-US", "en-GB", "en-ZA"}, v

def test_no_intro_is_stub():
    data = _load()
    for cm in data.values():
        for v in cm.values():
            assert not v["intro"].startswith("[OPERATOR_TO_FILL:"), f"{v['slug']} still has a stub intro"

def test_every_intro_min_300_words():
    data = _load()
    for cm in data.values():
        for v in cm.values():
            words = len(v["intro"].split())
            assert words >= 300, f"{v['slug']} intro is {words} words; minimum is 300"
