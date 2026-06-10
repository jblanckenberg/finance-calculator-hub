"""One-shot: insert the refinance-calculator entry into calculators.json.

Mirrors the field set of future-value-calculator. Writes with the file's
existing convention: indent=2, ensure_ascii=True (so non-ASCII is \\uXXXX),
trailing newline. NOT a patcher invocation — direct, idempotent JSON edit.
"""
import json
from pathlib import Path

DATA = Path("_build/data/calculators.json")

entry = {
    "slug": "refinance-calculator",
    "name": "\U0001f3e0 Refinance Calculator",
    "title": "Refinance Calculator: Break-Even + Lifetime Savings",
    "description": (
        "Free refinance calculator. See your monthly savings, break-even point, "
        "and the honest lifetime cost of refinancing — including the term-reset "
        "trap where a lower payment costs you more overall."
    ),
    "h1": "\U0001f3e0 Refinance Calculator",
    "subtitle": (
        "Work out whether refinancing your mortgage actually pays off. Enter your "
        "current loan and a proposed new rate and term to see your monthly saving, "
        "your break-even point (how long the lower payment takes to recoup closing "
        "costs), and the true lifetime cost — because a lower monthly payment "
        "from a fresh, longer term can quietly cost you tens of thousands more."
    ),
    "metaDescription": (
        "Free mortgage refinance calculator. Monthly savings, break-even months, "
        "and honest lifetime savings — with a warning when a lower payment "
        "actually costs more because you reset the loan term. Roll-in vs upfront "
        "closing costs supported."
    ),
    "regions": ["USA"],
    "primaryKeyword": "refinance calculator",
    "schemaWebApp": {
        "@type": "WebApplication",
        "name": "Refinance Calculator",
        "description": (
            "Compare your current mortgage to a proposed refinance: monthly "
            "savings, break-even point, and honest lifetime cost including the "
            "term-reset trap. Supports rolling closing costs into the loan or "
            "paying upfront."
        ),
        "applicationCategory": "FinanceApplication",
    },
    "schemaHowTo": {
        "name": "How to use the Refinance Calculator",
        "totalTime": "PT1M",
        "steps": [
            "Enter your current loan balance, interest rate, and the number of years remaining",
            "Enter the new rate you'd refinance into and the new loan term (10, 15, 20, or 30 years)",
            "Enter your estimated closing costs, then choose to pay them upfront or roll them into the loan",
            "Read off your monthly savings and the break-even point — the months it takes the lower payment to recoup your costs",
            "Check the lifetime savings figure: if it's negative, a lower monthly payment is actually costing you more over the life of the loan",
            "If you see the term-reset warning, try a shorter new term to keep both the rate and the lifetime saving",
        ],
    },
    "faq": [
        {
            "q": "How does refinancing work?",
            "a": (
                "Refinancing replaces your existing mortgage with a new loan, usually to capture a lower "
                "rate, change your term, or pull out equity. The new lender pays off your old balance and "
                "you start payments on the new loan. You re-do underwriting and pay closing costs of "
                "roughly 2–6% of the loan. Crucially, a refinance resets your amortisation clock: refinance "
                "ten years into a 30-year loan back into a new 30-year loan and you're at year one of 30 "
                "again, which can lower the payment while raising the total cost."
            ),
        },
        {
            "q": "What's the break-even point and why does it matter?",
            "a": (
                "The break-even point is how long it takes your monthly savings to recoup the upfront cash "
                "you spent refinancing. Spend $4,000 in closing costs to save $200 a month and you break even "
                "in 20 months — after that the saving is pure benefit. It matters because refinancing only pays "
                "off if you keep the loan past break-even. If you might move or refinance again sooner, you'll "
                "spend more on costs than you recover, so the refinance loses money even with a lower payment."
            ),
        },
        {
            "q": "Should I roll closing costs into the loan or pay upfront?",
            "a": (
                "Paying upfront keeps your balance and total interest lower but requires cash and creates a "
                "break-even period. Rolling costs into the loan means no cash today, but you finance those "
                "costs at the mortgage rate for the full term, raising your balance and payment. For a short "
                "break-even and a rate you'll keep for decades, rolling in is convenient. If you have the cash "
                "and plan to stay, paying upfront is cheaper overall. A no-closing-cost refinance is a third "
                "route: the lender covers costs in exchange for a slightly higher rate."
            ),
        },
        {
            "q": "Does a lower monthly payment always mean I'm saving money?",
            "a": (
                "No — this is the costliest refinancing mistake. A lower payment can come from a lower rate "
                "(genuine saving) or a longer term that stretches the balance over more years (lower payment, "
                "higher total cost). Refinance 8 years into a 30-year loan back into a fresh 30-year loan and "
                "you can pay tens of thousands more in interest, even at a lower rate, because you're now paying "
                "for 38 years instead of 30. This calculator reports lifetime savings with its true sign: if it's "
                "negative, you aren't saving — refinance into a shorter term that matches the years you had left."
            ),
        },
        {
            "q": "What credit score do I need to refinance?",
            "a": (
                "A conventional rate-and-term refinance generally needs a score of at least 620, with the best "
                "rates reserved for 740+. Because the rate you're offered drives whether the refinance pays off, "
                "score matters a lot. Government options are more flexible: an FHA streamline can work in the "
                "500s–580s, and a VA IRRRL has no VA-set minimum (lenders set their own). Lenders also weigh your "
                "debt-to-income ratio (usually under 43–50%), home equity (20%+ avoids PMI on a conventional loan), "
                "and payment history. Check your credit and fix errors before applying."
            ),
        },
        {
            "q": "What's a no-closing-cost refinance?",
            "a": (
                "A no-closing-cost refinance means you don't pay closing costs out of pocket at signing. There's "
                "no free lunch: the lender recovers them by adding them to your balance or, more commonly, by "
                "giving you a higher interest rate — which means a higher payment for the life of the loan. It can "
                "make sense if you're short on cash, if you might move or refinance again within a few years (so "
                "you'd never reach break-even on upfront costs anyway), or if the rate bump is small relative to "
                "your savings. If you'll keep the loan long term and have the cash, paying upfront at the lower "
                "rate is almost always cheaper."
            ),
        },
        {
            "q": "Should I refinance to a shorter term?",
            "a": (
                "Refinancing from a 30-year into a 15- or 20-year term is often the smartest refinance, because "
                "shorter-term loans carry lower rates and you pay interest for fewer years. The trade-off is a "
                "higher monthly payment, since you repay the same balance over less time. If you can afford it, "
                "a shorter term can save a six-figure sum on a large mortgage. It's also the antidote to the "
                "term-reset trap: if you have 22 years left, refinancing into a fresh 30-year loan can cost more "
                "overall even at a lower rate, but refinancing into a 20-year term keeps the lower rate while "
                "shrinking the total cost. Compare the lifetime saving, not just the payment."
            ),
        },
        {
            "q": "How much does refinancing cost?",
            "a": (
                "Closing costs typically run 2–6% of the loan amount — on a $300,000 loan that's roughly $6,000 "
                "to $18,000, though many land toward the lower end. They include the origination/underwriting fee, "
                "appraisal ($300–$700), title search and insurance, credit-report and application fees, recording "
                "fees, and any discount points. You can pay upfront, roll them in, or take a no-closing-cost option "
                "for a higher rate. Ask each lender for a standardised Loan Estimate so you can compare total costs "
                "and APR side by side. A common rule of thumb: investigate refinancing when you can drop your rate "
                "by at least 0.75–1% and you'll stay past the break-even point."
            ),
        },
    ],
    "sources": [
        {
            "url": "https://www.consumerfinance.gov/owning-a-home/",
            "label": "Consumer Financial Protection Bureau — Owning a Home / Refinance Guide",
        },
        {
            "url": "https://www.freddiemac.com/pmms",
            "label": "Freddie Mac — Primary Mortgage Market Survey (PMMS)",
        },
        {
            "url": "https://www.federalreserve.gov/releases/h15/",
            "label": "Federal Reserve — Selected Interest Rates (H.15)",
        },
    ],
    "related": [
        "mortgage",
        "mortgage-repayment-calculator",
        "mortgage-overpayment-calculator",
        "loan-payoff",
        "compound-interest",
        "net-worth",
    ],
    "scenarios": [
        {
            "label": "Clear win: $300k 7%→5%, 28yr left → 30yr",
            "query": "currentBalance=300000&currentRatePct=7&currentRemainingYears=28&newRatePct=5&newTermYears=30&closingCosts=4000",
        },
        {
            "label": "Term-reset trap: $200k 6%, 15yr left → 30yr 5%",
            "query": "currentBalance=200000&currentRatePct=6&currentRemainingYears=15&newRatePct=5&newTermYears=30&closingCosts=3000",
        },
        {
            "label": "Shorter term: $250k 6.5%, 25yr left → 15yr 5%",
            "query": "currentBalance=250000&currentRatePct=6.5&currentRemainingYears=25&newRatePct=5&newTermYears=15&closingCosts=4000",
        },
    ],
    "keyConcepts": (
        "<p><strong>Refinancing replaces your existing mortgage with a new loan, and the only question that "
        "matters is whether the new loan leaves you better off — which is rarely answered by the monthly "
        "payment alone.</strong> A refinance pays off your current balance and starts a fresh loan at a new "
        "rate and term. The headline appeal is almost always a lower monthly payment, but that lower payment "
        "can come from two very different sources: a genuinely lower interest rate, or simply a longer term "
        "that spreads the same debt over more years. The first saves you money; the second can quietly cost "
        "you far more. A sound refinancing decision rests on three numbers working together — the monthly "
        "saving, the break-even point, and the honest lifetime cost — not on the payment in isolation.</p>"
        "<p><strong>Break-even analysis is the first gate.</strong> The break-even point is the upfront cash you "
        "spend refinancing divided by the monthly saving: closing costs of $4,000 against a $200 monthly saving "
        "break even in 20 months. Past that point, the lower payment is pure benefit; before it, you are still "
        "underwater on the cost of the refinance. The practical rule is simple: only refinance if you expect to "
        "stay in the home, and keep the loan, comfortably beyond the break-even point. If you might sell or "
        "refinance again before then, you will have spent more on closing costs than you ever recover, and the "
        "refinance loses money even though the monthly bill went down. Rolling closing costs into the loan changes "
        "the arithmetic — you spend no cash today, so a payment-lowering refinance breaks even immediately — but "
        "you then finance those costs at the mortgage rate for the full term, which the lifetime figure captures.</p>"
        "<p><strong>The term-reset trap is the single most expensive refinancing mistake, and it is invisible if "
        "you only watch the payment.</strong> Amortisation front-loads interest: in the early years of a loan, "
        "most of each payment is interest and little goes to principal. When you refinance, you restart that clock. "
        "If you are ten years into a 30-year mortgage and refinance into a fresh 30-year loan, you reset to year "
        "one of a new 30-year amortisation — you will now pay on the house for 40 years total instead of 30. Even "
        "at a lower rate, the extra decade of interest can exceed the rate saving, so your lifetime cost rises "
        "while your monthly payment falls. This calculator reports lifetime savings with its true sign precisely "
        "so this trap is visible: a negative lifetime saving alongside a positive monthly saving is the warning "
        "that you are trading a smaller bill today for a larger total tomorrow. The fix is to refinance into a "
        "term that matches the years you had left or shorter — a borrower with 22 years remaining should compare "
        "a 20-year refinance, which keeps the lower rate while shrinking the total cost.</p>"
        "<p><strong>No-closing-cost refinances trade upfront cash for a higher rate, and the trade is not always "
        "worth it.</strong> A no-closing-cost refinance does not eliminate the costs — the lender recovers them "
        "either by adding them to your balance or, more commonly, by quoting a rate a quarter-point or so higher. "
        "That higher rate raises your payment for the entire life of the loan. The option shines when you are "
        "short on cash or expect to keep the loan only a few years (so you would never reach break-even on upfront "
        "costs anyway). It works against you when you plan to hold the loan for decades and could have afforded the "
        "lower rate by paying costs upfront. Always compare lenders using the standardised Loan Estimate, which "
        "shows total costs and the annual percentage rate (APR) — the figure that folds fees into a single "
        "comparable rate.</p>"
        "<p><strong>Two broad kinds of refinance serve different goals.</strong> A <em>rate-and-term</em> refinance "
        "keeps the loan amount roughly the same and changes the rate, the term, or both — this is the classic "
        "money-saving refinance. A <em>cash-out</em> refinance replaces your mortgage with a larger one and hands "
        "you the difference in cash, drawing on your home equity to fund renovations, debt consolidation, or other "
        "spending; it raises your balance, your payment, and usually your rate, and should be weighed against "
        "cheaper alternatives like a HELOC. Across both, the conventional rule of thumb is to investigate "
        "refinancing when you can lower your rate by at least 0.75 to 1 percentage point <em>and</em> you will stay "
        "in the home past the break-even point. Two caveats frame every result here: this model covers principal "
        "and interest only — it excludes property taxes, insurance, PMI, and escrow — and it follows US "
        "conventions, so UK borrowers should use a dedicated remortgage calculator, where product fees, SVR "
        "reversion, and early-repayment charges change the maths. Treat the output as a disciplined comparison of "
        "two amortisation schedules, and let the lifetime figure, not the monthly payment, have the final word.</p>"
        "<p><strong>So when does refinancing actually make sense?</strong> Stack the conditions and the answer falls "
        "out cleanly. First, the rate drop has to be real: a reduction of at least 0.75 to 1 percentage point is the "
        "traditional threshold, because anything smaller rarely overcomes the closing costs within a reasonable "
        "horizon. Second, you must intend to stay in the home, with this loan, well past the break-even point — a "
        "refinance that breaks even in 24 months is a poor idea if you expect to sell in 18. Third, the lifetime "
        "saving has to be positive, which in practice means refinancing into a term no longer than the years you "
        "have left rather than resetting to a fresh 30-year clock. When all three line up, refinancing is one of the "
        "highest-return financial moves a homeowner can make, often saving tens of thousands of dollars for a few "
        "hours of paperwork. When even one fails — the rate barely moves, you might relocate soon, or the lower "
        "payment is only an illusion created by a longer term — the calculator's lifetime and break-even figures "
        "will tell you to wait. Run several scenarios above, varying the new term in particular, and choose the one "
        "with the best lifetime saving you can comfortably afford each month.</p>"
    ),
}

data = json.loads(DATA.read_text(encoding="utf-8"))
data["refinance-calculator"] = entry
out = json.dumps(data, indent=2, ensure_ascii=True) + "\n"
DATA.write_text(out, encoding="utf-8")
wc = len(__import__("re").sub(r"<[^>]+>", " ", entry["keyConcepts"]).split())
print("inserted. title len:", len(entry["title"]))
print("keyConcepts approx words:", wc)
print("related:", entry["related"], "distinct:", len(set(entry["related"])) == 6)
print("self-ref:", "refinance-calculator" in entry["related"])
