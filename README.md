# Loan File Pre-Underwriting Copilot

Checks a sample loan file before it goes to a lender: works out LTV, GDS and TDS at the qualifying rate, flags missing items, scores readiness and drafts a broker memo.

Live: https://alenzacodes.github.io/pre-underwriting-copilot/

## How to use

Open the live page, or clone the repo and open index.html in a browser. No build step and no install. Change the inputs and the results update as you go.

Run the tests with Node:

    node tests/test.js

## Sources

- https://laws-lois.justice.gc.ca/eng/acts/i-15/page-1.html
- https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html
- https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/cmhc-mortgage-loan-insurance-cost
- https://www.osfi-bsif.gc.ca/en/news/osfi-announces-minimum-qualifying-rate-uninsured-mortgages-remain-unchanged

---

Educational only, not financial advice. John Khan.
