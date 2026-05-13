# Wave 6: Content-Gap Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three new pages — `/stamp-duty-calculator/`, `/take-home-pay-comparison/`, `/sa-tax-calculator/` — each as an isolated commit, matching the existing static-HTML pattern.

**Architecture:** Each page is a single `<slug>/index.html` file using the shared template defined in Phase 0. Page-local `<script>` block holds the calculator logic. No new dependencies, no build step, no shared JS modules. Schema (`WebApplication` + `FAQPage` + `BreadcrumbList`) and FAQ HTML are duplicated per page so each page is independently indexable.

**Tech Stack:** Plain HTML5 + CSS3 (`/css/main.css`) + vanilla JS (`/js/region.js`, `/js/main.js`, page-local calc functions). Hosted on Cloudflare Pages. No frameworks. GA4 (`G-5FSP8WRB3C`) and Microsoft Clarity tags inherited from the template.

**Spec:** [`docs/superpowers/specs/2026-05-13-content-gap-quick-wins-design.md`](../specs/2026-05-13-content-gap-quick-wins-design.md).

---

## File Map

| File | Action | Phase |
|---|---|---|
| `stamp-duty-calculator/index.html` | Create | 1 |
| `mortgage/index.html` | Modify (add internal link) | 1 |
| `blog/how-much-is-stamp-duty-uk/index.html` | Modify (add CTA) | 1 |
| `sitemap.xml` | Modify (add 1 URL) | 1 |
| `take-home-pay-comparison/index.html` | Create | 2 |
| `take-home-pay/index.html` | Modify (add internal link) | 2 |
| `sitemap.xml` | Modify (add 1 URL) | 2 |
| `sa-tax-calculator/index.html` | Create | 3 |
| `take-home-pay/index.html` | Modify (add SA-region link) | 3 |
| `sitemap.xml` | Modify (add 1 URL) | 3 |
| `~/.claude/projects/C--FIN-CALC-SITE/memory/project_wave6_quickwins.md` | Create (memory note) | Post |

---

## Phase 0 — The Page Template (read once, reused in every phase)

This is the HTML template every new calculator page uses. Each phase below provides values for the placeholder tokens (`{{TOKEN}}`) and the executor produces the final file by substitution. **The template itself is never modified** — only the substitution values change between pages.

**Reference source of truth:** `compound-interest/index.html` already implements this pattern. If the template below ever conflicts with what's in `compound-interest/index.html`, the existing file wins. (One-time cross-check: open both side-by-side, confirm head order, schema blocks, and footer match.)

**Template (`/templates/calc-page.template.html` — conceptual; this file is NOT created on disk, it is the recipe for each phase):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
<meta name="theme-color" content="#1B3A5C">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <meta name="description" content="{{DESCRIPTION}}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{{CANONICAL}}">
  <meta property="og:title" content="{{TITLE}}">
  <meta property="og:description" content="{{DESCRIPTION}}">
  <meta property="og:url" content="{{CANONICAL}}">
  <meta property="og:type" content="website">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-400.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-700.woff2" crossorigin>
  <link rel="stylesheet" href="/css/main.css">
  <link rel="stylesheet" href="/css/print.css" media="print">
  <!-- Google AdSense: paste your code here after approval -->
  {{WEBAPPLICATION_JSON_LD}}
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-5FSP8WRB3C"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-5FSP8WRB3C');
</script>
{{FAQ_JSON_LD}}
<script>
(function(){
  var loaded=false;
  function loadAds(){
    if(loaded) return; loaded=true;
    var s=document.createElement('script');
    s.async=true;
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5092336325075679';
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  }
  if('IntersectionObserver' in window){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){loadAds();obs.disconnect();}});
    },{rootMargin:'200px'});
    document.addEventListener('DOMContentLoaded',function(){
      document.querySelectorAll('.ad-slot').forEach(function(el){obs.observe(el);});
    });
  } else {
    window.addEventListener('load',loadAds);
  }
})();
</script>
  <meta property="og:site_name" content="FinCalcHub">
  <meta property="og:image" content="https://finncalc.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:secure_url" content="https://finncalc.com/og-image.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="FinCalcHub — free financial calculators for USA, UK and South Africa">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{TITLE}}">
  <meta name="twitter:description" content="{{DESCRIPTION}}">
  <meta name="twitter:image" content="https://finncalc.com/og-image.png">
{{BREADCRUMB_JSON_LD}}
<!-- Microsoft Clarity -->
<script>
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wpt2jq739l");
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebPage","speakable":{"@type":"SpeakableSpecification","cssSelector":["h1",".subtitle"]}}
</script>
  <script src="/js/cookie-consent.js" defer></script>
  <script src="/js/analytics-events.js" defer></script>
</head>
<body>

<header>
  <a href="/" class="logo">⚡ FinCalcHub</a>
  <nav>
    <a href="/compound-interest/">Compound Interest</a>
    <a href="/retirement-savings/">Retirement</a>
    <a href="/take-home-pay/">Take-Home Pay</a>
    <a href="/mortgage/">Mortgage</a>
  </nav>
</header>

{{REGION_BAR_HTML}}

<div class="container">
  <div class="ad-slot">Advertisement</div>
</div>

<div class="container" style="padding-top:0">
  <p class="breadcrumb"><a href="/">Home</a> › {{BREADCRUMB_LEAF}}</p>
  <h1>{{HERO_H1}}</h1>
  <p class="subtitle">{{HERO_SUBTITLE}}</p>
<div class="quick-answer">
  <h2>{{QUICK_ANSWER_Q}}</h2>
  <p>{{QUICK_ANSWER_A}}</p>
</div>
</div>

<div class="container" style="padding-top:0">
  <div class="card">
    <div class="card-title">Enter Your Details</div>
    {{FORM_HTML}}
    <button class="btn-calc" onclick="calculate()">Calculate →</button>
  </div>

  <div class="results" id="results">
    {{RESULTS_HTML}}
    <div class="action-bar">
      <button class="btn-action" onclick="window.print()">🖨️ Print Results</button>
      <button class="btn-action" onclick="saveToFile()">💾 Save as Text</button>
    </div>
  </div>

  <div class="ad-slot">Advertisement</div>

  <div class="related">
    <h2>Related Calculators</h2>
    <div class="related-grid">
      {{RELATED_CARDS_HTML}}
    </div>
  </div>

  <div class="faq">
    <h2>Frequently Asked Questions</h2>
    {{FAQ_HTML}}
  </div>

  <div class="ad-slot">Advertisement</div>
</div>

<div class="related" style="margin-top:32px">
  <h2>From the Blog</h2>
  <div class="related-grid">{{BLOG_CARDS_HTML}}</div>
</div>

<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <a href="/" class="logo" style="color:#fff">⚡ FinCalcHub</a>
      <div class="footer-links"><a href="/">All Calculators</a><a href="/blog/">Blog</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a><a href="/disclosure/">Disclosure</a></div>
    </div>
    <div class="footer-bottom">
      <p>© 2024 FinCalcHub. All rights reserved.</p>
      <p class="footer-disclaimer">All calculations are for informational purposes only and do not constitute financial advice. Always consult a qualified financial adviser before making investment decisions.</p>
    </div>
  </div>
</footer>

<script src="/js/region.js"></script>
<script src="/js/main.js"></script>
<script>
{{CALC_JS}}
</script>
</body>
</html>
```

**Tokens explained:**
- `{{TITLE}}` — `<title>` and Twitter card title (max 60 chars including " | FinCalcHub")
- `{{DESCRIPTION}}` — meta description (150-160 chars)
- `{{CANONICAL}}` — full URL of this page, trailing slash
- `{{WEBAPPLICATION_JSON_LD}}` — full `<script type="application/ld+json">` block for the WebApplication schema
- `{{FAQ_JSON_LD}}` — full `<script type="application/ld+json">` block for the FAQPage schema
- `{{BREADCRUMB_JSON_LD}}` — full `<script type="application/ld+json">` block for the BreadcrumbList
- `{{REGION_BAR_HTML}}` — the 3-button region bar, OR an empty string for UK-only / SA-only pages
- `{{BREADCRUMB_LEAF}}` — text after "Home › ", e.g. `Stamp Duty Calculator`
- `{{HERO_H1}}` — main heading
- `{{HERO_SUBTITLE}}` — `<p class="subtitle">` text
- `{{QUICK_ANSWER_Q}}` / `{{QUICK_ANSWER_A}}` — the featured-snippet "quick answer" block at top
- `{{FORM_HTML}}` — the `.form-row` / `.form-group` elements
- `{{RESULTS_HTML}}` — `.results-title`, `.result-grid`, breakdown table — fully provided per page
- `{{RELATED_CARDS_HTML}}` — anchor tags for related calculators
- `{{BLOG_CARDS_HTML}}` — anchor tags for related blog posts
- `{{FAQ_HTML}}` — `.faq-item` blocks (mirrors `FAQ_JSON_LD` content)
- `{{CALC_JS}}` — the `calculate()` function and any helpers

**Pre-flight check before starting any phase:**

- [ ] Confirm clean working tree: `git -C C:/FIN_CALC_SITE/Finance_Calculator_Hub status --short` returns empty.
- [ ] Confirm on `main`: `git -C C:/FIN_CALC_SITE/Finance_Calculator_Hub branch --show-current` returns `main`.
- [ ] Open `compound-interest/index.html` in the editor — keep visible as reference for the head/footer pattern.

---

## Phase 1 — `/stamp-duty-calculator/` (commit 1)

### Task 1.1: Create directory and file

- [ ] **Step 1:** Create the directory.
  - Path: `C:\FIN_CALC_SITE\Finance_Calculator_Hub\stamp-duty-calculator\`
  - Action: Use the file system or `mkdir`. Confirm it doesn't already exist first.

- [ ] **Step 2:** Create the file `stamp-duty-calculator/index.html` using the Phase 0 template, substituting the values from Tasks 1.2–1.7 below. Build the file in this order to keep iterations small: head → body shell → form → results → calc JS → FAQ → schemas. Do **not** commit until Task 1.9.

### Task 1.2: Head metadata values

Substitute into the template:

- `{{TITLE}}` = `UK Stamp Duty Calculator 2026 (SDLT) | FinCalcHub`
- `{{DESCRIPTION}}` = `Free UK stamp duty calculator (SDLT) for 2026. Standard rates, first-time buyer relief, second-home surcharge, non-UK-resident surcharge. England & NI.`
- `{{CANONICAL}}` = `https://finncalc.com/stamp-duty-calculator/`
- `{{BREADCRUMB_LEAF}}` = `Stamp Duty Calculator`
- `{{HERO_H1}}` = `UK Stamp Duty Calculator (SDLT)`
- `{{HERO_SUBTITLE}}` = `Work out the Stamp Duty Land Tax due on a property purchase in England or Northern Ireland. Covers standard purchases, first-time buyers, additional properties, and non-UK residents.`
- `{{QUICK_ANSWER_Q}}` = `How is UK stamp duty calculated?`
- `{{QUICK_ANSWER_A}}` = `Stamp Duty Land Tax (SDLT) is calculated as a banded percentage of the property price. As of April 2025, no SDLT is due on the first £125,000. The next £125,000 (up to £250,000) is taxed at 2%, the slice from £250,001–£925,000 at 5%, the slice from £925,001–£1.5M at 10%, and any amount above £1.5M at 12%. First-time buyers get relief up to £500,000. Additional properties pay a 5% surcharge on every band, and non-UK residents pay a further 2% on top.`

