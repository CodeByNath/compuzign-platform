# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — live Request/customer UI correction round.**
- Auditor verdict: **Proceed with safeguards.**
- Validated production: `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; Hostinger deploy #938/run `33762478987` succeeded.
- Coordination input: `a274375c84b37028c0b8c41f89cc18b449db7124`.

## Locked architecture / non-change boundary
Retain one subordinate composable occupant and one aggregate composable quote line with explicit `primary | addon | composable` identity. Do not add entities/products, reuse `is_addon`, persist `composableSelection`, or change pricing/resolvers, Rate Sheets, occurrence-month math, identity keys, Admin configuration, or legacy Request data. Stored Request rendering must use stored `inclusionItems` and `legPaymentSummaries`, never live re-resolution.

## Live evidence
Nath submitted current production Request **CZ-B9W42O / CZRWNTCQ** with Starter Cloud, Backup & DR Shield, and composable Block Storage ×100.

- Admin Request shows three separate summary lines and Build Your Own at $10/month, but omits the composable inclusion snapshot and per-Leg details.
- Before submission, **Quote details → KAIROS — IaaS — Build Your Own Details** displayed “Details unavailable for this plan.”
- Review & Finalise right rail contains **Print / Save as PDF** below the usable 1067×701 viewport; it appears hidden unless the rail is scrolled.
- Customer quote/cart labels the aggregate line **Build Your Own** although it is created under **Upgrade your build**.
- Gmail search for the new reference **CZ-B9W42O** returns no message. The open email and public quote for legacy **CZ-9GPG3T** predate this deployment and are not valid composable evidence.

## Exact correction request
1. In the customer quote/cart and review UI, when the composable line is being added alongside a normal Tier, use the customer-facing subtitle **Upgrades** instead of **Build Your Own**. Keep internal composable identity and the aggregate line unchanged. Do not rename the standalone Admin destination.
2. Populate the composable **Quote details** tab from the current server-preview snapshot: show every selected inclusion and quantity (current evidence: Block Storage 100), plus its payment stream/amount (Monthly $10, Ongoing). Never show “Details unavailable” when snapshot data exists.
3. Keep **Print / Save as PDF** visibly reachable in the Review & Finalise modal at 1067×701 and smaller supported heights. Use the existing right-rail/action styling; make the action area sticky or otherwise viewport-reachable without redesigning the modal.
4. In Admin Request CZ-B9W42O, render the stored composable inclusion names/quantities and stored per-Leg payment summaries beneath its aggregate line. Preserve the separate primary/Add-on lines and customer-safe labels.
5. Diagnose the missing customer email for CZ-B9W42O. Ensure successful Request submission sends the email once and that the email/public quote/print/PDF all render the composable aggregate exactly once with stored inclusion quantities and payment streams. No raw Platform IDs.
6. Preserve legacy Request fallback when `isComposable` is absent; do not rewrite CZ-9GPG3T.

## Claude handoff
Implement only this scope, add focused regression coverage for preview/details, Request readback, email/proposal rendering, and responsive action visibility, then report files/tests/SHAs here. Do not push until the normal review gate authorizes it.
