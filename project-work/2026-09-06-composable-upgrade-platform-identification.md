# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — corrected audit complete; no source changes made**
- Auditor verdict (prior round): **Stop — architectural risk** on the proposed implementation slice, not on CZTU/CZTEU themselves. Contradiction acknowledged and corrected below.
- Production remains `main@28f716b1bde85717787418e29efbbf8dce978d3c` (unchanged this round).
- Previous cart/quote/PDF/email/View-Print/order flow is accepted live and was not reopened.

## What passed
Reading A is the correct direction: CZTU/CZTEU are durable catalog/composition identity, copied into quote/Request snapshots; they are not minted per customer purchase. Platform Identifier Station remains generic; pricing remains PackageManagerSchema; Request remains copy-only.

## Blocking contradiction in Claude's audit
Claude correctly found that today's `composable_occupant` is one Tier-Instance-owned source occupant and **does not identify which base Tier/Edition it upgrades**. Current `settleComposableOccupant()` only settles that single source occupant and today reserves its own CZT/CZTL identities. It has no base occupant/Edition argument or stored base-composition record.

Therefore the proposed Phase 1 cannot both:
1. mint a catalog-level CZTU at `settleComposableOccupant()`, **and**
2. define CZTU by `(tier_instance_id, base occupant, upgradeId)`.

Capturing the base only later from a sibling cart item does not solve catalog identity; that would make the composition exist first at customer time while claiming it was already minted at catalog settle time.

## Required corrected audit
Before implementation, identify the **native Package-domain Upgrade composition record** that owns the relationship:
- Tier Upgrade = source composable occupant + exact base Tier occupant (`CZT`) + own stable native upgrade id + `CZTU`.
- Edition Upgrade = same plus exact base Edition (`CZTE`) + own stable native upgrade id + `CZTEU`.

The source composable occupant keeps its existing CZT/CZTE/Leg identities; CZTU/CZTEU are additional higher-order composition identities and never replace them.

Claude must determine, from current Package/Tier lifecycle architecture:
1. Where that composition record should live and its exact stored shape. No array index/label/sentinel as durable identity.
2. What **real mutation/settle action** creates/activates it and therefore may reserve/bind CZTU/CZTEU. Do not claim `settleComposableOccupant()` unless the base relationship is actually present there.
3. Whether existing Admin/customer-policy data already expresses the base relationship. If not, say explicitly that a minimal Package-domain composition declaration must be introduced before identity minting; do not fabricate it from cart coexistence.
4. How quote creation selects an already-existing CZTU/CZTEU and snapshots base CZT/CZTE + source composable identity + Upgrade identity + Legs/Rate Sheet identities.
5. Legacy behavior when no Upgrade composition declaration exists: current composable flow must continue unchanged until intentionally migrated/configured; no read-time mint/backfill.
6. Correct Platform Identifier adapters/native refs/migration Station coverage for this actual record.
7. Give one smallest implementation phase. **Do not implement yet.**

## Branch hygiene
Claude verified both remaining review branches are completed/superseded. Nath may delete them because Claude's environment blocks deletion:
`review/composable-tier-customer-ux` and `review/quote-email-billed-item-separators`.
The latter contains an unrelated old test-only DI fix not on main; do not merge its stale branch. If that test is later worth fixing, open a separate current-main work item.

After the corrected ownership audit, set **AWAITING CHATGPT REVIEW**. No source push.

---

# Corrected audit

Acknowledged: the contradiction is real. `settleComposableOccupant()` settles exactly one record — `instance.composable_occupant`, shaped identically to an ordinary Tier occupant via `PackageSchema::ensureTierLifecycle()` (`TierInstanceSchema.php:158-159`) — and that record carries **no base-occupant/Edition reference at all**. It cannot be the mint site for an identity whose native reference includes a base occupant, because at that settle call the base occupant is not an input, a stored field, or derivable from anything in scope. Claiming otherwise was the error. Corrected below.

## 1. Where the composition record lives — it does not exist yet, and must be introduced explicitly

