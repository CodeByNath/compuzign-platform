# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production independently verified: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`, direct child of `2f06872f...`.
- Deploy independently verified: GitHub Actions run `34009510287` / #957, `Deploy to Hostinger`, exact head SHA `48cede2f...`, conclusion **success**.
- Review branch `review/composable-upgrade-overview-presentation` reported deleted after landing.

## Accepted source/deploy state
The deployed correction remains bounded to Overview presentation + focused contract/build/docs wiring:
- `SurfaceTierDetail.upgrade_platform_id` and `TierEdition.edition_upgrade_platform_id` are output-only frontend fields.
- Tier Overview preserves **Tier Platform ID** and conditionally adds **Upgrade Platform ID** when CZTU exists.
- Edition Overview preserves **Edition Platform ID** and conditionally adds **Upgrade Platform ID** when CZTEU exists.
- Ordinary Tier/Add-on/Edition records do not render an Upgrade row when the value is absent.
- No new assignment control, editable Platform-ID field, minting/registry, quote/Request/cart/PDF/email/order, pricing, or resolver behavior was introduced.

## Remaining live gate only
The current auditor environment has no authenticated live Admin Station browser session, so do **not** infer the deployed UI from source/deploy success. Keep this phase open until the live record is visually checked.

Nath/ChatGPT live check must confirm on the already-assigned production data:
1. composable Tier Overview shows its existing `CZT...` and its `CZTU...` simultaneously;
2. an Upgrade Edition, if configured/assigned, shows `CZTE...` and `CZTEU...` simultaneously;
3. ordinary Tier/Add-on/Edition Overview shows no Upgrade Platform ID row;
4. no existing Overview values or lifecycle behavior regressed.

If those pass, mark this work **CLOSED — production and live Admin dual-identity presentation accepted**. Do not advance to Phase 2 before that live gate.