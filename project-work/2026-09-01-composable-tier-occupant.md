# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — implementation complete on the review branch, evidence contract added.**
- Auditor verdict on the correction scope: **Proceed with safeguards** (unchanged; implementation follows it below).
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

## Claude implementation report — 2026-09-02
Branch `fix/composable-tier-workspace-launcher` (based on `phase/composable-tier-occupant` @ `73619866`), pushed to the existing review branch, HEAD `f73ae103` (prior commit `de0f65c6` also pushed). **Not merged, not on `main`, no live mutations.**

**Root cause confirmed as stated** — `PackageTierWorkspace.tsx` is a second entry point untouched by Phase 1B; `projectWorkspaceTierSlots()` left five-slot-only, exactly as instructed.

**Correction to the auditor's own read:** `usePackageStation` has no `pkg.composableView()` method — the actual accepted API is `pkg.tierView(COMPOSABLE_TIER_ID)` (the same sentinel-routing call `TierDrawerContent.tsx` already makes). Used that instead; behavior matches the auditor's intent exactly (the composable read already crosses this surface via the shared hook, no second backend read added).

**Per the 6-point instruction:**
1. `projectWorkspaceTierSlots()` untouched; still exactly `TIER_KEYS.map(...)`.
2. New separate model: `usePackageTierWorkspace.ts` adds a `composableOccupant: WorkspaceTierSlot | null` field, built by a new exported `projectComposableWorkspaceSlot()` in `projection.ts` — never entering `slots`/`occupants`/Tier counts/Add-on filtering/Popular/grid collection.
3. One subordinate launcher rendered in `PackageTierWorkspace.tsx`, outside the Focus/Grid switch (covers both views), showing configured/not-configured state via a reused `TierDetailPanel` (additive `isSubordinate` prop, default `false`, swaps its "Fixed Tier slot" copy so it never claims to be a sixth Tier).
4. Reused `dispatchTierIntent`. Existing composable occupant routes by occupant identity: `usePackageStation.ts`'s `resolveOccupantSlot()` was blind to `composable_occupant` — extracted the fix as `tierOccupants.ts`'s exported `resolveOccupantSlotIncludingComposable()`. Absent child: `tierDrawerTypes.ts`'s `FIXED_TIER_SLOTS` (routing-token validation, distinct from `TIER_KEYS`) now also accepts `COMPOSABLE_TIER_ID` — narrow, not added to `TIER_KEYS`/`ALLOWED_TIERS`.
5. Opens the same `TierDrawerContent.tsx`/`TierDrawerHost.tsx` path every normal occupant uses — no new editor/controller/footer/Edition UI.
6. Add-on/Popular suppression and no-swap/retarget semantics are unchanged (already gated upstream in `TierDrawerContent.tsx`/`TierBinList.tsx`; this round touched neither).

**Files changed (8):** `usePackageTierWorkspace.ts`, `PackageTierWorkspace.tsx`, `TierDetailPanel.tsx`, `projection.ts`, `tierOccupants.ts`, `usePackageStation.ts`, `tierDrawerTypes.ts`, `docs/code-map/tier-composable-occupant-admin-ui.md`, plus `dist/js/admin-station.js` rebuilt and a new `scripts/composable-occupant-workspace-contract.ts` (registered as `contract:composable-occupant-workspace`).

**Required evidence — delivered.** The new contract proves, against the real exported functions (not mounted DOM, same precedent as `composable-occupant-address-contract.ts`): workspace `slots`/filters stay exactly five with composable structurally absent; the composable model is available and correctly shaped for both absent and configured states; the composable routing token decodes without joining `TIER_KEYS`/`FIXED_TIER_SLOTS` while all five normal slots and a normal occupant-id route round-trip unchanged; and `resolveOccupantSlotIncludingComposable` resolves the composable occupant's own `occupant_id` without disturbing the five normal ones or matching a stale/absent one. Sanity-checked the contract itself: reverted the `FIXED_TIER_SLOTS` fix, contract failed as expected, restored it.

**Verified:** `tsc --noEmit` clean; `npm run build` succeeds; `contract:composable-occupant-address`, `contract:composable-occupant-workspace`, `contract:package-tier-workspace`, `contract:package-tier-workspace-shell`, `contract:package-family-lifecycle`, `contract:tier-edition-admin`, `contract:tier-edition-switch`, `contract:tier-instance-scope` all pass. No PHP changed. **Not verified:** no live browser check (none authorized/performed).

**Open before CLOSED:** live browser validation on the KAIROS route (both Focus and Grid) — subordinate launcher renders, "5 of 5"/Family "Tiers 5" unchanged, opens the same shared Tier editor for the composable target, Add-on/Popular remain absent in that context.