No Package-domain record today expresses "this composable offer upgrades base occupant X" (or a specific base Edition). `resolveComposableOfferSelection()` (`PackageRepository.php:2567-2620`) resolves the one `composable_occupant` for the whole Tier Instance with no base-occupant parameter — every base occupant in that Instance is implicitly, undifferentiatedly eligible. This is not a hidden fact to extract; it is a genuine absence. Per the skill's own rule ("if not, say explicitly that a minimal Package-domain composition declaration must be introduced before identity minting; do not fabricate it from cart coexistence") — a **new admin-authored declaration** must be added:

`instance.composable_occupant.upgrade_pairings[]` — a new list, alongside the composable occupant's existing fields, each entry:
```
{ id: string,               // admin-assigned pairing key, e.g. 'default' for the first/only pairing — mirrors Leg's own 'default'-vs-named precedent, never array position
  base_occupant_id: string, // the base Tier occupant this pairing upgrades (required)
  base_edition_id: string|null, // the specific base Edition, when the pairing is Edition-derived; null for Tier-derived
  platform_id: string|null  // CZTU or CZTEU — engine-minted only, empty until settled
}
```
This is structurally closer to `legs[]` under an occupant (a list of admin-authored, id-keyed entries, each independently reserved/bound in a loop — see `reserveTierLegPlatformIds()`, `PackageStationController.php:781-810`) than to `CZTE`'s single scalar field. The settle-boundary and occupant-qualification *principle* CZTE demonstrates still applies (identity attaches to a real admin decision, never to array position); the *storage/adapter mechanics* should follow the Leg-list precedent instead — this was the second inaccuracy in the original audit (borrowing CZTE's mechanics for what is actually list-shaped data).

`base_occupant_id`/`base_edition_id` must be validated against real occupant/Edition records in the same Tier Instance at settle time (never a free-text/dangling reference) — this is ordinary payload validation, not identity work.

## 2. Real mutation/settle action

Extend `settleComposableOccupant()`'s own request payload to accept `upgrade_pairings[]` as part of the composable occupant's settled state — the same call that already settles that occupant's own `CZT`/`CZTL` gets a new, additional loop (mirroring `reserveTierLegPlatformIds()`'s existing loop shape exactly) that reserves `CZTU` (when `base_edition_id` is null) or `CZTEU` (when it is set) for each pairing entry that is new or needs reconciliation, reserve-before-persist / bind-after-persist, identical choreography to every other identity this endpoint already mints. This is the correct fix for the original contradiction: the settle action now genuinely has the base-occupant/Edition data in its own request payload, because that data is now what it settles — it is no longer inferred from anywhere else.

`rejectPlatformIdMutation()`'s guarded field list is extended to reject any client-supplied `platform_id` inside an `upgrade_pairings[]` entry, same as every other identity field.

## 3. Does existing Admin/customer-policy data already express this? No.

Confirmed absent: `composable_occupant` is `ensureTierLifecycle()`-shaped (identical structural treatment to any ordinary Tier occupant, `TierInstanceSchema.php:158-159`) — no eligibility/pairing field of any kind exists on it today, and no other Admin/customer-policy record (Tier occupant, Edition, customer-policy drawer) references the composable occupant either. `upgrade_pairings[]` is a genuinely new declaration, not an extraction of something already stored under a different name. Every existing Tier Instance's composable occupant has an empty list until an admin explicitly adds one.

## 4. Quote-time consumption — select, never mint or infer

At Add-to-Quote time, given the primary item already in cart (its own `tierOccupantId` + `tierEditionPlatformId`), the composable-offer resolution path looks up `composable_occupant.upgrade_pairings[]` for an entry matching that exact `(base_occupant_id, base_edition_id)` pair (Edition-exact match required for an Edition-derived pairing; a Tier-derived pairing — `base_edition_id: null` — matches regardless of the primary's Edition). If a match exists and carries a bound `platform_id`, that already-minted `CZTU`/`CZTEU` is copied onto the composable `FamilyTierQuoteItem` (new field, e.g. `upgradePlatformId`) alongside the two new base-reference fields identified in the original audit (`baseOccupantPlatformId`, `baseTierEditionPlatformId` — still needed, since nothing today records which primary a composable line pairs with; this part of the original audit was correct and stands). If no match exists, the item carries `upgradePlatformId: null` and behaves exactly as it does today — no fallback derivation, no on-the-fly identity. This is a pure read (`resolveComposableOfferSelection()`'s own read path, extended to also read the matching pairing entry) — it never calls `reserve()`/`bind()`.

