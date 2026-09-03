# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — Request/PDF/email implementation accepted for `main`.**
- Auditor verdict: **Proceed with safeguards.**
- Accepted production before this phase: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`; Deploy #937 succeeded.
- Approved review commit: `review/composable-request-pdf-email@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`.
- Independent compare: exactly 1 commit ahead / 0 behind accepted `main`; 16 files changed; no pricing/resolver/Rate Sheet/entity/identity files.

## Auditor review
Implementation matches the approved Request representation design:
- `RequestSchema.php` persists optional `isComposable` only for `family_tier`, defaults absent to false, and forces `isAddon=false` when composable; `composableSelection` remains deliberately unstored.
- `RequestLine` + `requestLineToCartItem()` carry the discriminator back into the existing `FamilyTierQuoteItem` shape.
- proposal/print/PDF classification uses the existing centralized TS role/key behavior, so primary + composable in the same Family/Tier System have distinct keys/roles.
- PHP email logic now has one `resolveItemRole()` convention: composable -> Add-on -> primary, and separate primary/Add-on/composable buckets.
- customer representation uses **Build Your Own**, stored `inclusionItems`, and stored `legPaymentSummaries`; no old Request is re-resolved against current product state.
- composable joins the same primary/composable commercial totals exactly once while remaining a distinct displayed line.
- existing Add-on behavior is not repurposed and no `is_addon` architecture change was introduced.

Tests added use the repo's existing executable PHP assertion convention plus focused TS contract. They directly cover sanitizer persistence, dropped `composableSelection`, impossible dual-role normalization, legacy absent-field behavior, primary/composable key separation, three-role email representation, stored quantities/streams, and combined totals. Reported typecheck/build/docs/focused contracts are green; two reported pre-existing quote-view PHP failures are outside this diff and do not block this phase.

## Claude next action
Push **only** approved commit `f9035e82cda9ce7a0f1a65e36d761f8524aa058c` (or an identical fast-forward result) to `main`. Do not add cleanup/refactors or fold in `planDurationMonths`.

After push:
1. record exact `main` SHA;
2. record GitHub Actions deploy run/status and confirm deployed SHA;
3. set **AWAITING LIVE VALIDATION**;
4. do not close the phase or begin final UI/UX refinement yet.

## Live-validation gate after deployment
Read-only validation must prove a submitted Request containing Build Your Own survives the complete durable representation chain:
- Admin Request reads Build Your Own distinctly;
- proposal/print/PDF shows one aggregate Build Your Own line with selected inclusion names/quantities and stored payment streams;
- customer email shows Build Your Own distinctly with the same stored values;
- primary + composable coexist without duplicate/collapsed identity;
- totals include composable once;
- raw Platform IDs do not appear in customer-facing output.

If generating a real Request/email would mutate production state, stop and ask Nath before performing that exact live action.