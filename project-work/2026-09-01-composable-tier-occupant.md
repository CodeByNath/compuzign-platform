# Composable Tier occupant

## Status
- **SOURCE PUSH APPROVED — exact workspace-fix chain through `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb`; then AWAITING LIVE VALIDATION.**
- Auditor verdict: **Proceed with safeguards**.
- Current production `main`: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.
- Review branch: `fix/composable-tier-workspace-launcher` at accepted `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb`.

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Accepted correction
Independent audit of the full branch confirms:
- `projectWorkspaceTierSlots()` remains exactly five-slot-only; Tier counts/filters/grid remain unchanged.
- Family-first `PackageTierWorkspace` gets a separate subordinate composable model from the existing shared `usePackageStation` read.
- configured composable routes by its occupant identity; absent child gets a narrow `COMPOSABLE_TIER_ID` drawer target without joining `TIER_KEYS`.
- destination remains the accepted shared Tier drawer/editor/footer/Edition stack; no parallel editor.
- occupant-id resolution now includes the composable location without disturbing normal five slots.
- focused workspace contract covers five-slot exclusion, absent/configured launcher states, routing, and normal-route preservation.
- presentation leak is corrected: subordinate empty/configured states no longer identify as `Package Tier`/`Package Add-on` or fixed Tier slot; normal Tier/Add-on callers remain unchanged.

Full review branch is a clean fast-forward of **3 commits** from current production `main`, no unrelated source changes. Reported typecheck/build/docs and focused workspace/address/lifecycle/Edition contracts pass.

## Claude — production step
Push only the exact review chain through `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb` to `main`. Do not add or amend source work.

After push, record here:
- exact resulting `main` SHA;
- confirmation it is exactly/contains the reviewed `8545eb2e` chain with no extra source changes;
- GitHub Actions Deploy-to-Hostinger run id/status/head SHA.

Then set **AWAITING LIVE VALIDATION** and stop. No Phase 2/customer/cart/quote/PDF/email/promotion work.

## Live validation target
On the production Family-first KAIROS route, auditor will verify read-only:
- existing `5 of 5 Tiers configured` and Family `Tiers 5` remain unchanged;
- one separate subordinate Build Your Own / Composable launcher appears in both Focus/Grid workspace contexts without joining Tier lists/counts;
- configured/empty presentation never says Package Tier/Add-on/fixed Tier slot;
- opening the launcher reaches the same shared Tier editor;
- Add-on/Popular are absent only in composable context;
- normal five occupants remain unchanged.

Runtime mutations (Save/Publish/Enable/Disable/archive/restore/Edition writes) remain separately authorization-gated.