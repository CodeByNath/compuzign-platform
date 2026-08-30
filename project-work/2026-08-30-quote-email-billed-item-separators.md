# Quote receipt email billed-item separators

## Status
- **READY FOR CLAUDE**
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Objective
Add clear visual separation between each top-level billed item in the customer **Quote Request Received** email. This is an email presentation fix only; Claude remains the sole source editor.

## Live browser evidence — 2026-08-30
Read-only Gmail validation of email **“Your quote request has been received — CZ-9GPG3T”** at the deployed customer-email output.

Under **Your Selected Services**, these three top-level billed blocks visually run together:
1. **KAIROS — IaaS / Starter Cloud**
2. **OMNIA — Banking / Omnia Basic · OMNIA — Select**
3. **Backup & DR Shield add-on / Optional add-on · KAIROS — IaaS**

The inclusion rows inside each block are readable, but there is no consistent border/separator between the end of one billed item and the heading/price summary of the next. The transition from KAIROS inclusions to OMNIA and from OMNIA inclusions to the add-on is ambiguous.

## Required behavior
- Add one subtle, full-width horizontal divider between adjacent **top-level billed item blocks** in the quote receipt email.
- The divider must clearly belong to the boundary between items, with balanced vertical spacing above and below.
- Use email-client-safe markup/styles and the existing email palette; the border must remain visible in Gmail light mode without becoming visually heavy.
- Apply the same rule regardless of whether the item is a Package Tier, primary package, or add-on.
- Do not add a divider before the first item or after the last item.
- Do not place borders between an item’s own inclusion rows; Bundle children remain grouped under their parent billed item.
- Ensure the separator remains correct for one item, two items, and three-or-more items.

## Hard non-change boundary
Do not change email wording, headings, pricing, totals, quantities, item order, Bundle/inclusion grouping, CTA, notes, legal copy, width, typography, colours beyond the separator, or customer data. Do not change the live Quote View/Print page unless it shares the exact email-rendering primitive and the same boundary defect is proven there. No backend pricing/resolver, persistence, schema, or quote snapshot changes.

## Acceptance
- Add focused render/snapshot coverage for 1, 2, and 3 billed-item cases.
- Verify separators appear only between top-level items and never between child inclusions.
- Inspect the actual generated HTML for inline/email-safe styling.
- Validate a sent/rendered email in Gmail at minimum; report any known Outlook limitation.
- Report root cause, changed files, tests, review SHA, and before/after browser evidence here.
- Set **AWAITING CHATGPT REVIEW** when ready. Do not push source to `main` without Nath’s explicit approval.
