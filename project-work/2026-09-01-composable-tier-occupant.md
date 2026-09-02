# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — accessible-title parity fix pushed to same review branch.**
- Auditor verdict on file: **Proceed with safeguards — not yet approved for `main`.**
- Production `main`: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb` (unchanged).
- Review branch: `fix/composable-tier-workspace-launcher` now `1b2efd23`, exactly 2 commits ahead of production.
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Audit of `d78629d3`
The title-resolution design is otherwise accepted:
- one optional shared-shell `setHeaderTitle` seam mirrors existing header state;
- shell state resets on template/record identity change and Tier content also cleans up;
- `resolveTierDrawerHeaderTitle()` returns `Build Your Own` only for `COMPOSABLE_TIER_ID`, `null` for overview and all normal Tier/Add-on targets;
- visible `<h2>` uses `headerTitle ?? template.title`;
- no routing/persistence/lifecycle/editor/count/workspace changes; branch is one clean commit from current production.

### Remaining blocker
`AdminStationDrawer.tsx` still sets the dialog's accessible name as:
`aria-label={template ? template.title : 'Drawer'}`.

So when the composable target is open, sighted chrome says **Build Your Own** but assistive technology still receives **Package Tier**. That is the same identity leak in the accessibility surface and makes visible/accessibility semantics disagree.

## Claude — exact correction
In the existing shared drawer shell, resolve the dialog accessible name from the same effective title authority as the visible heading: `headerTitle ?? template.title` (preserving `Drawer` fallback for unresolved templates as appropriate). Do not introduce another state or resolver.

Extend the focused contract/source assertion so composable visible title and accessible dialog title share the override while normal drawers retain their registered template titles.

No other source changes. Run typecheck/build and the same shared-drawer/composable contracts. Push to the same review branch, report exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Claude correction report — 2026-09-02
Branch `fix/composable-tier-workspace-launcher`, new commit `1b2efd23` on top of `d78629d3`. Pushed to the same review branch only. **`main` unchanged, no live mutations.**

**Correction — exactly as instructed, no new state/resolver:** `AdminStationDrawer.tsx`'s `aria-label` now reads `template ? (headerTitle ?? template.title) : 'Drawer'` — the identical expression the visible `<h2>` already used, so the two can never diverge again (previously `aria-label={template ? template.title : 'Drawer'}`, ignoring `headerTitle` entirely).

**Evidence extended, not replaced.** `composable-occupant-workspace-contract.ts` section 6 (source-scan, same precedent as `tier-instance-scope-contract.ts`) asserts both the visible-title line and the `aria-label` line contain the literal `headerTitle ?? template.title` expression — a structural proof they share one authority, not a snapshot that today's rendered values happen to match. Sanity-checked: reverted the `aria-label` line, contract failed as expected, restored.

**Files changed (3):** `AdminStationDrawer.tsx`, `composable-occupant-workspace-contract.ts`, `dist/js/admin-station.js` (rebuilt). No docs needed updating (the code map's existing description of the `setHeaderTitle` seam already covers this line).

**Verified:** `tsc --noEmit` clean; `npm run build` succeeds; full previously-passing set — `composable-occupant-workspace`, `composable-occupant-address`, `package-tier-workspace`, `package-tier-workspace-shell`, `package-family-lifecycle`, `tier-edition-admin`, `tier-edition-switch`, `tier-instance-scope`, `tier-drawer-editor-chrome`, `drawer-module-entry`, `tier-system-drawer`, `tier-occupant-card-drawer-unification` — all pass. No PHP changed. No live browser/AT check performed on this correction yet.