# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — live validation exposed missing admin Overview dual-ID presentation**
- Auditor verdict: **Proceed with safeguards; Phase 1 not closed**.
- Production: `main@2f06872f5ac2759a35530a47cd2e6915eca76e7f`; deploy #956 succeeded.
- Nath ran the existing Admin Station one-time Platform ID assignment action successfully, then observed the Upgrade Overview still does not show the additional Upgrade Platform ID.

## What is confirmed working
- CZTU/CZTEU backend identity policy, reserve/bind, migration assignment path and deployed Admin action are live.
- This is not evidence to reopen the dual-identity architecture or pricing/customer flows.

## Source-confirmed presentation gap
The live symptom matches source exactly:
- `SurfaceTierDetail` / `TierEdition` frontend contracts do not declare the new Upgrade ID fields.
- `buildTierDetail()` only sends `platformId` + `addonPlatformId` to Tier Overview.
- `TierOverviewShellData` / `tierOverviewShell` only render **Tier Platform ID** and conditional **Add-on Platform ID**.
- `buildTierEditionDetail()` only sends `editionPlatformId`.
- `TierEditionOverviewShellData` / `tierEditionOverviewShell` only render **Edition Platform ID**.
Therefore a correctly assigned CZTU/CZTEU cannot appear in the Overview even when stored and returned.

## Claude correction — presentation only
On a clean review branch from current `main@2f06872f...`:
1. Audit the current backend admin read/projection shape first and confirm the settled composable occupant returns `upgrade_platform_id` and composable Editions return `edition_upgrade_platform_id`. If either is missing from the admin read projection, add only the missing output field; do not touch minting or registry logic.
2. Extend Package frontend types with output-only Upgrade ID fields using the exact backend names/normalisation convention.
3. Tier Overview: carry/render the additional **Upgrade Platform ID** only for the composable participant when a CZTU value exists. Keep the normal **Tier Platform ID** visible beside it; never replace it.
4. Edition Overview: carry/render **Upgrade Platform ID** (CZTEU) only when that Edition has one, while retaining **Edition Platform ID** (CZTE).
5. Empty Upgrade ID must hide the extra row rather than show a misleading assignment fallback on ordinary Tiers/Editions.
6. No editable Platform-ID field and no new assignment control.
7. Add focused contracts proving dual IDs coexist in Overview and ordinary Tier/Add-on/Edition presentation is unchanged.
8. Rebuild only required generated admin assets; no quote/Request/cart/PDF/email/order/pricing/resolver changes.

Report exact changed files/tests/clean SHA and set **AWAITING CHATGPT REVIEW**. Do not push main before review.