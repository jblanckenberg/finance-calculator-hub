# FinCalc SEO Remediation — Operator Action Log

**Plan reference:** `2026-05-21-finncalc-seo-remediation.md`
**Branch:** `seo-remediation-2026-05-21`
**Last code commit on this branch:** `350ace573714dd5bb5334a53a53675d9814f8638`

## Phase A — Indexation (run AFTER Tasks 1-8 deploy to Cloudflare Pages)

- [ ] Verify `site:finncalc.com` returns ≥10 indexed pages on Google → if 0, escalate to deeper investigation
- [ ] Confirm sitemap URL: open https://finncalc.com/sitemap.xml in browser; ensure ≥59 `<url>` entries
- [ ] Google Search Console → Sitemaps → Add new sitemap → `sitemap.xml` → Submit
- [ ] GSC → Inspect URL → paste `https://finncalc.com/` → click "Request Indexing"
- [ ] GSC → Inspect URL for each of the 6 priority calculator pages (emergency-fund, take-home-pay, mortgage, retirement-savings, investment-growth, compound-interest) → "Request Indexing"
- [ ] Bing Webmaster Tools → Sitemaps → Submit `https://finncalc.com/sitemap.xml`
- [ ] Yandex Webmaster → Sitemap files → Add `https://finncalc.com/sitemap.xml`
- [ ] (E4 plan revision) Run `python scripts/indexnow_ping.py --all` to ping Bing/Yandex/Seznam/Naver via IndexNow API — faster than waiting for crawler queues. Does NOT replace GSC submission (Google does not honour IndexNow). The script uses the BWT-bound key `cd975860879e4460864ab673b9055f7e` hosted at `/cd975860879e4460864ab673b9055f7e.txt`.
- [ ] Cloudflare cache purge for the entire site after deploy:
  - URL: https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache
  - Token: see `C:\FIN_CALC_SITE\Cloudflare token.txt`
  - Body: `{"purge_everything": true}`

## Phase B — Authority (run AFTER Phase A)

- [ ] Open https://app.dataforseo.com/backlinks-subscription
- [ ] Select Backlinks subscription tier (Basic ~$30/mo is sufficient for monthly audits)
- [ ] Confirm subscription active → DataForSEO dashboard → API Access → "Backlinks" service shows "Active"
- [ ] Re-run `/seo-audit https://finncalc.com/` from a Claude Code session — Authority pillar should now return real data (composite score jumps ~+15 from filling that 0)

## Phase C — Re-audit (run 60 days after Phase A completes)

- [ ] GSC → Performance → confirm impressions >0 across at least 5 queries
- [ ] Run `/seo-audit https://finncalc.com/` — expect composite ≥75, technical ≥92, keywords pillar populated
- [ ] If composite still <70: dispatch a content-strategy subagent to identify weak topic clusters from real ranking data and write briefs

## Phase D — Plausible + Beehiiv (deferred follow-up)

- [ ] Provision Plausible project at https://plausible.io/sites for `finncalc.com`
- [ ] Provision Beehiiv publication for `finncalc.com`
- [ ] Add Plausible script tag via `scripts/inject_plausible.py` (already in repo)
- [ ] Add Beehiiv signup form via `scripts/inject_newsletter.py` (already in repo)

## Reference — what shipped in Tasks 1-8

- Task 1 (commits 67c2340 + 4f50b1a): stripped duplicate `<h1>` from 22 calculator pages
- Task 2 (commits 7fb7977 + b997c21): added favicon (.ico + .svg, dropped manifest in v2)
- Task 3 (commit e5581ad + fix 4ade087): trimmed 25 over-length titles + promoted EXTRA_TITLES to JSON
- Task 4 (commit c773a71 + fix 133d96a): async-loaded main.css via preload + scope-guarded patcher
- Task 5 (commit 0bbd931): wrapped page content in `<main id="content">` on 37 calculator pages
- Task 6 (commit 643363b): fixed 3 raw-`&` HTML parse errors in blog body text
- Task 7 (commit 4466595): regression infrastructure for image alts (0 offenders, audit stale)
- Task 8 (commits b06c482 + 350ace5): deferred JS, extracted widget bootstrap to js/calc/, added content-visibility CSS

## Acceptance Checklist (post-merge)

See `2026-05-21-finncalc-seo-remediation.md` "Acceptance Checklist (post-merge)" section for the Windows PowerShell + POSIX command equivalents.
