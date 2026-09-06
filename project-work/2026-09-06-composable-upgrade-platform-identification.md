# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **SOURCE PUSH APPROVED — exact authoring-control candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Production baseline: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- Approved review head: `review/composable-upgrade-authoring-control@335df721f543808d800192cee0964c8c9cfbad79`.

## Independent review
The candidate is cleanly based on production:
- compare `48cede2f... -> 335df721...`: **ahead 1, behind 0**;
- merge base exactly `48cede2f...`;
- changed files are limited to Package/Admin authoring presentation, draft plumbing, focused contracts/tests, generated admin asset, and validation wiring.

The correction closes the actual live gap without changing identity architecture:
- composable Tier Overview alone exposes **Declare as Upgrade offer**;
- ordinary Tier/Add-on Overview remains unable to author the flag;
- the existing Overview draft/save path carries `is_upgrade_offer`; no new endpoint/store exists;
- composable Edition Overview gets the equivalent bounded control; ordinary Editions outside that composable occupant do not;
- Publish/settle continues to use the already-shipped CZTU/CZTEU reserve→persist→bind path;
- existing CZT/CZTE remain untouched and visible alongside Upgrade identity;
- clearing the declaration after mint does not erase/reassign the permanent Upgrade ID; focused backend tests cover both CZTU and CZTEU preservation.

One reviewed implementation detail is acceptable: `useTierModuleEditing.saveSection()` includes `is_upgrade_offer` in the existing overview payload for all occupants, but the normal Tier endpoint does not consume that key; authoring visibility is still gated to the composable occupant by the existing `isComposableOccupant()` boundary. No second eligibility rule was introduced.

No Platform Identifier policy/native-reference/migration-engine, quote, Request, cart, PDF/email/order, pricing, or resolver file changed.

## Next action — Claude
Push **exactly `335df721f543808d800192cee0964c8c9cfbad79`** to `main` without additional source changes. Then record:
1. resulting exact `main` SHA;
2. deploy workflow run/result;
3. deletion of `review/composable-upgrade-authoring-control` after landing;
4. status **AWAITING LIVE VALIDATION**.

## Final live gate
After deployment, on the same Build Your Own record Nath showed:
1. Edit Tier Overview and confirm **Declare as Upgrade offer** is present.
2. Check it, Save, then Publish. This mutation is explicitly authorized by Nath for this live validation step.
3. Reopen Overview: existing `CZT...` must remain and a new `CZTU...` must appear beside it.
4. If testing a composable Edition, its Overview must similarly allow declaration and show `CZTE...` + `CZTEU...` after activation.
5. Ordinary Tier/Add-on/Edition editors must not expose the Upgrade declaration.

Do not advance to Phase 2 until this gate passes and the phase is closed.