### Task 1.3: WebApplication + Breadcrumb + FAQPage JSON-LD

- [ ] **Step 1:** Substitute `{{WEBAPPLICATION_JSON_LD}}` with:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"UK Stamp Duty Calculator","description":"Free UK Stamp Duty (SDLT) calculator with first-time buyer relief and surcharges for additional properties and non-UK residents.","url":"https://finncalc.com/stamp-duty-calculator/","applicationCategory":"FinanceApplication","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"GBP"}}
</script>
```

- [ ] **Step 2:** Substitute `{{BREADCRUMB_JSON_LD}}` with:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://finncalc.com/"},{"@type":"ListItem","position":2,"name":"UK Stamp Duty Calculator","item":"https://finncalc.com/stamp-duty-calculator/"}]}
</script>
```

- [ ] **Step 3:** Substitute `{{FAQ_JSON_LD}}` with the 5-question FAQ block. Use the exact answer text in the FAQ HTML (Task 1.6) so the visible Q&A matches the schema verbatim — Google penalises mismatch.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"What is UK stamp duty (SDLT)?","acceptedAnswer":{"@type":"Answer","text":"Stamp Duty Land Tax (SDLT) is a tax paid by the buyer when purchasing a residential or non-residential property in England or Northern Ireland. It is charged as a percentage of the purchase price, with the rate rising in bands. Scotland uses a separate tax (LBTT) and Wales uses Land Transaction Tax (LTT)."}},
    {"@type":"Question","name":"When do you pay stamp duty?","acceptedAnswer":{"@type":"Answer","text":"SDLT must be paid to HMRC within 14 days of the property completion date. In practice, your solicitor or conveyancer files the return and pays the tax on your behalf as part of the completion process."}},
    {"@type":"Question","name":"Is there stamp duty for first-time buyers?","acceptedAnswer":{"@type":"Answer","text":"First-time buyers pay no SDLT on the first £300,000 of a property priced at £500,000 or less, and 5% on any amount between £300,000 and £500,000. If the property costs more than £500,000, first-time buyer relief does not apply and the standard rates are used instead."}},
    {"@type":"Question","name":"Do I pay extra stamp duty on a second home?","acceptedAnswer":{"@type":"Answer","text":"Yes. Buying an additional property — a second home or buy-to-let — adds a 5% surcharge to every SDLT band, including the £0–£125,000 band that is normally tax-free. The surcharge has been 5% since 31 October 2024."}},
    {"@type":"Question","name":"Does this calculator cover Scotland or Wales?","acceptedAnswer":{"@type":"Answer","text":"No. This calculator covers SDLT in England and Northern Ireland only. Scotland uses Land and Buildings Transaction Tax (LBTT) and Wales uses Land Transaction Tax (LTT), both of which have different bands and rules. See gov.scot/lbtt and gov.wales/land-transaction-tax for those."}}
  ]
}
</script>
```

### Task 1.4: Body — region bar and form HTML

- [ ] **Step 1:** Substitute `{{REGION_BAR_HTML}}` with **empty string** (this is a UK-only page; no region toggle).

- [ ] **Step 2:** Substitute `{{FORM_HTML}}` with:

```html
<div class="form-group">
  <label>Property Price (£)</label>
  <input type="number" id="price" value="350000" min="0" placeholder="350000" oninput="calculate()" inputmode="decimal">
</div>

<div class="form-group">
  <label>Buyer Type</label>
  <select id="buyerType" onchange="calculate()">
    <option value="standard" selected>Standard purchase (replacing main home or buying first home over £500k)</option>
    <option value="ftb">First-time buyer (£500,000 or less)</option>
    <option value="additional">Additional property (second home / buy-to-let)</option>
  </select>
</div>

<div class="form-group">
  <label><input type="checkbox" id="nonResident" onchange="calculate()"> I am a non-UK resident (adds 2% surcharge)</label>
</div>
```

### Task 1.5: Body — results HTML

- [ ] **Step 1:** Substitute `{{RESULTS_HTML}}` with:

```html
<div class="results-title">Your Results</div>
<div class="result-grid">
  <div class="result-item">
    <div class="result-value positive" id="r-total">£0</div>
    <div class="result-label">Total Stamp Duty Due</div>
  </div>
  <div class="result-item">
    <div class="result-value" id="r-effective">0%</div>
    <div class="result-label">Effective Rate</div>
  </div>
  <div class="result-item">
    <div class="result-value" id="r-net">£0</div>
    <div class="result-label">Total Cost (Price + SDLT)</div>
  </div>
</div>

<hr class="results-divider">

<div class="breakdown-title">Band-by-Band Breakdown</div>
<div style="overflow-x:auto">
  <table class="breakdown-table" id="breakdown-table">
    <thead>
      <tr>
        <th>Band</th>
        <th class="td-right">Rate</th>
        <th class="td-right">Taxable in Band</th>
        <th class="td-right">SDLT in Band</th>
      </tr>
    </thead>
    <tbody id="breakdown-body"></tbody>
  </table>
</div>
```

### Task 1.6: Calc JS

- [ ] **Step 1:** Substitute `{{CALC_JS}}` with the SDLT calculation logic. This is the page's central code — review it line-by-line before pasting.

```js
function formatGBP(value) {
  var abs = Math.abs(Math.round(value));
  return (value < 0 ? '-' : '') + '£' + abs.toLocaleString('en-GB');
}

function sdltBands(buyerType, price) {
  // First-time buyer relief: only applies if price <= 500000 AND buyerType === 'ftb'.
  if (buyerType === 'ftb' && price <= 500000) {
    return [
      {label: '£0 – £300,000',           low: 0,      high: 300000,    rate: 0.00},
      {label: '£300,001 – £500,000',     low: 300000, high: 500000,    rate: 0.05}
    ];
  }
  // Standard bands (used for standard purchases, FTB over £500k, and additional property)
  return [
    {label: '£0 – £125,000',             low: 0,       high: 125000,   rate: 0.00},
    {label: '£125,001 – £250,000',       low: 125000,  high: 250000,   rate: 0.02},
    {label: '£250,001 – £925,000',       low: 250000,  high: 925000,   rate: 0.05},
    {label: '£925,001 – £1,500,000',     low: 925000,  high: 1500000,  rate: 0.10},
    {label: 'Over £1,500,000',           low: 1500000, high: Infinity, rate: 0.12}
  ];
}

function calculate() {
  var price        = parseFloat(document.getElementById('price').value) || 0;
  var buyerType    = document.getElementById('buyerType').value;
  var nonResident  = document.getElementById('nonResident').checked;

  var bands = sdltBands(buyerType, price);
  // Surcharges only apply on standard bands (not on the FTB relief bands).
  var usingFtbRelief = (buyerType === 'ftb' && price <= 500000);
  var surcharge = 0;
  if (!usingFtbRelief) {
    if (buyerType === 'additional') surcharge += 0.05;
    if (nonResident)                surcharge += 0.02;
  } else if (nonResident) {
    // FTB relief + non-resident: gov.uk applies the 2% non-resident surcharge on top of FTB rates.
    surcharge += 0.02;
  }

  var total = 0;
  var tbody = document.getElementById('breakdown-body');
  tbody.innerHTML = '';

  for (var i = 0; i < bands.length; i++) {
    var b = bands[i];
    if (price <= b.low) break;
    var taxable = Math.min(price, b.high) - b.low;
    var effRate = b.rate + surcharge;
    var bandTax = taxable * effRate;
    total += bandTax;
    tbody.innerHTML +=
      '<tr>' +
        '<td>' + b.label + '</td>' +
        '<td class="td-right">' + (effRate * 100).toFixed(1) + '%</td>' +
        '<td class="td-right">' + formatGBP(taxable) + '</td>' +
        '<td class="td-right">' + formatGBP(bandTax) + '</td>' +
      '</tr>';
  }

  var effective = price > 0 ? (total / price) * 100 : 0;
  document.getElementById('r-total').textContent     = formatGBP(total);
  document.getElementById('r-effective').textContent = effective.toFixed(2) + '%';
  document.getElementById('r-net').textContent       = formatGBP(price + total);

  document.getElementById('results').classList.add('show');
}

