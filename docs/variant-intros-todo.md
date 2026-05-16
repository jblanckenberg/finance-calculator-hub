# Variant Intro Copy — Operator TODO (FinCalcHub, Phase 2)

> **Goal:** Replace every `[OPERATOR_TO_FILL: ...]` marker in `_build/data/variants.json` with a 300-500 word unique intro paragraph (2-3 paragraphs).
>
> **Style:** Match the parent calculator's existing tone. Open with a 40-60 word direct answer (snippet target). Cite at least one government source (HMRC / IRS / SARS / BoE / SARB) per geo variant. Cite at least one authoritative source (academic, fund manager, or .gov) per scenario/audience variant.
>
> **Anti-patterns:** No AI-generated text. No "in this article we will explore". No restating the calculator's instructions.
>
> **When done with one:** edit the matching entry in `_build/data/variants.json` (replace the `intro` field's `[OPERATOR_TO_FILL: ...]` string with the new prose; separate paragraphs with `\n\n`), then run `python _build/generate.py --apply && python _build/update_sitemap.py --apply` from the repo root. The variant page auto-flips from `noindex,follow` to default `index,follow` as soon as its intro no longer starts with `[OPERATOR_TO_FILL:`.
>
> **Validation:** after each edit, run `pytest _build -v` — the "every intro is operator stub initially" assertion will fail once you've shipped your first intro, which is expected. Update that test to assert ≥300 words per intro once all 15 are filled.

## Tracker

| # | Parent calculator | Variant | Kind | URL | Words written? | Reviewed? |
|---|---|---|---|---|---|---|
| 1 | compound-interest | uk | geo | /compound-interest/uk/ | ☐ | ☐ |
| 2 | compound-interest | us | geo | /compound-interest/us/ | ☐ | ☐ |
| 3 | compound-interest | with-monthly-contributions | scenario | /compound-interest/with-monthly-contributions/ | ☐ | ☐ |
| 4 | mortgage | uk | geo | /mortgage/uk/ | ☐ | ☐ |
| 5 | mortgage | us | geo | /mortgage/us/ | ☐ | ☐ |
| 6 | mortgage | first-time-buyer | audience | /mortgage/first-time-buyer/ | ☐ | ☐ |
| 7 | take-home-pay | uk | geo | /take-home-pay/uk/ | ☐ | ☐ |
| 8 | take-home-pay | us | geo | /take-home-pay/us/ | ☐ | ☐ |
| 9 | take-home-pay | za | geo | /take-home-pay/za/ | ☐ | ☐ |
| 10 | retirement-savings | uk | geo | /retirement-savings/uk/ | ☐ | ☐ |
| 11 | retirement-savings | us | geo | /retirement-savings/us/ | ☐ | ☐ |
| 12 | investment-growth | uk | geo | /investment-growth/uk/ | ☐ | ☐ |
| 13 | savings-goal | house-deposit | scenario | /savings-goal/house-deposit/ | ☐ | ☐ |
| 14 | net-worth | by-age | scenario | /net-worth/by-age/ | ☐ | ☐ |
| 15 | inflation-impact | uk | geo | /inflation-impact/uk/ | ☐ | ☐ |

## After all 15 ship

1. Resubmit `https://finncalc.com/sitemap.xml` to Google Search Console, Bing Webmaster, and Yandex Webmaster.
2. Update `_build/test_variants_data.py::test_every_intro_is_operator_stub_initially` to assert each `intro` is ≥300 words.
3. Push to `main`; Cloudflare Pages auto-deploys.
4. Run Lighthouse on 3 representative variants; confirm CLS ≤ 0.1 and LCP ≤ 2.5s.
5. Add 5 internal links from related blog posts to the new variants.
