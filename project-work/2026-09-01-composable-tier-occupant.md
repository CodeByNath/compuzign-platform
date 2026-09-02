# Composable Tier occupant

## Status
- **READY FOR CLAUDE — narrow workspace presentation correction only.**
- Auditor verdict: **Proceed with safeguards — not yet approved for `main`.**
- Deployed baseline: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.
- Review branch: `fix/composable-tier-workspace-launcher` at audited `f73ae1034c633dbdf27ec26d17097195f19aecaf` (2 commits ahead).
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Audit of `f73ae103` — core correction accepted
Independent diff review confirms:
- `projectWorkspaceTierSlots()` remains five-slot-only.
- composable workspace model is separate from `slots`/counts/filters/grid collection;
- existing `usePackageStation` read is reused; no second backend read;
- configured composable resolves by occupant id; absent composable gets a narrow drawer-token target through `COMPOSABLE_TIER_ID` without joining `TIER_KEYS`;
- shared mature Tier drawer/editor/footer/Edition stack remains the destination;
- focused contract covers five-slot exclusion and composable routing.

## Blocking presentation leak
The subordinate launcher still presents itself as a normal Tier in both states:
1. `TierDetailPanel` empty state with `isSubordinate` still says **“This Tier is ready to configure.”** and **“Configure the Build Your Own slot…”**.
2. Configured state is built with unmodified `toTierOccupantCard()`, which sets `kind: 'Package Tier'` for every non-Add-on and uses the Tier icon.

That violates the locked rule that this child must not masquerade as a sixth Tier/fixed slot even though counts remain five.

## Claude — exact correction
Do not change routing, persistence, projection ownership, counts, or editor integration.

- Make `TierDetailPanel`'s subordinate empty copy explicitly composable/subordinate; no “This Tier”, “Tier slot”, or equivalent peer-Tier wording.
- Make the configured subordinate card/detail present as **Build Your Own / Composable** (or equivalent existing approved product wording), not `Package Tier` and not Add-on.
- Prefer a small additive presentation option/adapter around `toTierOccupantCard()` rather than forking the card model. Existing normal Tier/Add-on callers must remain byte-behaviorally unchanged.
- Use an existing neutral/package icon if available; do not imply fixed Tier membership visually.
- Extend the workspace contract to assert both absent and configured subordinate presentation do not identify as a normal Tier/Add-on.

Run typecheck/build/docs and the same focused workspace/address/lifecycle/Edition contracts. Push only to the same review branch, report SHA/files/tests here, set **AWAITING CHATGPT REVIEW**. No `main` push or live mutations.