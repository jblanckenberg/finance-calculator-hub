# Wave 10 — Build 25 Calculators to Close the AAGP Topic-Queue Gap

**Why this exists.** The AAGP article pipeline (`C:\FIN_CALC_SITE\article_pipeline\`) is built, tested, and dormant — 39 commits, 293/293 tests, 18/18 ACs green — but cannot go live until the 50-topic seed queue points at calculators that actually exist on the live sites. As of 2026-05-15, **26 topics still point at calculators that haven't been built**. This document covers the 25 distinct calculators (some topics share) needed to close that gap.

Once these are built and the slugs in `article_pipeline\config\topics_queue.yaml` are repointed, the pipeline ships.

---

## Build cuts in two repos

| Site | Repo | Architecture | Per-calc effort |
|---|---|---|---|
| finncalc.com | `C:\FIN_CALC_SITE\Finance_Calculator_Hub\` | Static HTML (one `<slug>/index.html` per calc, ~250–300 lines each, inline JS) | ~1.5–3 hrs each |
| buscalctools.com | `C:\BizProfitCalc\bizapp\` | Next.js static export — `app/<slug>/page.tsx` thin wrapper + `components/calculators/<Name>Calculator.tsx` for logic | ~1–2 hrs each (reusable ui components in `components/ui/`) |

**Reference patterns to copy from:**
- finncalc: `emergency-fund/index.html` (clean, region-aware, ~276 lines)
- buscalctools: `app/break-even-calculator/page.tsx` + `components/calculators/BreakEvenCalculator.tsx`

Match the existing patterns exactly — don't introduce new conventions.

---

## What every new calc must include

These are non-negotiable across both sites (matches your Wave 6–9 standards):

### Page essentials
- [ ] H1 = calculator name; H2 = "How it works" + "Example walkthrough" + "FAQ"
- [ ] Input form with explicit `<label for>` on every field (per Wave 9 a11y sweep)
- [ ] Result block updates in real-time (no submit button on simple calcs)
- [ ] Region toggle (USA / UK / South Africa) where tax/legal/currency differs
- [ ] Currency formatting via `Intl.NumberFormat` for the active region
- [ ] Worked numerical example below the form (use 2026 numbers)
- [ ] 3-item FAQ block (Q&A pairs)

### SEO essentials
- [ ] `<title>` ≤ 60 chars, format: `<Name> Calculator — <Hook> | <Brand>`
- [ ] `<meta name="description">` 140–160 chars, action-oriented
- [ ] Canonical URL set explicitly
- [ ] OpenGraph + Twitter cards (image: site default OG)
- [ ] Schema.org `WebApplication` JSON-LD (matches existing calc pages)
- [ ] Breadcrumbs (Home → Calculator) with `BreadcrumbList` schema

### Internal linking
- [ ] In-body link to 1–2 related calcs on the same site
- [ ] Cross-site footer link to the other site's homepage (matches the article pipeline's cross-promo pattern)
- [ ] Link out to the matching blog article(s) once published

### Quality bar (per Wave 8–9)
- [ ] No a11y errors (run `npx pa11y-ci` or equivalent against the page)
- [ ] Mobile-responsive (test at 375px width)
- [ ] No console errors in DevTools
- [ ] Tax/legal disclaimer at the bottom for tax-touching calcs
- [ ] Year-stamp anything that's year-specific (2026 brackets, contribution limits) — these need annual refresh

---

## The 25 calculators — specifications

### finncalc.com (11 calcs)

#### 1. `/safe-withdrawal-rate-calculator`
- **Unlocks:** FIN-002
- **Formula:** Withdrawal-rate test against a portfolio. `safe_amount = portfolio * rate / 100`; show 4% / 3.5% / 3% rows side-by-side. Stretch: 30-year Monte Carlo with historical return distribution (skip for v1; add v2).
- **Inputs:** `portfolio_value` (number, $/£/R), `withdrawal_rate` (slider 2–6%, default 4)
- **Outputs:** Annual withdrawal, monthly withdrawal, years before depletion at 0% real return (sanity floor)
- **Worked example:** $1M × 4% = $40k/year = $3,333/month
- **Region:** USA / UK / SA currency only (no tax math)

#### 2. `/roth-vs-traditional-ira-calculator`
- **Unlocks:** FIN-004
- **Formula:** Compare ending value of equal contributions across both account types, accounting for current vs retirement marginal tax rate.
- **Inputs:** `annual_contribution` (number), `years` (number, default 30), `expected_return` (slider 4–10%, default 7), `current_marginal_tax` (slider 10–37%, default 22), `retirement_marginal_tax` (slider 10–37%, default 12)
- **Outputs:** Roth ending value (after-tax = same as pre-tax since post-tax contribution), Traditional ending value (after withdrawal tax). Winner highlighted.
- **Region:** USA-only (Roth concept is US-specific; for UK use ISA equivalent in a v2)
- **Note:** Show the math: "If your tax rate stays the same, Roth and Traditional are mathematically identical."

#### 3. `/retirement-drawdown-calculator`
- **Unlocks:** FIN-005, FIN-009
- **Formula:** Time-to-depletion with annual drawdown. Compound returns minus annual withdrawal until portfolio = 0.
- **Inputs:** `starting_portfolio`, `annual_withdrawal`, `expected_return` (slider 3–8%, default 5), `inflation_rate` (slider 0–6%, default 2.5)
- **Outputs:** Years until depletion (nominal vs real-adjusted), final year drawdown, year-by-year balance table (collapsible)
- **Worked example:** $1M, $40k/yr, 5% return, 2.5% inflation → ~35 years (real), ~28 years (with sequence-of-returns sensitivity warning)
- **Region:** Currency only

#### 4. `/catch-up-contribution-calculator`
- **Unlocks:** FIN-006
- **Formula:** Standard contribution + catch-up bonus (age 50+). 2026 IRS limits: 401(k) $23k regular + $7.5k catch-up = $30.5k; IRA $7k regular + $1k catch-up = $8k.
- **Inputs:** `current_age` (number, ≥50 gate), `years_to_retirement`, `account_type` (radio: 401k / IRA), `expected_return` (slider, default 7%)
- **Outputs:** Without catch-up vs with catch-up ending balance; bonus dollars at retirement
- **Region:** USA — flag the limits with their year (2026)

#### 5. `/social-security-break-even-calculator`
- **Unlocks:** FIN-007
- **Formula:** Present value comparison of claiming at 62 / 67 (FRA) / 70. PIA × claim-age multiplier × life expectancy.
- **Inputs:** `monthly_benefit_at_FRA` (number), `current_age`, `life_expectancy` (slider 70–95, default 85)
- **Outputs:** Cumulative benefit at each claim age, break-even age (where 67 beats 62, where 70 beats 67), recommendation
- **Region:** USA-only

#### 6. `/fire-number-calculator`
- **Unlocks:** FIN-008
- **Formula:** `fire_number = annual_spend × 25` (4% rule); plus "Lean FIRE" (×20) and "Fat FIRE" (×33) variants
- **Inputs:** `monthly_spend` (number), `safe_withdrawal_rate` (slider 3–5%, default 4)
- **Outputs:** FIRE number, years to FIRE given current savings + monthly contribution + return rate
- **Region:** Currency only

#### 7. `/rule-of-72-calculator`
- **Unlocks:** FIN-014
- **Formula:** `years_to_double = 72 / rate`. Show 72 vs 69.3 (more accurate) vs 70 (approximation) comparison.
- **Inputs:** `interest_rate` (slider 1–15%, default 7) OR `years_to_double` (reverse mode)
- **Outputs:** Years to double, doublings-per-decade table
- **Worked example:** 7% → 10.3 years per doubling → $10k → $20k by year 10, $40k by year 21, $80k by year 31
- **Complexity:** Trivial. Build first as a warm-up pattern.

#### 8. `/dividend-reinvestment-calculator`
- **Unlocks:** FIN-016
- **Formula:** Compound growth where dividend yield is reinvested at the same return rate.
- **Inputs:** `starting_value`, `annual_dividend_yield` (slider 1–5%, default 2.5), `annual_return` (slider 5–12%, default 8), `years`
- **Outputs:** With DRIP vs without DRIP ending balance, dividend dollars accumulated
- **Region:** Currency only

#### 9. `/savings-vs-investing-calculator`
- **Unlocks:** FIN-020
- **Formula:** Two compound-growth runs side-by-side: HYSA at 4–5% vs index fund at 7–10%, both adjusted for inflation.
- **Inputs:** `monthly_contribution`, `years`, `savings_rate` (slider 0–6%, default 4.5), `investing_return` (slider 5–10%, default 7), `inflation` (slider 1–5%, default 2.5)
- **Outputs:** Both ending balances (nominal + real), real-dollar gap
- **Region:** Currency only

#### 10. `/college-savings-calculator`
- **Unlocks:** FIN-021
- **Formula:** 529 vs Roth IRA contribution comparison. Account for tax-deferred growth + qualified-withdrawal rules.
- **Inputs:** `child_current_age`, `years_until_college` (auto: 18 - current age), `annual_contribution`, `expected_return` (slider, default 6%), `state_tax_deduction` (number, optional, default 0)
- **Outputs:** 529 ending balance, Roth IRA ending balance, tax-savings tally, decision flag
- **Region:** USA-only

#### 11. `/hsa-calculator`
- **Unlocks:** FIN-025
- **Formula:** Triple-tax-advantage math. Contributions pre-tax (federal + FICA), growth tax-deferred, qualified medical withdrawals tax-free. Compare against 401(k) baseline.
- **Inputs:** `annual_contribution` (capped at 2026 limits: $4,300 self-only / $8,550 family), `years`, `marginal_tax` (slider, default 22%), `expected_return` (slider, default 7%)
- **Outputs:** HSA ending value vs equivalent 401(k) (which doesn't get FICA exemption); annual savings from FICA-pre-tax
- **Region:** USA-only

### buscalctools.com (14 calcs)

For each: create `app/<slug>/page.tsx` (thin wrapper) + `components/calculators/<Name>Calculator.tsx` (the form + logic). Copy the existing `BreakEvenCalculator.tsx` as a template.

#### 12. `/subscription-pricing-calculator`
- **Unlocks:** BUS-005
- **Inputs:** `monthly_price`, `annual_price` (or annual_discount %), `expected_churn_pct`, `years`
- **Outputs:** LTV per customer (monthly vs annual), discount break-even threshold, recommended annual discount

#### 13. `/price-elasticity-calculator`
- **Unlocks:** BUS-007
- **Formula:** `elasticity = % change in qty / % change in price`. Show revenue impact at +5%, +10%, +20% price hikes.
- **Inputs:** `current_price`, `current_units`, `new_price`, `new_units` OR `assumed_elasticity` (slider -3 to 0, default -1.2)

#### 14. `/self-employment-tax-calculator`
- **Unlocks:** BUS-009
- **Formula:** SE tax = 15.3% × net SE income × 92.35%, plus federal income tax estimate
- **Inputs:** `net_self_employment_income`, `state` (dropdown), `filing_status` (radio), `other_income` (optional)
- **Outputs:** SE tax owed, federal income tax estimate, quarterly estimate
- **Region:** USA-only (UK has different model; SA has provisional tax — out of scope for v1)

#### 15. `/s-corp-election-calculator`
- **Unlocks:** BUS-010
- **Formula:** Compare LLC default (all SE tax) vs S-corp (reasonable salary + distributions). Break-even at ~$40–50k net profit typically.
- **Inputs:** `annual_net_profit`, `reasonable_salary` (slider, default 60% of profit), `state`
- **Outputs:** LLC total tax, S-corp total tax, savings, payroll + filing overhead estimate, decision flag

#### 16. `/estimated-tax-calculator`
- **Unlocks:** BUS-011
- **Formula:** Safe-harbor: 100% of prior year (110% if AGI >$150k) OR 90% of current year, whichever lower.
- **Inputs:** `prior_year_total_tax`, `current_year_expected_income`, `withholding_to_date`, `filing_status`
- **Outputs:** Quarterly payment amount, due dates, safe-harbor verification

#### 17. `/hourly-to-salary-calculator`
- **Unlocks:** BUS-012
- **Formula:** Bidirectional: hourly × 2080 = annual; annual / 2080 = hourly. Plus loaded-cost variant (benefits 25–35%).
- **Inputs:** Either `hourly_rate` or `annual_salary` (toggle), `hours_per_week` (default 40), `weeks_per_year` (default 52)
- **Outputs:** Both views, plus loaded cost to employer
- **Complexity:** Trivial. Build first as a warm-up.

#### 18. `/payroll-tax-calculator`
- **Unlocks:** BUS-013
- **Formula:** State-by-state employer tax burden. SS/Medicare federal + state UI + state-specific.
- **Inputs:** `gross_payroll_annual`, `state` (dropdown), `num_employees`
- **Outputs:** Federal portion, state portion, total employer burden, per-employee average
- **Region:** USA — UK PAYE/NI version could be v2; SA UIF v3

#### 19. `/r-and-d-tax-credit-calculator`
- **Unlocks:** BUS-015
- **Formula:** Qualified Research Expenses (QRE) × 20% credit. Wage, supply, contract research components.
- **Inputs:** `qualified_wages`, `qualified_supplies`, `qualified_contract_research`, `base_amount` (auto-calculated)
- **Outputs:** Credit amount, payroll tax offset eligibility flag, documentation reminder
- **Complexity:** Hard. The eligibility logic alone is BRD-worthy. Skip if v1 timeline is tight.

#### 20. `/section-179-calculator`
- **Unlocks:** BUS-016
- **Formula:** Compare Section 179 immediate expensing vs 5-year MACRS depreciation. 2026 limit: $1.22M with $3.05M phase-out.
- **Inputs:** `equipment_cost`, `marginal_tax_rate`, `useful_life_years` (default 5)
- **Outputs:** Section 179 tax savings (year 1) vs depreciation savings (cumulative), break-even visual

#### 21. `/dso-calculator`
- **Unlocks:** BUS-018
- **Formula:** `DSO = (AR / Total Revenue) × Days`. Show vs industry benchmarks.
- **Inputs:** `accounts_receivable`, `annual_revenue`, `period_days` (default 365)
- **Outputs:** DSO in days, cash tied up vs 30-day benchmark, industry-comparison flag

#### 22. `/cac-ltv-calculator`
- **Unlocks:** BUS-019
- **Formula:** `CAC = sales_marketing_spend / new_customers`; `LTV = avg_revenue_per_user × gross_margin × avg_customer_lifespan`; `ratio = LTV / CAC` (target ≥ 3).
- **Inputs:** `sales_marketing_spend`, `new_customers`, `avg_monthly_revenue`, `gross_margin_pct`, `avg_lifespan_months`
- **Outputs:** CAC, LTV, ratio, payback period in months, health flag (poor / OK / healthy)

#### 23. `/inventory-turnover-calculator`
- **Unlocks:** BUS-020
- **Formula:** `Turnover = COGS / Average Inventory`; `Days = 365 / Turnover`. Industry benchmarks.
- **Inputs:** `cogs_annual`, `beginning_inventory`, `ending_inventory`
- **Outputs:** Turnover ratio, days in inventory, industry-benchmark comparison

#### 24. `/working-capital-calculator`
- **Unlocks:** BUS-022
- **Formula:** `WC = Current Assets - Current Liabilities`; `Ratio = CA / CL` (target ≥ 1.5).
- **Inputs:** `current_assets`, `current_liabilities`
- **Outputs:** Working capital ($/£/R), ratio, bank-readiness flag
- **Complexity:** Trivial. Build first.

#### 25. `/profit-first-allocation-calculator`
- **Unlocks:** BUS-023
- **Formula:** Mike Michalowicz's allocation: Real Revenue → 5 buckets (Profit / Owner Pay / Tax / OpEx / Income). Percentages scale by revenue tier.
- **Inputs:** `monthly_revenue`, `materials_subcontractors_pct` (auto: real revenue calculation)
- **Outputs:** 5-bucket allocation table with $ amounts, revenue-tier auto-detection (A through E)

---

## Recommended build sequence

### Sprint 1 — warm-up pattern (build 4 trivials first)
1. `/rule-of-72-calculator` (finncalc)
2. `/hourly-to-salary-calculator` (buscalctools)
3. `/working-capital-calculator` (buscalctools)
4. `/dso-calculator` (buscalctools)

Each <2 hours. Confirms the build pattern works end-to-end before tackling harder ones. Unlocks 4 topics for the pipeline.

### Sprint 2 — high-priority P1 topics on finncalc
5. `/safe-withdrawal-rate-calculator` (FIN-002 P1)
6. `/fire-number-calculator` (FIN-008 P1)
7. `/retirement-drawdown-calculator` (FIN-005 P1 + FIN-009 P2)
8. `/social-security-break-even-calculator` (FIN-007 P1)

### Sprint 3 — high-priority P1 topics on buscalctools
9. `/self-employment-tax-calculator` (BUS-009 P1)
10. `/s-corp-election-calculator` (BUS-010 P1)
11. `/estimated-tax-calculator` (BUS-011 P1)
12. `/cac-ltv-calculator` (BUS-019 P1)

### Sprint 4 — remaining P1
13. `/roth-vs-traditional-ira-calculator` (FIN-004 P1)
14. `/catch-up-contribution-calculator` (FIN-006 P2 — included to round out retirement set)

### Sprint 5 — P2 cleanup
15–22. dividend-reinvestment, savings-vs-investing, college-savings, hsa, subscription-pricing, price-elasticity, inventory-turnover, payroll-tax, section-179

### Sprint 6 — defer / P3
23–25. profit-first-allocation, r-and-d-tax-credit (hardest)

Total: ~6 sprints × ~4 calcs each = 24 calcs (rounded; some may move between sprints based on actual effort).

---

## After each sprint

1. Deploy to live (Cloudflare auto-purge per [[project_cloudflare_purge_fix]] takes care of cache)
2. In `C:\FIN_CALC_SITE\article_pipeline\tests\test_seed_topics.py`, **move the newly-live paths into `LIVE_FINNCALC_PATHS` or `LIVE_BUSCALCTOOLS_PATHS`**
3. In `C:\FIN_CALC_SITE\article_pipeline\config\topics_queue.yaml`, **update the `calculator_url` for every unlocked topic** to point at the now-live calc
4. Run `pytest -m acceptance` — should still be 19/19 green
5. Run `pytest tests/test_seed_topics.py -v` — the soft-assert warning shrinks

When the warning drops to zero (all 26 topics now point at live calcs):
- Flip `warnings.warn(...)` to `assert False, msg` in the soft-assert test
- The pipeline can go live

---

## Going-live checklist (after Wave 10 ships)

This belongs in the AAGP project memory ([[project_aagp_pipeline]]) — re-read before scheduling the first run:

- [ ] All 26 pending calcs live and 200ing
- [ ] All 50 topic URLs in `config/topics_queue.yaml` point at live pages
- [ ] `pytest -m acceptance` passes with zero warnings
- [ ] `ANTHROPIC_API_KEY` set as a **machine** env var
- [ ] Run `.\scripts\run_pipeline.ps1` manually once on the real PS 5.1 host — verify it produces a complete bundle, dashboard renders, no crashes
- [ ] Run `.\scripts\install_scheduler.ps1` from elevated PowerShell
- [ ] `Get-ScheduledTask -TaskName AAGP_Article_Pipeline` shows registered + Ready state
- [ ] Wait for first Mon/Wed/Fri 06:00 trigger; check `logs/launcher_*.log` afterward

That's go-live.

---

## Out of scope for this wave

- **The article pipeline itself** is built and committed. Don't touch `C:\FIN_CALC_SITE\article_pipeline\` during Wave 10 except for the per-sprint test/yaml updates listed above.
- **New topic ideas** beyond the existing 50. The seed catalogue is from Doc 3; new topic curation is a separate project.
- **Calc rewrites/cleanups** of already-live calculators (Wave 6–9 work is done; don't reopen).
- **Multi-region tax accuracy beyond what's in scope per calc.** Many calcs are USA-only in v1 — that's deliberate. UK/SA equivalents are v2/v3.
