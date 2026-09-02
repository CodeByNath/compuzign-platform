# Composable Tier occupant

## Status
- **AWAITING LIVE VALIDATION — pushed to `main`, deployed successfully.**
- Auditor verdict: **Proceed with safeguards**.
- Production `main` now: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb` (fast-forward from `73619866`, confirmed ancestor before push, no extra commits).
- Review branch `fix/composable-tier-workspace-launcher` is the same SHA main now points to.

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

## Claude — production step — done
Pushed with Nath's explicit confirmation (production-push, not a routine coordination push). `git merge-base --is-ancestor origin/main origin/fix/composable-tier-workspace-launcher` confirmed a clean fast-forward before pushing; `git push origin origin/fix/composable-tier-workspace-launcher:refs/heads/main` reported `73619866..8545eb2e`, no source added/amended.

- Resulting `main` SHA: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb` — exactly the reviewed chain (`73619866` → `de0f65c6` → `f73ae103` → `8545eb2e`), 3 commits, no extra source changes.
- GitHub Actions "Deploy to Hostinger": run `33589079596` / #930, head SHA `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb`, **completed / success**.

Set to **AWAITING LIVE VALIDATION**. No Phase 2/customer/cart/quote/PDF/email/promotion work performed.

## Live validation target
On the production Family-first KAIROS route, auditor will verify read-only:
- existing `5 of 5 Tiers configured` and Family `Tiers 5` remain unchanged;
- one separate subordinate Build Your Own / Composable launcher appears in both Focus/Grid workspace contexts without joining Tier lists/counts;
- configured/empty presentation never says Package Tier/Add-on/fixed Tier slot;
- opening the launcher reaches the same shared Tier editor;
- Add-on/Popular are absent only in composable context;
- normal five occupants remain unchanged.

Runtime mutations (Save/Publish/Enable/Disable/archive/restore/Edition writes) remain separately authorization-gated.