document.addEventListener('DOMContentLoaded', function() { calculate(); });
```

### Task 1.7: Related cards, blog cards, FAQ HTML

- [ ] **Step 1:** Substitute `{{RELATED_CARDS_HTML}}` with:

```html
<a href="/mortgage/" class="related-card">🏠 Mortgage Calculator</a>
<a href="/take-home-pay/" class="related-card">💷 Take-Home Pay</a>
<a href="/loan-payoff/" class="related-card">💳 Loan Payoff</a>
<a href="/savings-goal/" class="related-card">🎯 House Deposit Savings Goal</a>
```

- [ ] **Step 2:** Substitute `{{BLOG_CARDS_HTML}}` with:

```html
<a href="/blog/how-much-is-stamp-duty-uk/" class="related-card">🏡 How Much Is Stamp Duty in the UK?</a>
<a href="/blog/how-much-house-can-i-afford/" class="related-card">📐 How Much House Can I Afford?</a>
<a href="/blog/save-for-house-deposit/" class="related-card">💰 Save for a House Deposit</a>
```

- [ ] **Step 3:** Substitute `{{FAQ_HTML}}` with — **answer text must match `{{FAQ_JSON_LD}}` from Task 1.3 verbatim**:

```html
<div class="faq-item">
  <div class="faq-q">What is UK stamp duty (SDLT)?</div>
  <div class="faq-a">Stamp Duty Land Tax (SDLT) is a tax paid by the buyer when purchasing a residential or non-residential property in England or Northern Ireland. It is charged as a percentage of the purchase price, with the rate rising in bands. Scotland uses a separate tax (LBTT) and Wales uses Land Transaction Tax (LTT).</div>
</div>
<div class="faq-item">
  <div class="faq-q">When do you pay stamp duty?</div>
  <div class="faq-a">SDLT must be paid to HMRC within 14 days of the property completion date. In practice, your solicitor or conveyancer files the return and pays the tax on your behalf as part of the completion process.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Is there stamp duty for first-time buyers?</div>
  <div class="faq-a">First-time buyers pay no SDLT on the first £300,000 of a property priced at £500,000 or less, and 5% on any amount between £300,000 and £500,000. If the property costs more than £500,000, first-time buyer relief does not apply and the standard rates are used instead.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Do I pay extra stamp duty on a second home?</div>
  <div class="faq-a">Yes. Buying an additional property — a second home or buy-to-let — adds a 5% surcharge to every SDLT band, including the £0–£125,000 band that is normally tax-free. The surcharge has been 5% since 31 October 2024.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Does this calculator cover Scotland or Wales?</div>
  <div class="faq-a">No. This calculator covers SDLT in England and Northern Ireland only. Scotland uses Land and Buildings Transaction Tax (LBTT) and Wales uses Land Transaction Tax (LTT), both of which have different bands and rules. See gov.scot/lbtt and gov.wales/land-transaction-tax for those.</div>
</div>
```

### Task 1.8: Verification — math

These three cases are the gate. Any failure halts the commit and the calc JS is fixed.

- [ ] **Step 1:** Open `stamp-duty-calculator/index.html` in a browser (Chrome). Open DevTools console.
- [ ] **Step 2:** Test case A — Standard purchase, £250,000, UK resident, not FTB, not additional.
  - Enter `250000` in price, leave dropdown on "Standard purchase", uncheck non-resident.
  - **Expected total: £2,500**, effective 1.00%.
  - Cross-check: gov.uk SDLT calculator (`https://www.gov.uk/stamp-duty-land-tax/residential-property-rates`) gives £2,500 for a £250k main-home purchase.
- [ ] **Step 3:** Test case B — First-time buyer, £500,000.
  - Enter `500000`, select "First-time buyer".
  - **Expected total: £10,000** (£0 on first £300k + 5% × £200k), effective 2.00%.
- [ ] **Step 4:** Test case C — Additional property + non-UK resident, £750,000.
  - Enter `750000`, select "Additional property", check non-resident.
  - Surcharge = 5% + 2% = 7%. Effective per band: 7%, 9%, 12%.
  - Band 1 (0-125k): £125,000 × 7% = £8,750.
  - Band 2 (125k-250k): £125,000 × 9% = £11,250.
  - Band 3 (250k-750k): £500,000 × 12% = £60,000.
  - **Expected total: £80,000**, effective 10.67%.
- [ ] **Step 5:** If any test fails by more than £1, do NOT proceed. Diff the calc against the SDLT band reference, find the bug, re-test all three cases from scratch.

### Task 1.9: Verification — schema and accessibility

- [ ] **Step 1:** Validate schema. Open `https://search.google.com/test/rich-results`, paste the full HTML, run. All three blocks (WebApplication, FAQPage, BreadcrumbList) must show as **valid** with **0 errors, 0 warnings**.
- [ ] **Step 2:** Validate HTML. Paste source into `https://validator.w3.org/nu/#textarea`. Must show **0 errors**. Inline `<style>` warnings are acceptable.
- [ ] **Step 3:** Lighthouse on mobile.
  - In Chrome DevTools → Lighthouse → Mobile → Performance + Accessibility + Best Practices + SEO → Analyze.
  - Required scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100.
  - If any miss, investigate and fix before commit.
- [ ] **Step 4:** Keyboard test. Tab through the page from URL bar. Every input, dropdown, checkbox, and button must be reachable and focus-visible. The Calculate button must respond to Enter.

### Task 1.10: Update sitemap.xml

- [ ] **Step 1:** Edit `sitemap.xml`. Find an existing `<url>` entry for a calculator (e.g. `compound-interest/`) and add a new `<url>` block alphabetically-adjacent. Use exact form:

```xml
  <url>
    <loc>https://finncalc.com/stamp-duty-calculator/</loc>
    <lastmod>2026-05-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
```

