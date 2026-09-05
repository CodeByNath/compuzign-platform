# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — deployed live gate failed**
- Auditor verdict: **Stop — customer email hierarchy and commitment aggregation are incomplete**
- Validated deployed source: `main@2b3ec74d0d11798ee6c633a546bfd7d15b87467a`
- Deployment evidence already accepted: GitHub Actions run `33941331424`, successful and live.
- Browser validation date: 2026-09-05.

## Architecture / non-change boundaries
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native identity, cart authority/removal semantics, readiness/hydration guards, schema, Rate Sheet authority, and the accepted raw-number money pipeline.

The Phase 0 display correction is visibly effective in the tested email: the composable line now says **Upgrades**, not Build Your Own. Preserve that result.

Do not change quote composition, source prices, cart behavior, identity allocation, or unrelated email/page content. Both fixes must consume the same authoritative submitted quote snapshot already used by the other customer views.

## Live browser findings

### 1. Email item groups lack proper HTML division
The received customer email renders the base inclusions, **Upgrades**, and **Backup & DR Shield** as a long continuous white block. Although the content is present, the group boundaries are weak/inconsistent and the email does not provide a clear HTML-card/table separation between quoted items.

### 2. Total Commitment omits the add-on
The Details modal contains tabs for KAIROS — IaaS — AI / ML Accelerator, KAIROS — IaaS — Backup & DR Shield, and Total Commitment.

However, **Total Commitment** shows only the AI / ML Accelerator row and its $2,498 monthly/initial-payment values. Backup & DR Shield is absent even though it is a quoted add-on with its own detail tab. The commitment view therefore does not represent or aggregate the complete quote.

## Exact fix request

### Customer email HTML structure
1. Render every quoted item—primary plan, Upgrades, and add-on—as its own clearly bounded email-safe HTML section.
2. Use the existing email design language, but add consistent dividers/borders and spacing between item header, inclusion rows, and the next quoted item.
3. Use email-client-safe markup and inline styles (table-based where required); do not rely on unsupported external CSS, scripts, absolute positioning, or interactive controls.
4. Preserve the existing order, labels, prices, quantities, responsive width, and **Upgrades** display correction.
5. Ensure boundaries remain visible in Gmail/webmail and common narrow/mobile rendering without doubled borders or collapsed spacing.
6. Do not turn the email into a screenshot or attach a PDF as a substitute for semantic HTML.

### Complete Total Commitment
1. Build Total Commitment from the complete authoritative quote-item collection, not only primary/composable items.
2. Include each quoted primary, Upgrade, and add-on exactly once.
3. In the observed AI / ML Accelerator + Backup & DR Shield scenario, Total Commitment must include a separate Backup & DR Shield row as well as the primary row.
4. Aggregate every item’s payment streams into Contract Value and Initial Payment exactly once, respecting cadence and ongoing/fixed-term semantics.
5. Reuse the same inclusion authoritative snapshot and commercial projection as cart/review/PDF; do not create a second calculator or infer items from visible tabs.
6. Preserve the per-item inclusion disclosure and ensure it opens the inclusions for the correct primary, Upgrade, or add-on.
7. Empty or missing add-on details must fail visibly in diagnostics/tests rather than silently omitting the add-on from commitment.

## Required regressions
- Email fixture with primary + Upgrade + add-on renders three clearly separated semantic HTML item groups in Gmail-safe markup.
- Email labels the composable item **Upgrades**, never Build Your Own.
- Total Commitment with primary + add-on contains both rows and combined totals.
- Total Commitment with primary + Upgrade + add-on contains all three exactly once.
- Mixed cadence/fixed-term fixtures preserve correct Contract Value and Initial Payment aggregation.
- Each commitment disclosure resolves only its own inclusion rows.
- Existing decimal precision, filter reset, cart authority, readiness, removal, hydration, PDF naming, and footer containment remain green.

Report the omission root cause, affected email/template and Total Commitment components, before/after HTML and quote fixtures, rendered screenshots, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