`RequestSchema.php` then copies `baseOccupantPlatformId`/`baseTierEditionPlatformId`/`upgradePlatformId` verbatim into the durable Request snapshot, same copy-only treatment as `CZT`/`CZTE` already receive — unchanged from the original audit's §5/§7.

## 5. Legacy behavior

Every existing Tier Instance's `composable_occupant.upgrade_pairings` is absent/empty until an admin explicitly declares one via the extended settle payload. Until then: `resolveComposableOfferSelection()` finds no matching pairing, the composable item carries `upgradePlatformId: null`, and the entire existing composable/Build-Your-Own flow (cart, TCV, PDF/email/View-Print, Request storage) is byte-for-byte unchanged — CZTU/CZTEU is purely additive, opt-in per Tier Instance, never backfilled or inferred at read time.

## 6. Platform Identifier wiring (corrected)

1. `PlatformIdentifierPolicy.php`: `TIER_UPGRADE`→`CZTU`, `TIER_EDITION_UPGRADE`→`CZTEU` — unchanged from original audit, collision-safe under the anchored-length regex.
2. `PackagePlatformNativeReference.php`: `tierUpgrade(tier_instance_id, composable_occupant_id, base_occupant_id, upgrade_id)` and `tierEditionUpgrade(..., base_edition_id, upgrade_id)` — keyed on the **pairing**, not on the composable occupant alone and not on the base occupant alone (both are needed to identify which specific pairing this is).
3. `PackageRepository.php`: read/claim/exists/enumerate/project methods that locate one `upgrade_pairings[]` entry by its native-reference tuple and read/write that entry's own `platform_id` — mirroring the Leg adapter's per-entry-in-a-list mechanics (`reserveTierLegPlatformIds()`/`bindTierLegPlatformIds()`, `PackageStationController.php:781-841`), not `tierEditionPlatformId()`'s single-scalar mechanics.
4. `PackagePlatformIdentifierAdapters.php`: `tierUpgrade()`/`tierEditionUpgrade()` factories wrapping those five callbacks, same shape as every existing factory.
5. `PackageStationController.php`: the new reserve/bind loop inside `settleComposableOccupant()` (§2).
6. `TemporaryMigrationController.php`: two new `ENTITY_TYPES` entries + `adapterFor()` arms + a progress-option version bump, same as originally audited — unaffected by this correction.

## 7. Compatibility

Unchanged from the original audit (§7 there stands): non-composable items untouched, pre-existing composable Requests render exactly as today (now additionally guaranteed by §5's empty-pairings-list legacy behavior), accepted upgrade-journey presentation reads none of these fields.

## 8. Smallest implementation phase

**Phase 0 (new, smaller than the original Phase 1) — the declaration mechanism itself, Tier-derived only, no quote-time consumption yet.** Add `upgrade_pairings[]` to the composable occupant's settled shape, extend `settleComposableOccupant()` to reserve/bind `CZTU` per new pairing (§2), wire the Platform Identifier plumbing (§6). Prove, purely at the admin/catalog layer, that an admin can declare "base occupant X may Upgrade via this composable offer" and get back a stable, reconciliation-safe `CZTU` — with zero change to any customer-facing surface, since nothing reads `upgrade_pairings[]` yet. Tests: a `PackageStationController`-level settle test proving a new pairing mints `CZTU` once, a repeat settle with no change reconciles rather than re-mints, and an invalid `base_occupant_id` is rejected at validation, not silently stored.

**Phase 1 (original Phase 1, now correctly grounded) — quote-time consumption, Tier-derived.** Wire §4: Add-to-Quote resolution reads `upgrade_pairings[]` for a match, stamps `baseOccupantPlatformId`/`upgradePlatformId` onto the composable quote item, `RequestSchema.php` copies both through. Tests: extend `composable-quote-cart-contract.ts` proving a matched pairing's `CZTU` survives quote→Request, and proving an unmatched (legacy/undeclared) Tier Instance still produces `upgradePlatformId: null` with no other behavior change.

**Phase 2 — `CZTEU` (Edition-derived), deferred**, exactly as originally audited: needs `base_edition_id`-scoped pairings (already included in §1's shape above) plus admin UI to author them; no further identity-engine work beyond Phase 0/1's adapter already handling the Edition-scoped case.

No implementation performed in this round.