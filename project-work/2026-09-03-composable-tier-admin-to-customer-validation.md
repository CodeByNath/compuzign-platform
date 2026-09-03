# Composable Tier — Admin UX restructuring + customer validation

## Status
- **AWAITING CHATGPT REVIEW — Admin UI/UX composition implemented, local only.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production baseline: `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`.
- Local implementation commit (NOT pushed): `main@bb86513c` — "Admin UX restructuring: composable occupant as sixth Tier Engine destination".

## Proven live state
KAIROS Build Your Own is an Active subordinate composable occupant with 3 occupant-owned inclusions. Customer Options works from the split-button chevron and opens the standalone Customer Selection Rules drawer. A published Block Storage Add/Remove rule reaches `/pricing/`; Add/Remove and server preview `$10/mo Ongoing` work. Quote/cart persistence is still intentionally absent.

## Locked architecture — DO NOT CHANGE
This phase is **Admin UI/UX only**.
- Keep 5 normal Tier occupants exactly as existing backend slots.
- Composable occupant remains the existing subordinate occupant, **not a 6th backend Tier slot** and not `is_addon`.
- Keep existing `customer_policy`, Rate Sheet ownership, inclusions, Legs, Editions, identity, lifecycle, resolver and standalone Customer Options drawer/persistence unchanged.
- No quote/cart/Request/PDF/email work in this phase.

## Nath's Admin UX direction
Reuse the existing Package Tier Engine and Package home patterns rather than creating a new Admin system.

1. In the Tier Engine's existing tab/filter navigation, add **Build Your Own / Composable** as a sixth **workspace destination only**. It may visually sit beside the five Tier destinations, but must never enter `tiers[slot]` or normal Tier selection semantics.
2. When a normal Tier is focused, current UI remains unchanged.
3. When the composable occupant is focused, reuse the normal focused Tier summary/count treatment (inclusions/services/etc.) and normal lower deck.
4. Insert one **composable-only middle shell** between the upper Tier focus area and the existing lower deck. It is hidden for every normal Tier.
5. Middle shell layout:
   - **Left:** up to 6 selected/featured inclusions, using existing occupant/customer-policy data only.
   - **Right:** concise Customer Selection Rules summary: offered mode, Add/Remove state, selected-by-default, quantity-enabled/bounds, Featured as applicable.
   - clear **View/Edit Customer Options** action opens the already-existing standalone customer-policy drawer; do not move policy into the shared Tier drawer.
6. Reuse the normal lower deck unchanged as far as practical:
   - Details → focused inclusion list;
   - Connections → existing connections;
   - Settings → existing Family/Rate Sheet/context information.
7. Prefer composition/reuse of existing Package/Tier components and shell patterns. Do not fork duplicate composable versions unless technically unavoidable.

## Claude implementation boundary
First audit existing Tier Engine tab/filter, focus projection, lower-deck composition, and Package home shell components. Then implement the smallest additive UI composition satisfying the above. No backend/schema/API changes unless you find a hard blocker; if so, stop and report before changing architecture.

Add focused contracts proving:
- 5 normal Tier destinations unchanged;
- composable workspace destination addresses subordinate occupant only;
- composable middle shell visible only when composable focused;
- normal Tier focus has zero composable shell leakage;
- Customer Options action still opens standalone `tier-customer-policy` drawer;
- existing lower-deck tabs/components are reused.

Report exact files, tests, branch/commit and screenshots/static evidence in this same file, set **AWAITING CHATGPT REVIEW**, and do not push to `main` without approval.

## Claude Report

**Design.** Focus view's `TierNavigation.tsx` now takes an optional `composableSlot`, rendered as a sixth tab after a divider (dashed border, `cz-tier-workspace__tab--subordinate`) — never merged into the filterable five-slot `slots` array/`TierListFilter`. Selecting it sets `PackageTierWorkspace.tsx`'s existing `selectedSlotId` state to the `COMPOSABLE_TIER_ID` sentinel already used elsewhere in that file (no second state variable). A new derived `focusedSlot` (the composable slot, or the normal `selectedSlot`) is what every lower-deck/Connections/Details dispatcher now reads, so the focused composable occupant reuses `TierDetailPanel` and the unmodified `TierLowerDeck` exactly as a normal Tier — zero forked deck/connections/settings component. Grid view's original always-visible composable box is left completely unchanged (it has no tab strip to host a destination on).

