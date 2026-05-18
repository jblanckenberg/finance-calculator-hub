# P0 — Missing `calculate()` function on 12 calc pages

## Problem

Twelve of nineteen finncalc calculator pages render input controls with `oninput="calculate()"` and `onclick="calculate()"` handlers, but no `calculate()` function is defined anywhere on those pages (no inline `<script>` block, no separate per-calc JS module). Clicking inputs throws a silent `ReferenceError` in the browser console and the results panel never updates — the calculator visually exists but does nothing. This is a pre-existing bug unrelated to the recent Try-these-scenarios shipment; the scenario links populate inputs correctly but the downstream recompute never fires on these pages, which compounds the user-facing damage. A temporary mitigation now lives in `js/main.js`: the Try-these-scenarios block is hidden at runtime on any page where `typeof calculate !== "function"`, so users are not invited to load a scenario they cannot actually run.

## Affected calc page slugs (12)

- `compound-interest`
- `credit-card-payoff`
- `emergency-fund`
- `inflation-impact`
- `investment-growth`
- `loan-payoff`
- `mortgage`
- `net-worth`
- `retirement-savings`
- `sa-tax-calculator`
- `savings-goal`
- `take-home-pay`

## Working pages for reference (7)

These calc pages each define an inline `calculate()` (and supporting helpers) and can be used as the reference shape for the restoration:

- `401k-calculator`
- `debt-snowball-calculator`
- `fire-calculator`
- `isa-calculator`
- `roth-ira-calculator`
- `student-loan-calculator`
- `tfsa-calculator`

## Suggested remediation paths

1. **Restore inline `calculate()` per page (lowest-risk).** Re-author or recover the inline `<script>` block that was historically attached to each of the 12 calc HTML templates. Pattern-match against the 7 working pages above for the shape (DOM read → math → DOM write into `.result-value` / `.result-item`). This is what the rest of the site already does; consistent, static-deployable, no build changes required.

2. **Port logic from the buscalctools sibling project.** The sibling project (BizProfitCalc / buscalctools) reportedly has working implementations of equivalent calculators. Auditing those, adapting the variable names to the finncalc input IDs, and dropping the resulting JS inline on each page would be faster than re-authoring from scratch where the math is non-trivial (mortgage amortisation, retirement-savings compounding, SA PAYE bands).

3. **Re-author per-calc from spec.** For calculators where neither inline JS nor a portable buscalctools equivalent exists (e.g. `inflation-impact`, `net-worth`, `emergency-fund`), write fresh logic against the documented inputs/outputs. Keep the function signature `function calculate() { … }` so the existing `oninput`/`onclick` handlers and the `js/main.js` scenario loader continue to work without HTML changes.

4. **Extract into a shared module (optional refactor, do later).** Once all 12 pages have working `calculate()` functions inline, consider extracting common helpers (currency formatting, rate conversions, amortisation) into `js/calc/_shared.js` to reduce duplication. Do not block the P0 restoration on this refactor.

## Verification once fixed

- Open each of the 12 affected pages in a browser and confirm the results panel updates as inputs change.
- Click one Try-these-scenarios link per page and confirm the inputs populate **and** the results recompute (the mitigation guard in `js/main.js` will automatically re-show the Try-scenarios block once `calculate` is defined on the page).
- Remove the runtime hide guard in `js/main.js` only after all 12 pages are confirmed working, or leave it in place as belt-and-braces against future regressions.
