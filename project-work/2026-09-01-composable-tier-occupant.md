# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — presentation leak corrected, pushed to review branch.**
- Auditor verdict on file: **Proceed with safeguards — not yet approved for `main`.**
- Deployed baseline: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.
- Review branch: `fix/composable-tier-workspace-launcher`, now `8545eb2e` (3 commits ahead of `phase/composable-tier-occupant`).
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

## Claude correction report — 2026-09-02
Branch `fix/composable-tier-workspace-launcher`, new commit `8545eb2e` on top of the audited `f73ae103` (that commit's own diff untouched). Pushed to the same review branch. **Not merged, not on `main`, no live mutations.**

**Fixed both leaks, both in the additive `isSubordinate` path only — no routing, persistence, projection ownership, count, or editor-integration change:**
- `TierDetailPanel.tsx`: extracted `subordinateEmptyStateCopy(label)` — heading "This composable occupant is ready to configure.", body "Configure {label} in the existing Tier tool." — wired for `isSubordinate` only; the normal-Tier empty-state branch (`hasInstance`/`familyName` logic) is untouched.
- `tierOccupantCard.ts`: `toTierOccupantCard()` gained an additive `isSubordinate` param (default `false`). True sets `kind: 'Composable occupant'` (never `'Package Tier'`/`'Package Add-on'`) and `icon: PackagesIcon` (never `TiersIcon`). Every existing normal Tier/Add-on call site omits the param and is unaffected. `usePackageTierWorkspace.ts`'s composable card build now passes `isSubordinate: true`; the five normal occupants' own call is untouched.

**Evidence extended, not replaced.** Added section 4 to `composable-occupant-workspace-contract.ts`: a normal Tier card/empty-state call proves `kind === 'Package Tier'`/`icon === TiersIcon` unchanged; the composable equivalents prove `kind === 'Composable occupant'`, `icon === PackagesIcon`, and the empty-state copy contains neither "Tier" (heading) nor "Tier slot" (body). Sanity-checked: reverted the `kind` fix, contract failed as expected, restored.

**Files changed (6):** `TierDetailPanel.tsx`, `tierOccupantCard.ts`, `usePackageTierWorkspace.ts`, `composable-occupant-workspace-contract.ts`, `docs/code-map/tier-composable-occupant-admin-ui.md`, `dist/js/admin-station.js` (rebuilt).

**Verified:** `tsc --noEmit` clean; `npm run build` succeeds; `composable-occupant-address`, `composable-occupant-workspace`, `package-tier-workspace`, `package-tier-workspace-shell`, `package-family-lifecycle`, `tier-edition-admin`, `tier-edition-switch`, `tier-instance-scope` contracts all pass. No PHP changed. No live browser check performed.

**Open before CLOSED:** live browser validation — subordinate presentation (both empty and configured) reads as "Composable"/"Build Your Own", never as a Tier or Add-on, in both Focus and Grid.