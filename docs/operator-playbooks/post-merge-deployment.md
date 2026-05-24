# Post-Merge Deployment Playbook — finncalc.com

> Use after merging the Phase 1, 2, or 3 SEO PRs. Order matters: do steps 1-5 in sequence.

## When to run

- After merging each Phase PR (or batch of PRs) to `master`
- After any meaningful content change that should be indexed quickly
- NOT needed for hotfix PRs that don't touch calc pages or sitemap

## 1. Verify deployment

Cloudflare Pages auto-deploys on push to `master`. Confirm the deployment is live:

```bash
# From your local repo, check a freshly-merged calc page
curl -sI https://finncalc.com/<new-calc-slug>/ | head -5
# Expected: HTTP/2 200, content-type: text/html, etag indicating fresh deploy
```

If you get a 404 or stale content, wait 60s (Cloudflare propagation) and retry. If still wrong, check the Cloudflare Pages dashboard for build errors.

## 2. Purge Cloudflare cache

CF Pages serves cached HTML for ~5-10 minutes by default. Force a refresh:

```bash
# Option A: CF dashboard -> finncalc.com -> Caching -> Purge Everything
# Option B: CLI (requires CF API token + zone ID)
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <CF_API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

For "purge specific URLs only" pass `--data '{"files":["https://finncalc.com/dividend-calculator/", ...]}'` instead.

## 3. Submit updated sitemap to search engines

### Google Search Console

1. Open https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Ffinncalc.com%2F
2. The sitemap `https://finncalc.com/sitemap.xml` should already be listed. Click "..." -> "Resubmit"
3. GSC will recrawl within 24-72h. Monitor the "Submitted URLs" + "Indexed" counts daily

### Bing Webmaster Tools

1. Open https://www.bing.com/webmasters/sitemaps?siteUrl=https%3A%2F%2Ffinncalc.com%2F
2. Confirm `sitemap.xml` is listed. If not, click "Submit sitemap" -> paste the URL
3. Bing usually picks up changes within 24h via the URL submission API (Bing pulls based on lastmod stamps)

### Yandex Webmaster (optional)

1. Open https://webmaster.yandex.com/site/sitemaps.xml
2. Add `https://finncalc.com/sitemap.xml` if not already present
3. Yandex is much slower than Google/Bing — 1-2 weeks typical

## 4. IndexNow ping (instant)

IndexNow notifies Bing + Yandex + DuckDuckGo + Seznam in one call. Cheap and fast.

```bash
# Dry-run first to see what would be submitted (no actual ping)
python scripts/indexnow_ping.py --dry-run

# Then live submission
python scripts/indexnow_ping.py
```

The script reads from the repo's IndexNow key file (location documented in scripts/indexnow_ping.py source) and submits all URLs that changed in the most recent commit by default. Pass `--all` to resubmit every URL in sitemap.xml.

Expected response: HTTP 200 (success) or 202 (accepted, processing).

## 5. Monitor indexing (over the following 7-14 days)

| Day | Check | Where |
|---|---|---|
| Day 1 | New URLs appearing in GSC "Recently submitted URLs" report | GSC Coverage report |
| Day 3 | Bing pages count increasing | Bing Webmaster -> Reports |
| Day 7 | First impressions in GSC "Performance" report for the new calc slugs | GSC Performance |
| Day 14 | First clicks if any kw is ranking page 2-3 | GSC Performance |
| Day 30 | Re-audit | `/seo-audit https://finncalc.com/` |

## Troubleshooting

**Cloudflare deploy fails:** Check the build log in CF Pages dashboard. Most common cause: a typo in `_redirects` or `_headers` that breaks the build step. Roll back via "Promote to production" of the previous successful build.

**GSC resubmit shows "Couldn't fetch":** Likely Cloudflare cache hit on the OLD sitemap. Purge cache (step 2) then retry the GSC resubmit.

**New URLs not appearing in Coverage report after 7 days:** Check the URL directly in GSC -> URL Inspection. If "Discovered - currently not indexed", it's normal for low-authority sites — internal linking (Phase 3A) is the lever. If "Crawled - currently not indexed", the page has thin content or duplicate signals — review the page's actual content.

**IndexNow returns 4xx:** Most commonly an expired/missing key file. See `scripts/indexnow_ping.py` for the key path expected.

## Operator action items unique to Phase 1/2/3 (this batch)

- [ ] Activate DataForSEO Backlinks subscription at https://app.dataforseo.com/subscriptions (Task 0.8 carryover from buscalctools)
- [ ] First outreach batch for backlinks (manual; aim for 5-10 niche-relevant links to /paye-calculator/ + /roth-ira-conversion-calculator/ since they have the lowest KD)
- [ ] 30 days post-final-merge: re-run `/seo-audit https://finncalc.com/`, compare composite score to the Phase 1 baseline at `~/.claude/skills/seo/output/finncalc.com-audit-2026-05-22.json` (or latest)
