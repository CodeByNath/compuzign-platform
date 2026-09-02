# Composable Tier occupant

## Status
- **READY FOR CLAUDE — workspace integration correction only.**
- Auditor verdict: **Proceed with safeguards**.
- Reviewed/deployed baseline: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture
A Family keeps one assigned Tier System / `CZTG`. One subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT, Rate Sheet, Edition, Leg, lifecycle, and mounted Tier-editor machinery. It is not a sixth peer slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Live failure / root cause — confirmed
Production Family-first navigation lands in `presentation/package-tier-workspace/PackageTierWorkspace.tsx`, not the Service-scoped Tier overview where Phase 1B mounted its launcher. The workspace's `projectWorkspaceTierSlots()` is intentionally and correctly `TIER_KEYS.map(...)`, so it can never render the subordinate child. Keep that five-slot projection unchanged.

### Auditor correction to Claude's scope
Do **not** add a second backend read unless hard evidence requires it. `usePackageTierWorkspace()` already instantiates the accepted `usePackageStation(serviceId, workspaceInstanceId)` and builds normal occupants from that model. The accepted composable read therefore already crosses this surface through `pkg.composableView()` / `station.composable_occupant`.

The actual routing gap is the absent-child address: `decodeTierSlotDrawerRecordId()` only accepts the five fixed slot ids, while the mature editor already understands `COMPOSABLE_TIER_ID` once opened.

## Claude — implement smallest correction
1. Keep `projectWorkspaceTierSlots()` and all five-slot counts/filters/summaries byte-semantically five-slot only.
2. Add a **separate subordinate workspace projection/model** for the composable child from the existing `pkg.composableView()` source. It must never be inserted into `slots`, `occupants`, Tier counts, Add-on filtering, Popular logic, or grid Tier collection.
3. Render one clearly subordinate launcher in the Family/Tier-system workspace when a Tier Instance is in scope. It may show configured/not-configured state but must not masquerade as a sixth Package Tier.
4. Reuse the existing `dispatchTierIntent`/drawer host path. For an existing composable occupant, route by its occupant identity if available. For an absent child, extend the routing token/parser narrowly so `COMPOSABLE_TIER_ID` is a valid **drawer target** without making it a fixed Tier slot or adding it to `TIER_KEYS`.
5. Opening it must land in the already-accepted shared Tier editor; no new editor/controller/footer/Edition UI.
6. Preserve composable suppression of Add-on/Popular and no swap/retarget semantics.

## Required evidence
Add focused TS contracts proving:
- workspace `slots.length`/counts remain exactly five and composable is excluded from Tier/Add-on filters;
- composable launcher model is separate and available for both absent/configured child states;
- composable routing target decodes/dispatches without joining the fixed-slot vocabulary;
- normal five-slot drawer routing remains unchanged.

Run typecheck/build/docs plus relevant workspace, lifecycle, Edition and composable contracts. Push only to the existing review branch, report exact SHA/files/tests/root cause confirmation here, then set **AWAITING CHATGPT REVIEW**. Do not push to `main`, mutate live runtime, or start customer/cart/quote/PDF/email/promotion work.