# Composable Tier — continuous work track

## Status
- **AWAITING CLAUDE RESPONSE — implement live Request/customer UI correction round.**
- Auditor verdict: **Proceed with safeguards.**
- Validated production: `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; Hostinger deploy #938/run `33762478987` succeeded.

## Locked architecture / non-change boundary
Retain one subordinate composable occupant and one aggregate composable quote line with explicit `primary | addon | composable` identity. Do not add entities/products, reuse `is_addon`, persist `composableSelection`, or change pricing/resolvers, Rate Sheets, occurrence-month math, identity keys, Admin configuration, or legacy Request data. Stored Request rendering must use stored `inclusionItems` and `legPaymentSummaries`, never live re-resolution.

## Live evidence
Production Request **CZ-B9W42O / CZRWNTCQ** contains Starter Cloud, Backup & DR Shield, and composable Block Storage ×100.
- Admin Request shows three separate summary lines and Build Your Own at $10/month, but omits composable inclusion/Leg detail.
- Quote details for composable shows “Details unavailable for this plan.”
- Review & Finalise Print / Save as PDF falls below the usable 1067×701 viewport unless rail is scrolled.
- Customer quote/cart says **Build Your Own** even when composable is used as an upgrade beside a normal Tier.
- No customer email was found for CZ-B9W42O; legacy CZ-9GPG3T is not valid evidence for this deployment.

## Claude implementation scope
1. Customer quote/cart + review: when composable coexists with a normal Tier, present the aggregate line as **Upgrades**. Keep internal composable identity and standalone Admin Build Your Own naming unchanged.
2. Composable Quote details: render current successful server-preview snapshot — every selected inclusion + quantity and stored payment stream/amount; current expected evidence is Block Storage ×100, Monthly $10, Ongoing. Never show unavailable when snapshot data exists.
3. Review & Finalise: keep Print / Save as PDF visibly reachable at 1067×701 and smaller supported heights using existing rail/action styling; sticky/reachable action area is acceptable, no redesign.
4. Admin Request readback: beneath the aggregate composable line, render stored inclusion names/quantities plus stored per-Leg payment summaries. Preserve primary/Add-on separation and customer-safe labels.
5. Diagnose/fix missing customer email for successful Request submission. Email/public quote/print/PDF must render composable exactly once from stored snapshot values, with no raw Platform IDs.
6. Preserve legacy Requests where `isComposable` is absent; do not rewrite CZ-9GPG3T.

## Required verification
Add focused regression coverage for:
- composable details from preview snapshot;
- upgrade-vs-standalone customer label;
- primary + composable + Add-on Request readback;
- stored inclusion quantities and per-Leg streams in Admin/proposal/email;
- successful submission sends customer email once;
- responsive action visibility/reachability;
- legacy absent-`isComposable` fallback.

Implement locally, run focused contracts/typecheck/build/docs, push to a non-production review branch only, then report exact files, tests, branch/SHA and unresolved risks here. Set **AWAITING CHATGPT REVIEW**. Do not push `main`.