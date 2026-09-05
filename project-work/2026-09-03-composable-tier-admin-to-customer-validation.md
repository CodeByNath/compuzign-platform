# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — payment-leg attribution missing from customer outputs**
- Auditor verdict: **Stop — commercial presentation is incomplete**
- Validated deployed source: `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`
- Deploy run `33945492532` remains successful/live.
- Browser/email validation date: 2026-09-05.

## Delivery incident result
A real customer HTML email has now been received. That closes the prior “missing email” runtime gate for this validation instance. Preserve the existing durable-request/idempotent-send behavior and do not modify mail transport or retry semantics for the presentation issue below.

## Architecture and non-change boundaries
Use the existing authoritative Commercial Legs / Billing Breakdown by Period data. Do not infer yearly attribution from summary totals, duplicate the pricing engine, flatten payment legs, change Rate Sheet facts, alter cart authority, or rewrite identity.

A single inclusion may participate in multiple payment legs with different cadence, effective period, quantity, unit price, and total. Customer outputs must preserve those distinctions and count every leg exactly once.

## Live finding
The selected Starter Cloud quote shows:

- Monthly: $156.50
- Yearly: $80
- Total: $7,592

However, the cart inclusion dropdown, PDF/preview, received email, and linked customer **View / Print Quote** show only one generic inclusion list. They do not explain which inclusion, quantity, price, or effective period produces the $80 yearly charge.

The existing **View Details → Billing Breakdown by Period** contains the missing authoritative explanation. In the observed composition:

- **Plan start–Month 10:** monthly inclusions produce $156.50/month.
- **Month 11–23:** monthly payment continues at $156.50/month and an annual payment begins at $80/year.
- The annual breakdown attributes that leg to **Static IP Block (8 IPs, 5 usable)**, quantity 2, unit price $40, total $80.
- Later periods must follow the remaining authoritative breakdown rather than being guessed or collapsed.

This is not merely a missing “Yearly $80” label—the amount is already present. The defect is missing inclusion-level payment-leg attribution.

## Exact fix request
1. Create or reuse one shared read-only payment-leg presentation model sourced directly from the same settled Commercial Legs used by **View Details → Billing Breakdown by Period**.
2. Apply it consistently to:
   - cart inclusion dropdown;
   - review/PDF preview and generated PDF;
   - customer HTML email;
   - the email’s **View / Print Quote** destination/customer quote view;
   - Total Commitment disclosures where the same item is shown.
3. Within each quoted item, group inclusion charges by their authoritative cadence/effective period. At minimum distinguish the recurring monthly leg from the annual/yearly leg.
4. For every leg show:
   - effective period/start;
   - cadence;
   - inclusion name;
   - quantity for that leg;
   - unit price;
   - calculated line total;
   - leg subtotal.
5. If the same inclusion exists in multiple legs or periods with different quantities/payment combinations, render each occurrence under its correct leg. Do not merge it into one generic quantity row.
6. For the observed Starter Cloud fixture, customers must be able to see that the $80 yearly charge beginning in Month 11 is Static IP Block quantity 2 × $40.
7. Keep the compact top-level Monthly/Yearly/Total summary. The expanded breakdown explains those amounts; it does not replace or recalculate them.
8. Use email-safe semantic HTML/table sections and clear dividers for the email version. Preserve the existing **Upgrades** naming correction and item grouping.
9. Do not expose internal IDs, Rate Sheet keys, leg IDs, post IDs, or pricing plumbing.

## Acceptance checks
- Cart dropdown accounts for both $156.50/month and $80/year and identifies the charged inclusions for each leg.
- View Details, cart dropdown, PDF, received email, customer quote view/print, and Total Commitment agree on period, cadence, inclusion, quantity, unit price, and subtotal.
- Starter Cloud fixture shows Static IP Block quantity 2 at $40 = $80/year beginning Month 11.
- Same inclusion appearing across multiple legs remains distinct and is never double-counted.
- All displayed leg subtotals reconcile exactly to the existing Monthly/Yearly/Total and contract value.
- Primary + Upgrade + add-on fixtures preserve each item’s own legs without cross-assignment.
- Existing email delivery/idempotency, decimal precision, cart behavior, identity, filter, disclosure, PDF naming, and hydration safeguards remain green.

Report the lost-attribution boundary, affected shared model/consumers, before/after fixtures for multi-leg inclusions, rendered email/PDF/customer-view evidence, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
