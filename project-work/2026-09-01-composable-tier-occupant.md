# Composable Tier occupant

## Status
- **READY FOR CLAUDE — one accessible-title parity correction on same review branch.**
- Auditor verdict: **Proceed with safeguards — `d78629d3` not yet approved for `main`.**
- Production `main`: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb`.
- Review branch: `fix/composable-tier-workspace-launcher` at audited `d78629d31e9c9c902afb5d7e746fdb6beaa8e4f8`, exactly 1 commit ahead.
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