- [ ] **Step 2:** Replace `2026-05-13` with the actual commit date if different. Use `priority=0.9` (same as other top-level calculators — verify by reading the existing `compound-interest/` entry's priority and matching it).

### Task 1.11: Internal links — `mortgage/index.html`

- [ ] **Step 1:** Open `mortgage/index.html`. Find the Related Calculators section (search for `<h2>Related Calculators</h2>`).
- [ ] **Step 2:** Add a card inside `.related-grid`:

```html
<a href="/stamp-duty-calculator/" class="related-card">🏡 UK Stamp Duty</a>
```

- [ ] **Step 3:** Insert as the first card if the page is UK-focused, otherwise after the existing cards. Confirm the page still renders correctly (no broken markup).

### Task 1.12: Internal links — `blog/how-much-is-stamp-duty-uk/index.html`

- [ ] **Step 1:** Open `blog/how-much-is-stamp-duty-uk/index.html`. Find the first `</h1>` (the article title).
- [ ] **Step 2:** Immediately after the title's containing block (typically `<header>` or first `<p>`), insert a CTA paragraph:

```html
<p style="background:#f0f7ff;border-left:4px solid #1B3A5C;padding:12px 16px;margin:16px 0;border-radius:4px"><strong>Try the tool:</strong> <a href="/stamp-duty-calculator/">UK Stamp Duty Calculator →</a> — get the figure for your purchase in 5 seconds.</p>
```

- [ ] **Step 3:** If a similar CTA already exists, do not duplicate — instead update the existing CTA's link if it points elsewhere.

### Task 1.13: Commit

- [ ] **Step 1:** Stage the files:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" add stamp-duty-calculator/index.html mortgage/index.html "blog/how-much-is-stamp-duty-uk/index.html" sitemap.xml
```

- [ ] **Step 2:** Confirm staged files match expectations:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" status --short
```

Expected:

```
A  stamp-duty-calculator/index.html
M  mortgage/index.html
M  blog/how-much-is-stamp-duty-uk/index.html
M  sitemap.xml
```

- [ ] **Step 3:** Commit:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" commit -m "Wave 6: add /stamp-duty-calculator/ (UK SDLT, all surcharges)"
```

- [ ] **Step 4:** Verify the commit:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" log --oneline -1
```

Expected: one new commit on top of `781c837 Spec: ...`.

- [ ] **Step 5:** Do NOT push yet. Wait until all 3 phases are committed (Task 4.1), then push as one batch.

---

## Phase 2 — `/take-home-pay-comparison/` (commit 2)

### Task 2.1: Bracket constants — verify against current sources

Before writing code, lock down the bracket values. The existing `take-home-pay/index.html` (lines 322–490) uses **2024/25** brackets. The spec calls for **2025/26** on the new page. Run this verification first:

- [ ] **Step 1:** Open `take-home-pay/index.html` and read lines 322–490 to confirm what's currently in use.
- [ ] **Step 2:** Open three reference tabs:
  - US 2025 federal: `https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025`
  - UK 2025/26: `https://www.gov.uk/income-tax-rates` and `https://www.gov.uk/national-insurance-rates-letters`
  - SA 2025/26: `https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/`
- [ ] **Step 3:** Confirm each bracket value in the table below against the source. If a value disagrees, update the table inline AND note the source URL in the commit message.

**US 2025 — single filer federal income tax brackets** (verify):

| Up to | Rate |
|---|---|
| $11,925 | 10% |
| $48,475 | 12% |
| $103,350 | 22% |
| $197,300 | 24% |
| $250,525 | 32% |
| $626,350 | 35% |
| ∞ | 37% |

Standard deduction (single): $15,000. FICA SS: 6.2% on first $176,100. Medicare: 1.45% + 0.9% over $200,000.

**UK 2025/26 — income tax + NI:**

- Personal allowance: £12,570 (frozen). Taper: –£1 per £2 over £100,000.
- Basic 20%: PA → PA + £37,700 (i.e. up to £50,270).
- Higher 40%: £50,271 – £125,140.
- Additional 45%: £125,141+.
- NI Class 1 employee: 8% on £12,570 – £50,270, 2% above.

**SA 2025/26 — SARS individual brackets:**

| Taxable income | Rate | Base |
|---|---|---|
| R0 – R237,100 | 18% | R0 |
| R237,101 – R370,500 | 26% | R42,678 |
| R370,501 – R512,800 | 31% | R77,362 |
| R512,801 – R673,000 | 36% | R121,475 |
| R673,001 – R857,900 | 39% | R179,147 |
| R857,901 – R1,817,000 | 41% | R251,258 |
| R1,817,001+ | 45% | R644,489 |

Primary rebate: R17,235. Secondary (65+): +R9,444. Tertiary (75+): +R3,145. UIF: 1% capped at R177.12/month (R2,125.44/yr).

- [ ] **Step 4:** **If any 2025/26 figure cannot be verified within the session, abort the bracket refresh and fall back to the 2024/25 constants in `take-home-pay/index.html`. Update the page title/copy to say `2024/25` and add a note to the FAQ pointing to the source.** Consistency between this page and `take-home-pay/` is more important than year recency.

### Task 2.2: Create directory and file

- [ ] **Step 1:** Create `C:\FIN_CALC_SITE\Finance_Calculator_Hub\take-home-pay-comparison\`.
- [ ] **Step 2:** Create `take-home-pay-comparison/index.html` from the Phase 0 template with substitutions from Tasks 2.3–2.7.

### Task 2.3: Head metadata values

- `{{TITLE}}` = `Take-Home Pay Comparison: USA vs UK vs South Africa | FinCalcHub`
- `{{DESCRIPTION}}` = `Compare net salary across the USA, UK, and South Africa side-by-side at the same gross income. Free, no signup. Updated for 2025/2026 tax brackets.`
- `{{CANONICAL}}` = `https://finncalc.com/take-home-pay-comparison/`
- `{{BREADCRUMB_LEAF}}` = `Take-Home Pay Comparison`
- `{{HERO_H1}}` = `Take-Home Pay Comparison: USA vs UK vs South Africa`
- `{{HERO_SUBTITLE}}` = `Enter one salary figure. See what you'd actually keep in each country after income tax, payroll deductions, and surcharges. 2025/2026 tax year.`
- `{{QUICK_ANSWER_Q}}` = `How does take-home pay differ between the USA, UK, and South Africa?`
- `{{QUICK_ANSWER_A}}` = `At the same gross salary (treating the number as $X, £X, or RX in each country's own currency), South Africa typically keeps the most thanks to lower effective rates at middle incomes; the UK keeps the least at high incomes due to the 60% effective rate between £100k and £125k from the personal-allowance taper; the USA sits in the middle, but state tax can swing it by 10+ percentage points. This calculator shows the exact split.`

### Task 2.4: JSON-LD blocks

- [ ] **Step 1:** `{{WEBAPPLICATION_JSON_LD}}`:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"Take-Home Pay Comparison (USA vs UK vs South Africa)","description":"Compare net salary across the USA, UK, and South Africa at the same gross income, using 2025/2026 tax brackets.","url":"https://finncalc.com/take-home-pay-comparison/","applicationCategory":"FinanceApplication","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}
</script>
```

- [ ] **Step 2:** `{{BREADCRUMB_JSON_LD}}`:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://finncalc.com/"},{"@type":"ListItem","position":2,"name":"Take-Home Pay Comparison","item":"https://finncalc.com/take-home-pay-comparison/"}]}
</script>
```

- [ ] **Step 3:** `{{FAQ_JSON_LD}}` — 6 Q&As whose answer text must match Task 2.7's FAQ HTML verbatim:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"How can I compare salaries across countries?","acceptedAnswer":{"@type":"Answer","text":"This tool treats one input number as if it were the gross salary in each country's own currency — so 100,000 means $100,000 in the USA, £100,000 in the UK, and R100,000 in South Africa. It does NOT convert with live exchange rates. This is the only honest comparison without an FX assumption — if you want a converted comparison, switch the display currency above."}},
    {"@type":"Question","name":"Why is take-home pay so different between the US, UK, and South Africa?","acceptedAnswer":{"@type":"Answer","text":"Each country has different tax-free thresholds, marginal rates, payroll deductions, and rebates. The USA layers federal + state + FICA. The UK layers income tax + National Insurance + a taper that creates a 60% marginal band. South Africa layers income tax + UIF + a primary rebate that wipes out tax at low incomes."}},
    {"@type":"Question","name":"Does this calculator account for state taxes or city taxes?","acceptedAnswer":{"@type":"Answer","text":"No. The USA figure uses federal tax plus FICA only. For state-level detail, use our main Take-Home Pay calculator which lets you select your state. City taxes (e.g. NYC, San Francisco) are not modelled."}},
    {"@type":"Question","name":"What about health insurance, NHS, and medical aid?","acceptedAnswer":{"@type":"Answer","text":"Take-home pay is what lands in your bank account after mandatory payroll deductions. Health insurance (USA), NHS contributions (UK — funded from general taxation), and medical aid (SA — typically private and post-tax) are not deducted from gross at the payroll level in a comparable way, so they are excluded here. Real disposable income comparisons require adjusting for these separately."}},
    {"@type":"Question","name":"Are these 2025/2026 tax brackets?","acceptedAnswer":{"@type":"Answer","text":"Yes. US figures use 2025 federal brackets. UK figures use 2025/26 income tax and National Insurance bands. South Africa figures use SARS 2025/26 tables. See our main per-country calculators for the full breakdown."}},
    {"@type":"Question","name":"Can I compare two specific states or cities?","acceptedAnswer":{"@type":"Answer","text":"Not on this page. Use our Take-Home Pay calculator and switch the region toggle to USA, then choose a state. We compare countries here, not sub-regions."}}
  ]
}
</script>
```

### Task 2.5: Form HTML

- [ ] **Step 1:** Substitute `{{REGION_BAR_HTML}}` with **empty string** (this is a 3-region comparison page; no toggle).
- [ ] **Step 2:** Substitute `{{FORM_HTML}}`:

```html
<div class="form-group">
  <label>Gross Annual Salary</label>
  <input type="number" id="gross" value="100000" min="0" placeholder="100000" oninput="calculate()" inputmode="decimal">
  <span class="hint">Treated as $X in USA, £X in UK, R X in South Africa.</span>
</div>

<div class="form-group">
  <label>Filing Status (USA)</label>
  <select id="filingStatus" onchange="calculate()">
    <option value="single" selected>Single</option>
    <option value="married">Married, filing jointly</option>
    <option value="hoh">Head of household</option>
  </select>
</div>
```

### Task 2.6: Results HTML — 3-column comparison table

- [ ] **Step 1:** Substitute `{{RESULTS_HTML}}`:

```html
<div class="results-title">Your Comparison</div>
<div style="overflow-x:auto">
  <table class="breakdown-table" style="margin-top:8px">
    <thead>
      <tr>
        <th>Country</th>
        <th class="td-right">Gross</th>
        <th class="td-right">Income Tax</th>
        <th class="td-right">Payroll (FICA/NI/UIF)</th>
        <th class="td-right">Total Deductions</th>
        <th class="td-right">Annual Net</th>
        <th class="td-right">Monthly Net</th>
        <th class="td-right">Effective Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>🇺🇸 USA</td>
        <td class="td-right" id="usa-gross">$0</td>
        <td class="td-right" id="usa-tax">$0</td>
        <td class="td-right" id="usa-fica">$0</td>
        <td class="td-right" id="usa-total">$0</td>
        <td class="td-right positive" id="usa-net">$0</td>
        <td class="td-right" id="usa-month">$0</td>
        <td class="td-right" id="usa-eff">0%</td>
      </tr>
      <tr><td>🇬🇧 UK</td>
        <td class="td-right" id="uk-gross">£0</td>
        <td class="td-right" id="uk-tax">£0</td>
        <td class="td-right" id="uk-fica">£0</td>
        <td class="td-right" id="uk-total">£0</td>
        <td class="td-right positive" id="uk-net">£0</td>
        <td class="td-right" id="uk-month">£0</td>
        <td class="td-right" id="uk-eff">0%</td>
      </tr>
      <tr><td>🇿🇦 South Africa</td>
        <td class="td-right" id="sa-gross">R0</td>
        <td class="td-right" id="sa-tax">R0</td>
        <td class="td-right" id="sa-fica">R0</td>
        <td class="td-right" id="sa-total">R0</td>
        <td class="td-right positive" id="sa-net">R0</td>
        <td class="td-right" id="sa-month">R0</td>
        <td class="td-right" id="sa-eff">0%</td>
      </tr>
    </tbody>
  </table>
</div>

<p class="hint" style="margin-top:12px">Each column uses the country's own currency. The number you entered is treated as the gross salary in that currency — there is no FX conversion.</p>
```

### Task 2.7: Calc JS

- [ ] **Step 1:** Substitute `{{CALC_JS}}`. This is large because it inlines three independent tax-bracket calculations. Read every line carefully before pasting.

```js
function fmt(value, cur) {
  var symbols = { USD: '$', GBP: '£', ZAR: 'R' };
  var locales = { USD: 'en-US', GBP: 'en-GB', ZAR: 'en-ZA' };
  var sym = symbols[cur] || '$';
  var loc = locales[cur] || 'en-US';
  var abs = Math.abs(Math.round(value));
  return (value < 0 ? '-' : '') + sym + abs.toLocaleString(loc);
}
function pct(value) { return (Math.round(value * 10) / 10) + '%'; }

