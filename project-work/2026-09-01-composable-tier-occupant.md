# Composable Tier occupant

## Status
- **AWAITING LIVE VALIDATION — pushed to `main`, deployed successfully.**
- Auditor verdict: **Proceed with safeguards**.
- Production `main` now: `1b2efd23064e3d2fac904c21fa4094912b132c41` (fast-forward from `8545eb2e`, confirmed ancestor before push, no extra commits).
- Review branch `fix/composable-tier-workspace-launcher` is the same SHA main now points to.

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Accepted live-found correction
Independent audit accepts `d78629d3` + `1b2efd23`:
- one optional shared-shell `setHeaderTitle` seam mirrors existing header-hidden/action patterns;
- shell state resets on drawer template/record identity change; Tier content also cleans up;
- `resolveTierDrawerHeaderTitle()` overrides only `COMPOSABLE_TIER_ID` to **Build Your Own** and returns `null` for overview/all normal Tier/Add-on contexts;
- visible drawer `<h2>` uses `headerTitle ?? template.title`;
- dialog `aria-label` now uses that same effective title authority, preserving the fallback for unresolved drawers;
- no routing, persistence, lifecycle, editor module, count, workspace projection or Add-on semantics changed;
- normal drawer templates that never use the override keep their registered titles unchanged.

The full correction is a clean two-commit fast-forward from current production. Reported `tsc`, build and the shared-drawer/composable/workspace/lifecycle/Edition contract set pass.

## Claude — production step — done
Pushed with Nath's explicit confirmation (production-push, not a routine coordination push — asked again for this push, same as the first). `git merge-base --is-ancestor origin/main origin/fix/composable-tier-workspace-launcher` confirmed a clean fast-forward before pushing; `git push origin origin/fix/composable-tier-workspace-launcher:refs/heads/main` reported `8545eb2e..1b2efd23`, no source added/amended.

- Resulting `main` SHA: `1b2efd23064e3d2fac904c21fa4094912b132c41` — exactly the reviewed 2-commit chain (`8545eb2e` → `d78629d3` → `1b2efd23`), no extra source changes.
- GitHub Actions "Deploy to Hostinger": run `33599903039` / #931, head SHA `1b2efd23064e3d2fac904c21fa4094912b132c41`, **completed / success**.

Set to **AWAITING LIVE VALIDATION**. No Phase 2/customer/cart/quote/PDF/email/promotion work performed.

## Remaining live checks
After deployment, Nath/auditor should verify read-only:
- Focus and Grid still show exactly five normal Tiers plus one separate Build Your Own/composable section;
- composable drawer visible header is **Build Your Own**, not Package Tier/Add-on;
- dialog accessible name matches the same title if inspected with browser accessibility tools;
- open Tier Overview **Edit** only (do not Save) and confirm Add-on + Popular controls are absent in composable context;
- open one normal Tier drawer and confirm its normal Package Tier presentation remains unchanged.

Runtime mutations remain separately authorization-gated.