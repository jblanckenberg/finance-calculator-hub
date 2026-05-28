# Plans Backlog — finncalc.com

Plans that are written and reviewed but deferred from execution. Pull from here when capacity opens up; operator confirms before starting.

## Currently backlogged

| Date added | Plan | Why backlogged | Estimated effort |
|---|---|---|---|
| 2026-05-28 | **TBD — finncalc Phase 4: mobile JS performance** (plan not yet drafted) | Surfaced by PSI run during Phase 3 P0 — mobile score 37/100 because of third-party JS (Google Ads + GTM + FundingChoices = 254 KiB unused, TBT 7,270ms, LCP-element render delay 6,890ms). Out of Phase 3 scope; operator deferred to a separate plan. Scope sketch: (1) defer/lazy-load Ads until first interaction; (2) move Clarity behind cookie consent; (3) audit FundingChoices CMP for lazy-load; (4) investigate LCP-element render delay root cause; (5) raise `--accent` color contrast to WCAG AA 4.5:1. Target: mobile Performance ≥70. Full PSI baseline + decision in `2026-05-28-finncalc-phase-3-log.md` under "New performance findings exposed by this PSI run". | ~6-10 hours (mostly investigation + careful deferred-loading) |

## Completed

| Date added | Date completed | Plan | Notes |
|---|---|---|---|
| 2026-05-28 | 2026-05-28 | [2026-05-28-finncalc-phase-3-cwv-and-content-cluster.md](2026-05-28-finncalc-phase-3-cwv-and-content-cluster.md) | Operator resumed and executed same day. 4 articles, 9 stock images, 42 tests added. |

## Lifecycle

- **Add:** When operator says "backlog this", add a row here and prepend a `STATUS: BACKLOG` block at the top of the plan file.
- **Resume:** Operator says "resume <plan-name>". Remove the row, remove the `STATUS: BACKLOG` block, and proceed with the regular execution handoff (subagent-driven vs inline).
- **Drop:** If a plan is superseded or no longer needed, move the row to a `## Dropped` section with a date and one-line reason — don't delete the plan file (preserves history).