// ─── USA (2025 federal, no state) ───
function calcUSA(gross, filing) {
  var stdDed  = {single:15000, married:30000, hoh:22500}[filing] || 15000;
  var fedBase = Math.max(0, gross - stdDed);
  var brackets = {
    single:  [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]],
    married: [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]],
    hoh:     [[17000,0.10],[64850,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]]
  };
  var bk = brackets[filing] || brackets.single;
  var fedTax = 0, prev = 0;
  for (var i = 0; i < bk.length; i++) {
    var cap = bk[i][0], rate = bk[i][1];
    if (fedBase <= prev) break;
    fedTax += Math.min(fedBase - prev, cap - prev) * rate;
    prev = cap;
  }
  var ssCap = 176100;
  var ssTax = Math.min(gross, ssCap) * 0.062;
  var medTax = gross * 0.0145 + Math.max(0, gross - 200000) * 0.009;
  var fica = ssTax + medTax;
  var total = fedTax + fica;
  return { gross: gross, tax: fedTax, fica: fica, total: total, net: gross - total };
}

// ─── UK (2025/26) ───
function calcUK(gross) {
  var pa = 12570;
  if (gross > 100000) pa = Math.max(0, pa - (gross - 100000) / 2);
  var taxable = Math.max(0, gross - pa);
  var basic      = Math.min(taxable, 37700);
  var higherCap  = 125140 - 12570 - 37700; // = 74870
  var higher     = Math.min(Math.max(taxable - 37700, 0), higherCap);
  var additional = Math.max(taxable - 37700 - higherCap, 0);
  var incomeTax  = basic * 0.20 + higher * 0.40 + additional * 0.45;
  var ni = 0;
  if (gross > 12570) {
    ni += (Math.min(gross, 50270) - 12570) * 0.08;
    if (gross > 50270) ni += (gross - 50270) * 0.02;
  }
  var total = incomeTax + ni;
  return { gross: gross, tax: incomeTax, fica: ni, total: total, net: gross - total };
}

// ─── SA (2025/26, age <65, no RA, no medical) ───
function calcSA(gross) {
  var bk = [
    [237100,  0.18, 0],
    [370500,  0.26, 42678],
    [512800,  0.31, 77362],
    [673000,  0.36, 121475],
    [857900,  0.39, 179147],
    [1817000, 0.41, 251258],
    [Infinity,0.45, 644489]
  ];
  var grossTax = 0;
  for (var i = 0; i < bk.length; i++) {
    if (gross <= bk[i][0]) {
      var lower = i === 0 ? 0 : bk[i-1][0];
      grossTax = bk[i][2] + (gross - lower) * bk[i][1];
      break;
    }
  }
  var rebate = 17235;
  var incomeTax = Math.max(0, grossTax - rebate);
  var uif = Math.min(gross * 0.01, 2125.44);
  var total = incomeTax + uif;
  return { gross: gross, tax: incomeTax, fica: uif, total: total, net: gross - total };
}

function calculate() {
  var gross  = parseFloat(document.getElementById('gross').value) || 0;
  var filing = document.getElementById('filingStatus').value;

  var us = calcUSA(gross, filing);
  var uk = calcUK(gross);
  var sa = calcSA(gross);

  function fill(prefix, r, cur) {
    document.getElementById(prefix + '-gross').textContent = fmt(r.gross, cur);
    document.getElementById(prefix + '-tax').textContent   = fmt(r.tax,   cur);
    document.getElementById(prefix + '-fica').textContent  = fmt(r.fica,  cur);
    document.getElementById(prefix + '-total').textContent = fmt(r.total, cur);
    document.getElementById(prefix + '-net').textContent   = fmt(r.net,   cur);
    document.getElementById(prefix + '-month').textContent = fmt(r.net / 12, cur);
    document.getElementById(prefix + '-eff').textContent   = pct(gross > 0 ? (r.total / gross) * 100 : 0);
  }
  fill('usa', us, 'USD');
  fill('uk',  uk, 'GBP');
  fill('sa',  sa, 'ZAR');

  document.getElementById('results').classList.add('show');
}

document.addEventListener('DOMContentLoaded', function() { calculate(); });
```

### Task 2.8: FAQ HTML, Related cards, Blog cards

- [ ] **Step 1:** `{{FAQ_HTML}}` — answer text matches Task 2.4 schema verbatim:

```html
<div class="faq-item">
  <div class="faq-q">How can I compare salaries across countries?</div>
  <div class="faq-a">This tool treats one input number as if it were the gross salary in each country's own currency — so 100,000 means $100,000 in the USA, £100,000 in the UK, and R100,000 in South Africa. It does NOT convert with live exchange rates. This is the only honest comparison without an FX assumption — if you want a converted comparison, switch the display currency above.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Why is take-home pay so different between the US, UK, and South Africa?</div>
  <div class="faq-a">Each country has different tax-free thresholds, marginal rates, payroll deductions, and rebates. The USA layers federal + state + FICA. The UK layers income tax + National Insurance + a taper that creates a 60% marginal band. South Africa layers income tax + UIF + a primary rebate that wipes out tax at low incomes.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Does this calculator account for state taxes or city taxes?</div>
  <div class="faq-a">No. The USA figure uses federal tax plus FICA only. For state-level detail, use our main Take-Home Pay calculator which lets you select your state. City taxes (e.g. NYC, San Francisco) are not modelled.</div>
</div>
<div class="faq-item">
  <div class="faq-q">What about health insurance, NHS, and medical aid?</div>
  <div class="faq-a">Take-home pay is what lands in your bank account after mandatory payroll deductions. Health insurance (USA), NHS contributions (UK — funded from general taxation), and medical aid (SA — typically private and post-tax) are not deducted from gross at the payroll level in a comparable way, so they are excluded here. Real disposable income comparisons require adjusting for these separately.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Are these 2025/2026 tax brackets?</div>
  <div class="faq-a">Yes. US figures use 2025 federal brackets. UK figures use 2025/26 income tax and National Insurance bands. South Africa figures use SARS 2025/26 tables. See our main per-country calculators for the full breakdown.</div>
</div>
<div class="faq-item">
  <div class="faq-q">Can I compare two specific states or cities?</div>
  <div class="faq-a">Not on this page. Use our Take-Home Pay calculator and switch the region toggle to USA, then choose a state. We compare countries here, not sub-regions.</div>
</div>
```

- [ ] **Step 2:** `{{RELATED_CARDS_HTML}}`:

```html
<a href="/take-home-pay/" class="related-card">💸 Take-Home Pay (per country)</a>
<a href="/sa-tax-calculator/" class="related-card">🇿🇦 SA Tax Calculator</a>
<a href="/retirement-savings/" class="related-card">🏖️ Retirement Savings</a>
<a href="/compound-interest/" class="related-card">📈 Compound Interest</a>
```

- [ ] **Step 3:** `{{BLOG_CARDS_HTML}}`:

```html
<a href="/blog/salary-after-tax/" class="related-card">💵 Salary After Tax — UK vs US vs SA</a>
<a href="/blog/uk-personal-allowance-2024-25/" class="related-card">🇬🇧 UK Personal Allowance Explained</a>
<a href="/blog/south-africa-tax-guide-2024/" class="related-card">🇿🇦 South Africa Tax Guide</a>
```

### Task 2.9: Verification — math

Hand-check at three salaries before commit. The acceptable error is ±0.5% of the computed value (rounding tolerance).

- [ ] **Step 1:** Test case A — gross 50,000, single.
  - USA: stdDed 15,000 → fedBase 35,000. Tax in brackets: 11,925×10% = 1,192.50 + (35,000 – 11,925)×12% = 2,769 → fedTax ≈ 3,961.50. SS = 50,000×6.2% = 3,100. Medicare = 50,000×1.45% = 725. FICA ≈ 3,825. Total ≈ 7,786.50. Net ≈ $42,213.
  - UK: PA 12,570, taxable 37,430. All in basic 20% (taxable < 37,700). Income tax = 7,486. NI = (50,000 – 12,570)×8% = 2,994.40. Total = 10,480.40. Net ≈ £39,520.
  - SA: gross 50,000 → falls in band 1 (R0–R237,100) at 18%. grossTax = 50,000×18% = 9,000. Rebate 17,235 → incomeTax = 0 (capped at zero). UIF = min(500, 2125.44) = 500. Net ≈ R49,500.
  - Confirm the page shows these (within ±£/R/$ 5 rounding).
- [ ] **Step 2:** Test case B — gross 100,000, single.
  - USA: stdDed 15,000 → fedBase 85,000. fedTax = 11,925×10% + (48,475–11,925)×12% + (85,000–48,475)×22% = 1,192.50 + 4,386 + 8,035.50 = ~13,614. FICA = 100,000×6.2% + 100,000×1.45% = 7,650. Total ≈ 21,264. Net ≈ $78,736.
  - UK: PA full at 12,570 (gross = 100k boundary, no taper). Taxable 87,430. Basic = 37,700×20% = 7,540. Higher = (87,430 – 37,700)×40% = 19,892. IncomeTax ≈ 27,432. NI = (50,270 – 12,570)×8% + (100,000 – 50,270)×2% = 3,016 + 994.60 = 4,010.60. Total ≈ 31,443. Net ≈ £68,557.
  - SA: 100k → band 1 (R0–R237,100). grossTax = 18,000. Rebate 17,235 → incomeTax = 765. UIF = 1,000 (capped — wait, 100,000×1% = 1,000, but UIF monthly cap is R177.12/mo or R2,125.44/yr — so UIF = 1,000 since under cap). Total = 1,765. Net ≈ R98,235.
- [ ] **Step 3:** Test case C — gross 200,000, single.
  - USA: stdDed 15,000 → fedBase 185,000. fedTax through brackets to 24%. Compute by hand or against a US tax site (e.g. SmartAsset 2025) and confirm match.
  - UK: gross 200k → triggers full PA taper (PA = 0). Taxable = 200,000. Confirm income tax + NI on the page matches a hand-calc or the UK gov.uk income-tax tool.
  - SA: gross 200k → still band 1 (R0–R237,100). grossTax = 36,000. Less rebate 17,235 → incomeTax = 18,765. UIF = 2,000 (still under cap). Total = 20,765. Net = R179,235.
- [ ] **Step 4:** If any test fails > 1% of expected: stop. Diff the bracket constants in the JS against Task 2.1. Common errors: off-by-one in the SA base column, wrong UK higher-cap calc, missing $200k Medicare extra. Fix and re-test all three.

### Task 2.10: Verification — schema, accessibility, mobile

- [ ] **Step 1:** Rich Results Test, HTML validator, Lighthouse — same gates as Task 1.9.
- [ ] **Step 2:** Mobile layout check — open DevTools, device toolbar, set to "iPhone SE" (375px). The 8-column results table must scroll horizontally (the `<div style="overflow-x:auto">` wrapper enables this). Confirm no content overflow on the rest of the page.
- [ ] **Step 3:** Confirm the page works without JavaScript regressions: hit Refresh, watch for console errors, confirm default values populate the table on load.

### Task 2.11: Update sitemap.xml

- [ ] **Step 1:** Add to `sitemap.xml`:

```xml
  <url>
    <loc>https://finncalc.com/take-home-pay-comparison/</loc>
    <lastmod>2026-05-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
