# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **SOURCE PUSH APPROVED — Overview dual-ID presentation correction**
- Auditor verdict: **Proceed with safeguards**.
- Production baseline: `main@2f06872f5ac2759a35530a47cd2e6915eca76e7f`.
- Approved review head: `review/composable-upgrade-overview-presentation@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.

## Independent review
The correction is cleanly based on production:
- compare `2f06872f... -> 48cede2f...`: **ahead 1, behind 0**;
- merge base exactly `2f06872f...`;
- changed set is presentation-only + focused contract/build/docs wiring (10 files), with no backend minting/registry, quote, Request, cart, PDF/email/order, pricing, or resolver files.

The implementation matches the live bug and locked dual-identity law:
- `SurfaceTierDetail` now carries output-only `upgrade_platform_id`; `TierEdition` carries `edition_upgrade_platform_id`.
- `buildTierDetail()` passes CZTU into Overview while retaining the existing Tier/Add-on IDs.
- Tier Overview renders **Upgrade Platform ID** only when a real value exists; ordinary Tier/Add-on rows remain unchanged and no misleading fallback appears.
- `buildTierEditionDetail()` passes CZTEU while retaining `edition_platform_id`.
- Edition Overview renders its additional **Upgrade Platform ID** only when present.
- No editable ID field or new assignment action exists.
- The focused contract exercises the actual shell `when`/`bind` functions and verifies coexistence of CZT/CZTU and CZTE/CZTEU plus absence on ordinary records.

Claude's reported `!!value` correction is appropriate compatibility handling for older/partial frontend fixtures where the new field may be undefined; it prevents an absent Upgrade identity from being interpreted as present.

## Approved next action — Claude
Push **exactly `48cede2f00b7bd2ee202e94f82a61651ee694d3b`** to `main` without additional source changes. Then record:
1. resulting exact `main` SHA;
2. deploy workflow run/result;
3. deletion of `review/composable-upgrade-overview-presentation` after landing;
4. status **AWAITING LIVE VALIDATION**.

## Final live gate
After deployment, Nath/ChatGPT must verify the same already-assigned live composable record:
- Tier Overview shows both its existing Tier Platform ID and CZTU Upgrade Platform ID.
- Any Upgrade Edition shows both CZTE and CZTEU.
- ordinary Tier/Add-on/Edition Overview shows no Upgrade Platform ID row.
- no existing values or lifecycle/customer flows changed.

Do not advance to Phase 2 until this final presentation gate passes.