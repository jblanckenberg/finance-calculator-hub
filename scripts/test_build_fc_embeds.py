import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_fc_embeds import SLUGS, build_one, SRC


def test_each_slug_builds_and_substitutes_origin():
    os.environ["FC_EMBED_ORIGIN"] = "https://test.example.com"
    # Reload to pick up env override
    import importlib, build_fc_embeds
    importlib.reload(build_fc_embeds)
    for slug in build_fc_embeds.SLUGS:
        out = build_fc_embeds.build_one(slug)
        text = out.read_text(encoding="utf-8")
        assert "test.example.com" in text, f"{slug}: origin not substituted"
        assert "__EMBED_ORIGIN__" not in text, f"{slug}: placeholder leaked"
        assert "fchEmbedBoot" in text, f"{slug}: shared boot not inlined"
        assert f'slug: "{slug}"' in text, f"{slug}: entry not concatenated"


def test_bundle_size_under_5kb():
    os.environ["FC_EMBED_ORIGIN"] = "https://finncalc.com"
    import importlib, build_fc_embeds
    importlib.reload(build_fc_embeds)
    for slug in build_fc_embeds.SLUGS:
        out = build_fc_embeds.build_one(slug)
        size = out.stat().st_size
        assert size < 5000, f"{slug}: bundle is {size} bytes, > 5 KB"