```

(Use commit date for `lastmod`.)

### Task 2.12: Internal link from `take-home-pay/index.html`

- [ ] **Step 1:** Open `take-home-pay/index.html`. Find the `.subtitle` `<p>` (just after `<h1>Take-Home Pay Calculator</h1>` or the equivalent).
- [ ] **Step 2:** Immediately after that subtitle, insert:

```html
<p class="hint" style="margin-top:8px"><a href="/take-home-pay-comparison/">🌍 Compare across USA, UK, and South Africa →</a></p>
```

### Task 2.13: Commit

- [ ] **Step 1:** Stage:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" add take-home-pay-comparison/index.html take-home-pay/index.html sitemap.xml
```

- [ ] **Step 2:** Verify staging:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" status --short
```

Expected:

```
A  take-home-pay-comparison/index.html
M  take-home-pay/index.html
M  sitemap.xml
```

- [ ] **Step 3:** Commit:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" commit -m "Wave 6: add /take-home-pay-comparison/ (3-region side-by-side, 2025/26)"
```

If Task 2.1 fell back to 2024/25 constants, change the commit message to `(2024/25)` accordingly.

---

## Phase 3 — `/sa-tax-calculator/` (commit 3)

### Task 3.1: Bracket reuse

The SA tax math is identical to the SA branch of `take-home-pay/index.html`. If Phase 2 updated SA brackets to 2025/26, reuse those constants here. If Phase 2 fell back to 2024/25, reuse those — consistency wins.

- [ ] **Step 1:** Re-open `take-home-pay-comparison/index.html` from Phase 2. Locate the `calcSA` function. Copy the bracket array (`bk = [...]`).

### Task 3.2: Create directory and file

- [ ] **Step 1:** Create `C:\FIN_CALC_SITE\Finance_Calculator_Hub\sa-tax-calculator\`.
- [ ] **Step 2:** Create `sa-tax-calculator/index.html` from the Phase 0 template.

### Task 3.3: Head metadata

- `{{TITLE}}` = `South Africa Tax Calculator 2025/26 (PAYE + UIF) | FinCalcHub`
- `{{DESCRIPTION}}` = `Free South Africa income tax calculator. SARS 2025/26 brackets, PAYE, UIF, medical-aid credits, retirement-annuity deduction. Monthly & annual.`
- `{{CANONICAL}}` = `https://finncalc.com/sa-tax-calculator/`
- `{{BREADCRUMB_LEAF}}` = `SA Tax Calculator`
- `{{HERO_H1}}` = `South Africa Tax Calculator (PAYE + UIF)`
- `{{HERO_SUBTITLE}}` = `Work out your South African income tax for the 2025/26 tax year. Includes PAYE, UIF, medical scheme tax credits, retirement-annuity deductions, and SARS rebates for age 65+.`
- `{{QUICK_ANSWER_Q}}` = `How is income tax calculated in South Africa?`
- `{{QUICK_ANSWER_A}}` = `SARS calculates income tax in seven progressive bands. Your gross salary is reduced by deductible retirement-annuity contributions (up to 27.5% or R350,000). The taxable amount is then taxed by band: 18% on the first R237,100, rising to 45% above R1,817,000. The primary rebate (R17,235) and medical-aid tax credits are subtracted from the gross tax. UIF of 1% (capped at R177.12 per month) is also deducted from your gross.`

### Task 3.4: JSON-LD blocks

- [ ] **Step 1:** `{{WEBAPPLICATION_JSON_LD}}`:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"South Africa Tax Calculator","description":"Free South African PAYE and UIF calculator with SARS 2025/26 brackets, medical-aid credits, RA deduction, and age-based rebates.","url":"https://finncalc.com/sa-tax-calculator/","applicationCategory":"FinanceApplication","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"ZAR"}}
</script>
```

- [ ] **Step 2:** `{{BREADCRUMB_JSON_LD}}`:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://finncalc.com/"},{"@type":"ListItem","position":2,"name":"South Africa Tax Calculator","item":"https://finncalc.com/sa-tax-calculator/"}]}
</script>
```

- [ ] **Step 3:** `{{FAQ_JSON_LD}}` — answers must match Task 3.7 HTML verbatim:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"What is PAYE in South Africa?","acceptedAnswer":{"@type":"Answer","text":"PAYE (Pay As You Earn) is the income tax deducted from an employee's salary by their employer and paid to SARS each month. The amount is determined by SARS's annual tax tables and reduced by personal rebates and medical scheme tax credits."}},
    {"@type":"Question","name":"How is South African income tax calculated?","acceptedAnswer":{"@type":"Answer","text":"SARS uses seven progressive bands. The first R237,100 of taxable income is taxed at 18%; each subsequent band has a higher marginal rate up to 45% on income above R1,817,000. Your taxable income is gross minus deductible retirement contributions. After the bracketed tax is calculated, the primary rebate (R17,235) plus age-based rebates and medical-aid credits are subtracted."}},
    {"@type":"Question","name":"What is UIF and who pays it?","acceptedAnswer":{"@type":"Answer","text":"UIF (Unemployment Insurance Fund) is a 1% payroll deduction on gross salary, capped at R177.12 per month (R2,125.44 per year). Employers contribute another 1%. The fund pays short-term benefits for unemployment, illness, and maternity leave."}},
    {"@type":"Question","name":"How much tax do I pay on R500,000 or R1,000,000 in South Africa?","acceptedAnswer":{"@type":"Answer","text":"On R500,000 (no RA, under 65, no dependants): roughly R104,800 income tax and R2,125 UIF, leaving about R393,000 net. On R1,000,000: roughly R277,000 income tax and R2,125 UIF, leaving about R721,000 net. Plug your own figures into the calculator for an exact result."}},
    {"@type":"Question","name":"How does a Retirement Annuity reduce my tax?","acceptedAnswer":{"@type":"Answer","text":"Retirement Annuity (RA) contributions are deductible up to the lesser of 27.5% of your taxable income or R350,000 per tax year. Contributing reduces your taxable income, which reduces both the marginal tax you pay and the average effective rate. This is one of the most powerful legal tax-reduction tools for individuals in South Africa."}},
    {"@type":"Question","name":"What are SARS medical aid tax credits?","acceptedAnswer":{"@type":"Answer","text":"The medical scheme fees tax credit is R364 per month for the main member, R364 per month for the first dependant, and R246 per month for each additional dependant. These credits reduce your tax bill directly (not your taxable income), so the value is the same regardless of your marginal rate."}}
  ]
}
</script>
```

### Task 3.5: Region bar and form

- [ ] **Step 1:** Substitute `{{REGION_BAR_HTML}}` with **empty string** (SA-only page).
- [ ] **Step 2:** Substitute `{{FORM_HTML}}`:

```html
<div class="form-row">
  <div class="form-group">
    <label>Gross Salary (R)</label>
    <input type="number" id="gross" value="500000" min="0" placeholder="500000" oninput="calculate()" inputmode="decimal">
  </div>
  <div class="form-group">
    <label>Pay Frequency</label>
    <select id="payFreq" onchange="calculate()">
      <option value="12" selected>Annual</option>
      <option value="1">Monthly</option>
    </select>
  </div>
</div>

<div class="form-row">
  <div class="form-group">
    <label>Age</label>
    <select id="ageSlot" onchange="calculate()">
      <option value="1" selected>Under 65</option>
      <option value="2">65 – 74</option>
      <option value="3">75 or older</option>
    </select>
  </div>
  <div class="form-group">
    <label>Medical Aid Members (incl. you)</label>
    <select id="medMem" onchange="calculate()">
      <option value="0">None</option>
      <option value="1" selected>1 (just me)</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 or more</option>
    </select>
  </div>
</div>

<div class="form-group">
  <label>Retirement Annuity Contribution per Year (R)</label>
  <input type="number" id="raAnnual" value="0" min="0" placeholder="0" oninput="calculate()" inputmode="decimal">
  <span class="hint">Tax-deductible up to 27.5% of income or R350,000, whichever is lower.</span>