A new `TierComposableMiddleShell.tsx` mounts between the focus area and the lower deck only while `viewMode === 'focus' && isComposableFocused && tool.composableOccupant?.item` — hidden for every normal Tier. Left: up to 6 offered (non-excluded) `customer_policy` items that resolve to a real deck inclusion, ranked featured/required/default-selected first. Right: aggregate stat counts (always-included, Add/Remove, selected-by-default, adjustable-quantity, Featured) via the shared `StationMetricBlock`, plus "View/Edit Customer Options" calling the exact same `dispatchCustomerPolicyIntent` the tab panel and Grid box already call — opening the unchanged standalone `tier-customer-policy` drawer, never a new route. Both derivations are pure functions in new `composableMiddleShell.ts`, reading only the occupant's already-projected `TierDeck` and settled `customer_policy` (now additive on `WorkspaceTierSlot.customerPolicy`, permanently `null` for every normal Tier/Add-on slot) — no second read, no new endpoint.

**Hard-blocker-adjacent fix (flagged, not backend/schema).** Reusing the lower deck's Details/Connections lanes for the composable occupant required widening two drawer routing tokens' own local slot-id validation sets — `tierInclusionDrawerTypes.ts` and `tierRateSheetDrawerTypes.ts` each gained `COMPOSABLE_TIER_ID` alongside the five fixed slots. This is the identical gap class Phase 1C already closed for `tierDrawerTypes.ts`'s `FIXED_TIER_SLOTS`/`resolveOccupantSlot()`; without it those two lanes' row actions would silently fail to open while composable is focused. No PHP/schema/endpoint touched.

**Files.** `TierNavigation.tsx`, `PackageTierWorkspace.tsx`, `TierComposableMiddleShell.tsx` (new), `composableMiddleShell.ts` (new), `projection.ts` (+`customerPolicy` field), `usePackageTierWorkspace.ts` (plumbs `detail.customer_policy` through), `tierInclusionDrawerTypes.ts`, `tierRateSheetDrawerTypes.ts`, `admin-station.css`/`admin-station-responsive.css` (new `cz-tier-workspace__composable-*`/`tab-divider`/`tab--subordinate`/`featured-badge` rules, no collision with `atomic-engine/css/`), `docs/code-map/tier-composable-occupant-workspace-ui.md` (updated + new contract added), `package.json`.

**Tests.** New `scripts/composable-tier-admin-ux-contract.ts` (`npm run contract:composable-tier-admin-ux`) proves all six required properties from this doc's boundary section. Two pre-existing source-scan contracts needed literal-string updates for the intentional `selectedSlot` → `focusedSlot` rename (`package-tier-workspace-shell-contract.ts`, `tier-settings-contract.ts`) — same invariant, new variable name. Full green: `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, and every Package Station/composable-occupant/tier-workspace contract in the validation list (`contract:package-tier-workspace(-shell)`, `contract:tier-connections`, `contract:tier-settings`, `contract:tier-customer-policy-draft`/`-drawer`, `contract:composable-occupant-address`/`-workspace`, `contract:tier-instance-scope`/`-tool`, `contract:tier-edition-*`, `contract:tier-lifecycle-menu`, `contract:supported-action-footer`, `contract:station-tabset`, etc.). `contract:admin-station-css` fails on 6 pre-existing `cz-rate-sheet-tool__*` findings unrelated to this change (verified none of my new classes are among them).

**Not done.** No live browser validation (no local WordPress environment, matching every prior phase's own limitation). No Grid-view screenshot needed since Grid view is byte-unchanged.

## Review Rounds
_(none yet — first submission)_

## Production Push Record
Not pushed. `main@bb86513c` exists locally only, one commit ahead of `origin/main@41884a41`.

## Live Browser Validation
Pending — deferred to reviewer per prior-round precedent (no local WordPress environment available to Claude Code).