</div>
```

> **Note on form behaviour:** If pay frequency = Monthly, the user is entering a monthly figure; we multiply by 12 internally and display the annual + monthly breakdown. Calc JS handles this in Task 3.7.

### Task 3.6: Results HTML

- [ ] **Step 1:** Substitute `{{RESULTS_HTML}}`:

```html
<div class="results-title">Your Results</div>
<div class="result-grid">
  <div class="result-item">
    <div class="result-value positive" id="r-net-annual">R0</div>
    <div class="result-label">Annual Take-Home</div>
  </div>
  <div class="result-item">
    <div class="result-value" id="r-net-monthly">R0</div>
    <div class="result-label">Monthly Take-Home</div>
  </div>
  <div class="result-item">
    <div class="result-value" id="r-tax-annual">R0</div>
    <div class="result-label">Annual PAYE</div>
  </div>
  <div class="result-item">
    <div class="result-value" id="r-eff">0%</div>
    <div class="result-label">Effective Tax Rate</div>
  </div>
</div>

<hr class="results-divider">

<div class="breakdown-title">Breakdown</div>
<div style="overflow-x:auto">
  <table class="breakdown-table" id="breakdown-table">
    <thead>
      <tr><th>Item</th><th class="td-right">Annual</th><th class="td-right">Monthly</th></tr>
    </thead>
    <tbody id="breakdown-body"></tbody>
  </table>
</div>
```

### Task 3.7: Calc JS

- [ ] **Step 1:** Substitute `{{CALC_JS}}`:

```js
function fmtR(value) {
  var abs = Math.abs(Math.round(value));
  return (value < 0 ? '-' : '') + 'R' + abs.toLocaleString('en-ZA');
}

function calculate() {
  var input    = parseFloat(document.getElementById('gross').value) || 0;
  var freq     = +document.getElementById('payFreq').value || 12;
  var ageSlot  = +document.getElementById('ageSlot').value || 1;
  var medMem   = +document.getElementById('medMem').value || 0;
  var raAnnual = parseFloat(document.getElementById('raAnnual').value) || 0;

  // Normalise to annual gross
  var gross = freq === 1 ? input * 12 : input;

  // RA deduction cap
  var raDed = Math.min(raAnnual, gross * 0.275, 350000);
  var taxable = Math.max(0, gross - raDed);

  // 2025/26 SARS brackets — [upper, rate, base]
  var bk = [
    [237100,  0.18, 0],
    [370500,  0.26, 42678],
    [512800,  0.31, 77362],
    [673000,  0.36, 121475],
    [857900,  0.39, 179147],
    [1817000, 0.41, 251258],
    [Infinity,0.45, 644489]
  ];
  var grossTax = 0;
  for (var i = 0; i < bk.length; i++) {
    if (taxable <= bk[i][0]) {
      var lower = i === 0 ? 0 : bk[i-1][0];
      grossTax = bk[i][2] + (taxable - lower) * bk[i][1];
      break;
    }
  }

  // Rebates: primary + age-based
  var primary = 17235;
  var secondary = ageSlot >= 2 ? 9444 : 0;
  var tertiary  = ageSlot >= 3 ? 3145 : 0;
  var rebate = primary + secondary + tertiary;

  // Medical scheme tax credit (monthly figures × 12)
  var medMonthly = 0;
  if (medMem >= 1) medMonthly += 364;
  if (medMem >= 2) medMonthly += 364;
  if (medMem > 2)  medMonthly += (medMem - 2) * 246;
  var medCredit = medMonthly * 12;

  var incomeTax = Math.max(0, grossTax - rebate - medCredit);

  // UIF
  var uif = Math.min(gross * 0.01, 2125.44);

  var totalDed = incomeTax + uif + raDed;
  var takeHome = gross - totalDed;
  var effRate  = gross > 0 ? (incomeTax / gross) * 100 : 0;

  document.getElementById('r-net-annual').textContent  = fmtR(takeHome);
  document.getElementById('r-net-monthly').textContent = fmtR(takeHome / 12);
  document.getElementById('r-tax-annual').textContent  = fmtR(incomeTax);
  document.getElementById('r-eff').textContent         = (Math.round(effRate * 10) / 10) + '%';

  var rows = [
    ['Gross Salary',                gross,         null],
    ['RA Deduction',                raDed,         null],
    ['Taxable Income',              taxable,       null],
    ['Income Tax (before rebates)', grossTax,      null],
    ['Primary Rebate (+ age)',      rebate,        null],
    ['Medical Aid Tax Credit',      medCredit,     null],
    ['Income Tax (after rebates)',  incomeTax,     null],
    ['UIF (1% capped)',             uif,           null],
    ['Total Deductions',            totalDed,      null],
    ['Take-Home Pay',               takeHome,      null]
  ];
  var tbody = document.getElementById('breakdown-body');
  tbody.innerHTML = rows.map(function(r) {
    return '<tr><td>' + r[0] + '</td>' +
           '<td class="td-right">' + fmtR(r[1])      + '</td>' +
           '<td class="td-right">' + fmtR(r[1] / 12) + '</td></tr>';
  }).join('');

  document.getElementById('results').classList.add('show');
}

document.addEventListener('DOMContentLoaded', function() { calculate(); });
```

### Task 3.8: FAQ HTML, Related cards, Blog cards

- [ ] **Step 1:** `{{FAQ_HTML}}` — match Task 3.4 schema verbatim:

```html
<div class="faq-item">
  <div class="faq-q">What is PAYE in South Africa?</div>
  <div class="faq-a">PAYE (Pay As You Earn) is the income tax deducted from an employee's salary by their employer and paid to SARS each month. The amount is determined by SARS's annual tax tables and reduced by personal rebates and medical scheme tax credits.</div>
</div>
<div class="faq-item">
  <div class="faq-q">How is South African income tax calculated?</div>
  <div class="faq-a">SARS uses seven progressive bands. The first R237,100 of taxable income is taxed at 18%; each subsequent band has a higher marginal rate up to 45% on income above R1,817,000. Your taxable income is gross minus deductible retirement contributions. After the bracketed tax is calculated, the primary rebate (R17,235) plus age-based rebates and medical-aid credits are subtracted.</div>
</div>
<div class="faq-item">
  <div class="faq-q">What is UIF and who pays it?</div>
  <div class="faq-a">UIF (Unemployment Insurance Fund) is a 1% payroll deduction on gross salary, capped at R177.12 per month (R2,125.44 per year). Employers contribute another 1%. The fund pays short-term benefits for unemployment, illness, and maternity leave.</div>
</div>
<div class="faq-item">
  <div class="faq-q">How much tax do I pay on R500,000 or R1,000,000 in South Africa?</div>
  <div class="faq-a">On R500,000 (no RA, under 65, no dependants): roughly R104,800 income tax and R2,125 UIF, leaving about R393,000 net. On R1,000,000: roughly R277,000 income tax and R2,125 UIF, leaving about R721,000 net. Plug your own figures into the calculator for an exact result.</div>
</div>
<div class="faq-item">
  <div class="faq-q">How does a Retirement Annuity reduce my tax?</div>
  <div class="faq-a">Retirement Annuity (RA) contributions are deductible up to the lesser of 27.5% of your taxable income or R350,000 per tax year. Contributing reduces your taxable income, which reduces both the marginal tax you pay and the average effective rate. This is one of the most powerful legal tax-reduction tools for individuals in South Africa.</div>
</div>
<div class="faq-item">
  <div class="faq-q">What are SARS medical aid tax credits?</div>
  <div class="faq-a">The medical scheme fees tax credit is R364 per month for the main member, R364 per month for the first dependant, and R246 per month for each additional dependant. These credits reduce your tax bill directly (not your taxable income), so the value is the same regardless of your marginal rate.</div>
</div>
```

- [ ] **Step 2:** `{{RELATED_CARDS_HTML}}`:

```html
<a href="/take-home-pay/" class="related-card">💸 Take-Home Pay (multi-region)</a>
<a href="/take-home-pay-comparison/" class="related-card">🌍 Compare USA / UK / SA</a>
<a href="/retirement-savings/" class="related-card">🏖️ Retirement Savings</a>
<a href="/compound-interest/" class="related-card">📈 Compound Interest</a>
```

- [ ] **Step 3:** `{{BLOG_CARDS_HTML}}`:

```html
<a href="/blog/how-much-tax-on-r500000-south-africa/" class="related-card">💰 How Much Tax on R500,000?</a>
<a href="/blog/south-africa-tax-guide-2024/" class="related-card">📘 South Africa Tax Guide</a>
<a href="/blog/what-is-paye-south-africa/" class="related-card">📑 What Is PAYE?</a>
<a href="/blog/retirement-planning-south-africa/" class="related-card">🏖️ Retirement Planning SA</a>
```

### Task 3.9: Verification — math

- [ ] **Step 1:** Test case A — R500,000, under 65, 1 medical member, R0 RA.
  - gross = 500,000. raDed = 0. taxable = 500,000.
  - Band: 500k > 370,500 but ≤ 512,800 → band 3. grossTax = 77,362 + (500,000 – 370,500) × 31% = 77,362 + 40,145 = 117,507.
  - Rebate = 17,235. Med credit = 364×12 = 4,368.
  - incomeTax = max(0, 117,507 – 17,235 – 4,368) = 95,904.
  - UIF = min(500,000 × 1%, 2,125.44) = 2,125.44.
  - Total ded = 95,904 + 2,125.44 + 0 = 98,029.44. Net = R401,970.56.
  - The FAQ answer cites "roughly R104,800 / R393,000 net" — that's for 0 medical members. The page default (1 medical member) shows the slightly higher net. Confirm both interpretations agree by zeroing the medical-aid dropdown — should give incomeTax ≈ 100,272, net ≈ R397,602. Within "roughly" margin.
- [ ] **Step 2:** Test case B — R1,000,000, under 65, 1 medical member, R0 RA.
  - gross = 1,000,000. taxable = 1,000,000.
  - Band 6 (857,900 – 1,817,000): grossTax = 251,258 + (1,000,000 – 857,900) × 41% = 251,258 + 58,261 = 309,519.
  - Rebate 17,235 + med credit 4,368 = 21,603.
  - incomeTax = 287,916. UIF = 2,125.44. Net = R709,958.56.
  - FAQ says "roughly R277,000 / R721,000 net" for zero medical aid. Re-test with medMem=0: incomeTax = 292,284, net = R705,590. Still within "roughly". (FAQ wording is intentionally loose — exact figures are shown by the live calculator.)
- [ ] **Step 3:** Test case C — Monthly entry. Enter R50,000 with payFreq=Monthly → page should treat as gross 600,000/year. taxable = 600,000. Band 4 (512,800 – 673,000): grossTax = 121,475 + (600,000 – 512,800) × 36% = 121,475 + 31,392 = 152,867. Rebate + med = 21,603. incomeTax = 131,264. UIF = 2,125.44. Net annual = R466,610.56, net monthly ≈ R38,884.
- [ ] **Step 4:** Compare R500,000 result against the blog post `blog/how-much-tax-on-r500000-south-africa/`. If the blog uses 2024/25 brackets and this page uses 2025/26, the figures will differ slightly. Either align both, or add a footnote on this page noting the brackets used.
- [ ] **Step 5:** If any test fails > 1%, halt. Diff brackets against Task 2.1 source data, fix, re-test.

### Task 3.10: Verification — schema, accessibility, mobile

Same gates as 1.9 and 2.10. Lighthouse mobile, Rich Results, W3C HTML, keyboard, no console errors.

### Task 3.11: Update sitemap.xml

- [ ] **Step 1:** Add to `sitemap.xml`:

```xml
  <url>
    <loc>https://finncalc.com/sa-tax-calculator/</loc>
    <lastmod>2026-05-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
```

### Task 3.12: Internal link from `take-home-pay/index.html`

- [ ] **Step 1:** Open `take-home-pay/index.html`. Find the SA-region content block (search for `data-region="SA"` or the SA-specific result section).
- [ ] **Step 2:** Within the SA block, add a callout near the top:

```html
<p class="hint" style="margin-top:8px"><a href="/sa-tax-calculator/">🇿🇦 Use our dedicated SA Tax Calculator → </a> (rebates, medical credits, RA, UIF on one focused page).</p>
```

If a similar link from Task 2.12 already exists in the same region block, place this one immediately after it, not as a duplicate.

### Task 3.13: Commit

- [ ] **Step 1:** Stage:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" add sa-tax-calculator/index.html take-home-pay/index.html sitemap.xml
```

- [ ] **Step 2:** Confirm staging:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" status --short
```

Expected:

```
A  sa-tax-calculator/index.html
M  take-home-pay/index.html
M  sitemap.xml
```

- [ ] **Step 3:** Commit:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" commit -m "Wave 6: add /sa-tax-calculator/ (SARS 2025/26 PAYE + UIF, age-based)"
```

---

## Phase 4 — Post-commit verification and push

### Task 4.1: Final repo check

- [ ] **Step 1:** Confirm three new commits sit on top of the spec commit:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" log --oneline -5
```

Expected:

```
<hash> Wave 6: add /sa-tax-calculator/ ...
<hash> Wave 6: add /take-home-pay-comparison/ ...
<hash> Wave 6: add /stamp-duty-calculator/ ...
781c837 Spec: Wave 6 content-gap quick wins ...
d2ef3a5 Wave 5: add /glossary/ — 30 personal-finance terms
```

- [ ] **Step 2:** Confirm sitemap.xml contains all three new URLs:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" grep "stamp-duty-calculator\|take-home-pay-comparison\|sa-tax-calculator" -- sitemap.xml
```

Expected: 3 `<loc>` lines.

- [ ] **Step 3:** Confirm no orphan pages (each new page must have at least one internal link pointing to it from outside its own directory):

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" grep "stamp-duty-calculator" -- ':!stamp-duty-calculator/' ':!sitemap.xml'
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" grep "take-home-pay-comparison" -- ':!take-home-pay-comparison/' ':!sitemap.xml'
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" grep "sa-tax-calculator" -- ':!sa-tax-calculator/' ':!sitemap.xml'
```

Expected: each returns at least one match (the internal links injected in tasks 1.11, 1.12, 2.12, 3.12).

### Task 4.2: Push

- [ ] **Step 1:** Confirm with user before pushing (push triggers Cloudflare deploy + IndexNow ping via the existing GitHub Action). Ask:

> "All three pages committed locally. Push to `origin/main` now? This will trigger Cloudflare deploy and IndexNow submission to Bing/Yandex."

- [ ] **Step 2:** On approval:

```powershell
git -C "C:/FIN_CALC_SITE/Finance_Calculator_Hub" push origin main
```

- [ ] **Step 3:** Watch the GitHub Actions tab for `indexnow.yml` and `lighthouse.yml` runs — both should succeed within 5 minutes. If Lighthouse-CI fails on any of the new pages, the CI threshold is breached and we need to investigate (likely a Performance regression from the new pages).

### Task 4.3: Post-deploy smoke test

- [ ] **Step 1:** Hit each URL in a fresh incognito tab:
  - `https://finncalc.com/stamp-duty-calculator/`
  - `https://finncalc.com/take-home-pay-comparison/`
  - `https://finncalc.com/sa-tax-calculator/`
- [ ] **Step 2:** Confirm: page loads, calculator runs with default inputs, results show, no console errors, ad slot placeholders render.
- [ ] **Step 3:** Manually submit each URL to Google Search Console → URL Inspection → Request Indexing. (IndexNow handles Bing/Yandex.)

### Task 4.4: Memory update

- [ ] **Step 1:** Create `C:\Users\james\.claude\projects\C--FIN-CALC-SITE\memory\project_wave6_quickwins.md`:

```markdown
---
name: project-wave6-quickwins
description: Wave 6 shipped on 2026-05-13 — three new calculators from the content-gap analysis
metadata:
  type: project
---

Wave 6 added three pages to finncalc.com, all driven by `docs/content-gap-analysis.md`:

1. `/stamp-duty-calculator/` — UK SDLT, England + NI only. Covers standard, FTB relief, additional-property surcharge, non-UK-resident surcharge.
2. `/take-home-pay-comparison/` — 3-region (US/UK/SA) side-by-side at the same gross figure (no FX conversion). 2025/26 brackets.
3. `/sa-tax-calculator/` — SA-locked landing page with PAYE + UIF + rebates + medical credits + RA deduction. 2025/26 SARS brackets.

**Why:** Acts on the gap analysis's "Quick wins" section. Glossary (#1) was Wave 5; these three close out the quick-wins list.

**How to apply:** When a future Wave touches tax brackets, treat all four pages (existing `take-home-pay/` + the three new ones) as one cohort. The bracket-refresh follow-up flagged during Wave 6 still needs to be done — `take-home-pay/` still labels figures "2024/25" and the new pages use 2025/26. Either align the older page forward or add an explicit note. See [[project-fincalc-hub]] for the broader site context.
```

- [ ] **Step 2:** Update `C:\Users\james\.claude\projects\C--FIN-CALC-SITE\memory\MEMORY.md` to add the new entry as the second-to-last line:

```
- [Wave 6 quick wins](project_wave6_quickwins.md) — 3 new calculators shipped 2026-05-13 from content-gap-analysis
```

### Task 4.5: Mark tasks complete

- [ ] Mark tasks #2, #3, #4 in TaskList as `completed`.

---

## Self-review against the spec

This plan was checked against `docs/superpowers/specs/2026-05-13-content-gap-quick-wins-design.md` after writing:

- **Spec → Plan coverage:**
  - Page 1 (stamp duty) → Phase 1 (Tasks 1.1–1.13). ✓
  - Page 2 (comparison) → Phase 2 (Tasks 2.1–2.13). ✓
  - Page 3 (SA tax) → Phase 3 (Tasks 3.1–3.13). ✓
  - "Each as isolated commit" → Tasks 1.13 / 2.13 / 3.13. ✓
  - Schema validation gate → 1.9 / 2.10 / 3.10. ✓
  - Math hand-checks → 1.8 / 2.9 / 3.9. ✓
  - Sitemap updates → 1.10 / 2.11 / 3.11. ✓
  - Internal-link injections → 1.11 / 1.12 / 2.12 / 3.12. ✓
  - Memory note → 4.4. ✓
  - IndexNow ping (auto) → 4.2. ✓
  - "FTB above £500k uses standard rates" → handled in Task 1.6 `sdltBands(buyerType, price)` via the `&& price <= 500000` guard. ✓
  - "No PPP / no live FX" → Task 2.5 form has no FX input. ✓
  - "2025/26 brackets with fallback to 2024/25" → Task 2.1 spells out the fallback. ✓
  - "SA page deliberately overlaps with take-home-pay/" → Task 3.12 adds a cross-link both ways. ✓

- **Placeholder scan:** No `TBD`, `TODO`, `implement later`. The token system in Phase 0 (`{{TITLE}}` etc.) is parameter substitution with concrete values supplied in each phase — not the kind of vague placeholder the skill prohibits.

- **Type / identifier consistency:** Element IDs used in the JS match the form HTML in each phase (`price`, `buyerType`, `nonResident` in Phase 1; `gross`, `filingStatus` in Phase 2; `gross`, `payFreq`, `ageSlot`, `medMem`, `raAnnual` in Phase 3). The `calculate()` function name is consistent across all three pages.

- **Scope:** Three pages, one commit each, all in one repo. Single implementation plan is appropriate.
