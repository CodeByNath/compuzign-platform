# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — audit complete; no source changes made**
- Auditor verdict (prior round): **Proceed with safeguards**
- Production baseline: `main@28f716b1bde85717787418e29efbbf8dce978d3c` (unchanged this round).
- Previous cart/quote/PDF/email/View-Print/order flow is accepted live and was not reopened.
- Flags one open decision before any implementation: see "Central classification question" below.

## Locked identity law
Upgrade identity is additive, never substitutive.
- Tier-derived Upgrade must preserve base Tier occupant `CZT` and gain its own permanent `CZTUxxxxx`.
- Edition-derived Upgrade must preserve base Tier occupant `CZT` + exact Edition `CZTE` and gain its own permanent `CZTEUxxxxx`.
- Existing Tier Group/Instance, Commercial Leg and Rate Sheet row/option identities remain intact internally.
- `CZTU/CZTEU` must never replace, copy, flatten, or masquerade as any composing identity.
- Future `CZTC/CZTEC` Custom/New Build is out of scope.

Canonical architecture skill requires ownership audit first. Current `PlatformIdentifierPolicy` has no CZTU/CZTEU families. Current composable quote path still uses `FamilyTierQuoteItem` + `isComposable` + customer sentinel and explicitly has no higher-order Upgrade Platform ID.

## Claude task — audit before implementation
Read current `main`, root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, and `skills/compuzign-platform-architecture` references. Report in this same file:
1. **Ownership table** for CZTU/CZTEU: identity infra, native lifecycle/mutation owner, persistence, projection, pricing, presentation.
2. **Exact native reference shape** for Tier Upgrade and Edition Upgrade. It must be stable and not index/label/sort based.
3. **Mint boundary**: identify the existing mutation/settle boundary where the permanent Upgrade identity can be reserved/bound. Do not mint during preview/read/projection.
4. **Lifecycle**: when an Upgrade is created, changed, replaced, submitted, reopened, archived/cancelled; whether identity survives quote→Request→future Order. Explain why the proposed owner is correct.
5. **Composition snapshot**: prove stored Upgrade can independently answer Tier Group/Instance, base CZT, exact CZTE when applicable, CZTU/CZTEU, Legs and Rate Sheet rows/options without exposing internal IDs to customer-safe projections.
6. **Platform Identifier wiring** needed: Policy constants/prefixes, adapter factory/native reference helper, migration/repair Station coverage, collision/claim/persist/project path. No second identity engine or custom backfill.
7. **Compatibility**: existing normal Tier/Add-on/composable cart, TCV, PDF/email/View-Print, Request/order reconstruction, idempotency and legacy quote behavior must remain unchanged.
8. Recommend one phase-bounded implementation slice and tests. Do not implement yet.

## Branch hygiene

Done:
- Deleted (local, fully merged into `main`, no remote copy existed): `phase/composable-tier-occupant`, `review/composable-live-correction-round`, `review/composable-quote-cart-connection`, `review/composable-request-pdf-email`, `review/composable-tier-admin-customer-policy`, `review/composable-tier-admin-ux`, `review/composable-tier-customer-policy`, `review/crm-1c-request-actions`.
- `review/upgrade-journey-finalisation` already deleted (local+remote) in the prior closed round.

Pending (Nath to run — Claude's session auto-mode classifier hard-blocks `branch -D`/remote branch deletion, same class of block as the earlier force-push):
```
git branch -D review/composable-tier-customer-ux
git push origin --delete review/composable-tier-customer-ux
git branch -D review/quote-email-billed-item-separators
git push origin --delete review/quote-email-billed-item-separators
```
- `review/composable-tier-customer-ux` (`83f5dbcd`): verified — its one unique commit only adds a standalone `.mjs` regression script + a `package.json` script entry, never wired into any active suite. Test-only, safe to delete per this doc's instruction.
- `review/quote-email-billed-item-separators` (`add030a7`/`bf727fc7`): verified — the billed-item-separator feature commit (`bf727fc7`) is superseded (current `NotificationTemplates.php` already has per-item-block border/background separation from later rounds). **But** its other commit, `add030a7` ("Fix two pre-existing tests broken by CRM-1A's RequestsController DI"), fixes `tests/quote-view-email-link.php`, which is **currently broken on production `main`** (constructor-arity error — I hit this exact failure independently in the prior upgrade-journey round and flagged it then as "pre-existing, unrelated"). Deleting the branch does not un-break the test. I saved a patch of `add030a7` to my local scratchpad before flagging this so the fix isn't lost; porting it is out of scope for this audit-only round and needs its own work item/approval.

Preserved: `main`, `Project-work-instructions`.

---

# Audit: CZTU / CZTEU

## Central classification question — resolve before any implementation

The locked identity law's own wording ("gain its own permanent `CZTUxxxxx`") is compatible with two structurally different readings, and the codebase's existing law strongly favors one of them. This is the first thing to confirm, because it decides every other answer below.

- **Reading A — catalog-level Upgrade-offer identity** (mirrors `CZTE` exactly). An admin, authoring the Package/Tier catalog, defines a Composable Upgrade offer scoped to a base Tier occupant (or a specific Edition) — one shared identity per catalog offer, reused by every customer who selects it. Minted at a Package/Tier settle boundary, exactly like `CZTE` is minted when an Edition activates.
- **Reading B — per-customer purchase-instance identity**. Each individual customer's own act of adding a Composable Upgrade to their cart/Request gets its own unique `CZTU`. This would be a new kind of Platform ID nothing else in the vocabulary currently is: every existing prefix (`CZT`, `CZTA`, `CZTE`, `CZTL`, `CZTEL`, `CZPRC*`) is catalog identity, minted once and shared across every buyer; the only per-customer identity that exists today is the Request container itself (`CZR`), which explicitly **never** mints or invents commercial identity — `RequestSchema.php` copies every commercial Platform ID verbatim from the quote-time snapshot, it reserves nothing.

**Recommendation: Reading A.** It is the only reading consistent with the existing law ("identity is written only at a settle/mutation boundary" + "Requests never re-mint commercial identity, only copy it") and has a direct structural precedent (`CZTE`) to extend rather than invent. Reading B would require introducing a wholly new class of Platform ID (per-purchase, not per-catalog-offer) with no precedent anywhere in `PlatformIdentifierPolicy` today — a materially bigger architectural decision than "add two prefixes," and not something to default into silently. **This audit proceeds under Reading A; if Reading B is actually what's wanted, that must be said explicitly before any implementation, since it changes nearly every answer below.**

## Critical gap found — today's composable item is keyed to the wrong occupant

Under Reading A, `CZTU`'s native reference must be anchored on the **base** (primary) occupant being upgraded — that's what "preserve base Tier occupant CZT" means. But today, `buildComposableFamilyTierQuoteItem()` (`ComposableOfferBrowser.tsx:220-288`) populates `tierOccupantId`/`tierPlatformId` on the composable quote item with the **composable catalog occupant's own** CZT/CZTA (a single fixed slot per Tier Instance, shared by every buyer) — never the specific primary occupant it is being purchased alongside. `tierEditionPlatformId` is hardcoded `null` on every composable item regardless of which Edition the primary is on. Nothing stored anywhere (`FamilyTierQuoteItem`, `RequestSchema.php`) records "this Upgrade extends occupant X" — "coexists with a primary" is a derived, render-time fact (`composableCoexistsWithPrimary()`, `utils/quote.ts:63-69`) computed fresh from live cart state by Family+Tier-Instance system co-membership (`CZPG`+`CZTG` only), not a stored composition.

**This means CZTU/CZTEU cannot be minted onto the existing item as-is** — the field that should anchor the composition (which base occupant/Edition this Upgrade extends) doesn't exist in storage yet. A new field (e.g. `baseOccupantPlatformId` and, for the Edition-derived case, `baseTierEditionPlatformId`) must be added to `FamilyTierQuoteItem` and `RequestSchema.php` before CZTU/CZTEU minting is even possible, captured at Add-to-Quote time from the sibling primary item already in the cart (the same identity `replaceFamilyNormalQuoteItem()`'s own `baseChanged` check already uses: `tierOccupantId` + `tierEditionPlatformId`, `utils/quote.ts:159-177`). This is very likely the reason this work has been described as blocking — the identity model this doc asks for needs a durable fact that today simply isn't captured anywhere.

## 1. Ownership table

| Column | Owner | Notes |
|---|---|---|
| Identity infra | `PlatformIdentifierStation` + `PlatformIdentifierPolicy` (unchanged, generic — add 2 constants + 2 prefix entries only) | Exact-length anchored regex makes `CZTU`/`CZTEU` collision-safe against `CZT`/`CZTA`/`CZTE`/`CZTG`/`CZTL`/`CZTEL` (different total lengths under the anchored full-string match) — no alphabet trick needed, same reasoning already documented in `PlatformIdentifierPolicy.php` for `CZTL`/`CZTEL`. |
| Native lifecycle/mutation owner | `PackageStationController.php` — the existing Composable settle endpoint (`settleComposableOccupant()`, `:2617`), extended | This is the closest existing analogue to "activate a catalog-level Upgrade offer" (mirrors `updateComposableOccupantEditionStatus()`'s `STATUS_ACTIVE`-gated `CZTE` mint at `:3039`). It is **not** a new controller — extend the existing one, per the skill's "reuse existing infrastructure, never invent a parallel mechanism" rule. |
| Persistence | `PackageRepository.php` (catalog side, mirroring `tierEditionPlatformId()`/`claimTierEditionPlatformId()` at `:974`/`:980`) for the catalog offer's own `CZTU`/`CZTEU`; `RequestSchema.php` (customer side) for the **new** `baseOccupantPlatformId`/`baseTierEditionPlatformId` fields plus the copied `CZTU`/`CZTEU` snapshot value — never re-minted there. |
| Projection | `PackagePlatformIdentifierService::resolveProjection()` pattern (pure read, `project()` callback) for admin/catalog lookup; `QuoteViewAccess.php`'s existing customer-safe allow-list (currently strips Leg `source`, `:42-44`) extended to also exclude `CZTU`/`CZTEU`'s own internal linkage fields if any are added beyond the Platform ID itself — the Platform ID string can stay customer-visible (it already is, for `CZT`/`CZTE`), only internal native-reference components must not leak. |
| Pricing | Unchanged — `PackageManagerSchema.php` stays the one price engine; `CZTU`/`CZTEU` is a pure identity/composition concern layered over already-priced Rate Sheet rows via the existing Leg/composable-offer machinery, never a second pricing path. |
| Presentation | `FamilyTierAdapter.tsx` / `ComposableOfferBrowser.tsx` (customer cart) and `PlanDetailsModal.tsx`/`QuoteProposalPreview.tsx`/`NotificationTemplates.php` (detail/print/email) stay read-only mirrors — they consume the new fields, never invent or derive identity client-side. |

## 2. Native reference shape

Mirroring `CZTE`'s own occupant-qualified (not slot/index-qualified) shape, and `CZTL`/`CZTEL`'s `'default'`-vs-named-Leg precedent for the case where only one Upgrade offer exists per base occupant today:

- **`CZTU`** (Tier-derived): `(tier_instance_id, occupant_id, upgradeId)` via a new `PackagePlatformNativeReference::tierUpgrade()`, composite-encoded exactly like `tierEdition()`/`tierLeg()` (`PackagePlatformNativeReference.php`). `occupant_id` here is the **base** occupant being upgraded (see the gap above) — not the composable catalog occupant. `upgradeId` defaults to the literal `'default'` for Phase 1 (today's model has exactly one composable offer per Tier Instance), leaving room for a named/multiple-offers extension later without a breaking change — the identical shape `CZTL` already uses.
- **`CZTEU`** (Edition-derived): `(tier_instance_id, occupant_id, editionId, upgradeId)` — one level deeper than `CZTU`, exactly mirroring how `CZTEL` sits one level deeper than `CZTL` under the Edition. `editionId` is the specific base Edition being upgraded.

Both are stable (built from Platform-ID-bearing native keys, never array position/sort/label) and structurally distinguishable from every existing prefix under the anchored-full-string validation rule.

## 3. Mint boundary

Reserve + bind inside the existing `settleComposableOccupant()` mutation path (`PackageStationController.php:2617`), mirroring the exact choreography already proven for `CZT`/`CZTA`/`CZTL` in `settlePackageStationTier()` (`:2227`) and for `CZTE`/`CZTEL` in `updateComposableOccupantEditionStatus()` (`:3007`): reserve pre-persist, persist the slot, bind post-persist, with `rejectPlatformIdMutation()`'s guarded field list extended to include the new id field names so they stay engine-minted/output-only. This is a `POST .../composable/settle` REST boundary — never `getPackageStation()`'s `GET` read path, never a customer-facing quote/cart read. Confirmed pattern: every one of the 13 existing `reserve()` call sites in this controller sits inside a `POST`-registered handler; zero sit inside a `GET` handler.

**Do not** mint at Add-to-Quote time or at Request-submission time — both are customer-facing mutable/re-derivable states (a customer can freely change or remove a composable selection pre-submission; a Request explicitly never mints commercial identity, only copies it, per §"Central classification question" above).

## 4. Lifecycle

Under Reading A (catalog-level Upgrade-offer identity):
- **Created**: when an admin activates a Composable Upgrade offer for a base Tier occupant (Tier-derived) or a specific Edition (Edition-derived) via the extended settle endpoint — mirrors `CZTE`'s own `STATUS_ACTIVE`-gated mint exactly.
- **Changed**: the underlying offer configuration (which Rate Sheet rows/Legs it composes) can change without re-minting — same as `CZTE`/`CZTL` today, identity survives configuration edits to the same slot.
- **Replaced**: if the Upgrade offer is retargeted to a different base occupant/Edition entirely, that is a **new** composition (new base identity) and must mint a **new** `CZTU`/`CZTEU`, never reassign the old one — per the skill's "never flatten a higher-order composition back into its source identity" and "reject position/index/label as identity" rules; retargeting is a new base-occupant reference, not a rename.
- **Submitted** (customer adds it to cart/Request): the `CZTU`/`CZTEU` Platform ID is copied into the quote-time snapshot and then into the durable Request — same "copy, never re-mint" treatment every other commercial Platform ID already gets in `RequestSchema.php`.
- **Reopened / archived / cancelled**: Request status transitions (`pending`→`approved`/`cancelled`, `RequestLifecycle.php:12-20,58-70`) touch **no** identity field at all today (confirmed: zero `platform_id` writes anywhere in `RequestRepository::updateStatus()`), and `CZTU`/`CZTEU` should follow the same rule — a Request's approval/cancellation never mutates the catalog offer's own identity, it only reads the already-copied snapshot value.
- **Quote → Request → future Order**: no "Order" entity exists anywhere in this codebase today (confirmed by broad grep — the only hit is `OrderSummary.tsx`, a UI panel with no persistence/schema/identity of its own). `CZTU`/`CZTEU` survives quote → Request exactly like `CZT`/`CZTE` do today (added to `RequestSchema.php`'s existing allow-list, §5 below); if an Order entity is ever built, it would receive `CZTU`/`CZTEU` the same copied-snapshot way it will presumably receive `CZT`/`CZTE`/`CZTG`/`CZPG` — no special-casing needed because the identity is catalog-level and stable regardless of which container currently references it.

**Why this owner is correct**: it is the only boundary in the codebase that (a) is mutation-only, never read/preview, (b) already mints structurally identical occupant/Edition-qualified identity (`CZTE`) at the exact same gate (`STATUS_ACTIVE`), and (c) keeps the Request/quote layer exactly as identity-inert as it already is everywhere else (copy-only, never mint).

## 5. Composition snapshot

A stored Upgrade selection (once the new `baseOccupantPlatformId`/`baseTierEditionPlatformId` fields exist, per the gap above) can independently answer, without exposing internal native references:

- Tier Group/Instance → `tierInstancePlatformId` (`CZTG`) — already stored, unchanged.
- Family → `familyPlatformId` (`CZPG`) — already stored, unchanged.
- Base Tier occupant → `baseOccupantPlatformId` = the primary's own `CZT` — **new field**.
- Exact base Edition, when applicable → `baseTierEditionPlatformId` = the primary's own `CZTE` — **new field**, null for a Tier-derived Upgrade.
- The Upgrade composition itself → `upgradePlatformId` = `CZTU` or `CZTEU` — **new field**, engine-minted only (never client-writable, per `rejectPlatformIdMutation()`'s pattern).
- Legs/Rate Sheet rows the Upgrade composes → already flow through the existing `commercialBreakdown`/`cartBreakdown`/`legPaymentSummaries` snapshot machinery untouched; `legPaymentSummaries[].source` (`CZTL`/`CZTEL`) is already durable-but-admin-only per `QuoteViewAccess.php:42-44`'s existing customer-safe strip — no new stripping logic needed, `CZTU`/`CZTEU` joins the same allow-list as `CZT`/`CZTE` (customer-visible, since those already are) while any raw native-reference component (e.g. a bare `occupant_id`) stays server-side only, exactly like today.

This never requires re-deriving the composition from live catalog state — every fact above is a stored Platform ID string, matching the existing "customer-safe ID boundary" the accepted upgrade-journey round already established and must not reopen.

## 6. Platform Identifier wiring needed

1. `PlatformIdentifierPolicy.php`: two constants (`TIER_UPGRADE`, `TIER_EDITION_UPGRADE`) + two `PREFIXES` entries (`CZTU`, `CZTEU`) — collision-checked as in §2.
2. `PackagePlatformNativeReference.php`: two new factory methods (`tierUpgrade()`, `tierEditionUpgrade()`), same composite-encoding helper every existing shape uses.
3. `PackageRepository.php`: read/claim/exists/enumerate/project methods for the new fields, mirroring `tierEditionPlatformId()`/`claimTierEditionPlatformId()`/`tierEditionPlatformIdExists()`/`tierEditionAssignmentPage()`/`tierEditionProjection()` exactly (`:974,980,1053,1072,1098`).
4. `PackagePlatformIdentifierAdapters.php`: two new factory methods (`tierUpgrade()`, `tierEditionUpgrade()`) wrapping the five callbacks above into `PackagePlatformIdentifierAdapter` instances — same shape as `tierEdition()` (`:61-74`).
5. `PackageStationController.php`: reserve/bind calls added inside the extended `settleComposableOccupant()` (§3), `rejectPlatformIdMutation()`'s field list extended.
6. `TemporaryMigrationController.php`: two new `ENTITY_TYPES` entries + two new `adapterFor()` match arms, plus a progress/lock option version bump (the same `_v3`→`_v4` precedent already used when `TIER_LEG`/`TIER_EDITION_LEG` were added) so an already-`complete` install re-runs dry-run for the new scope rather than reporting stale completeness. Note in passing (unrelated pre-existing gap, flagging for awareness only, not in scope to fix here): `TIER_EDITION` itself is currently **absent** from `ENTITY_TYPES` — only its Leg is present — so this repair tool's coverage has historically lagged new entity types by design/oversight.

No second identity engine, no custom backfill script — everything routes through the existing `PlatformIdentifierStation`/`TemporaryMigrationController` machinery per the skill's explicit rule.

## 7. Compatibility

- Existing normal Tier/Add-on cart, TCV, PDF/email/View-Print, Request reconstruction, idempotency, and legacy quote fallback: **unaffected** — `CZTU`/`CZTEU` is purely additive to the `family_tier` composable branch; non-composable items carry no new fields and are untouched.
- A **pre-existing** composable Request (created before this identity is wired) has `isComposable: true` but no `baseOccupantPlatformId`/`upgradePlatformId` — must render exactly as it does today (no retroactive backfill assumed without an explicit migration decision; this is analogous to the already-proven "legacy cart item with no `cartBreakdown`" fallback pattern in `disclosureRowsForFamilyTierItem()`).
- The already-accepted, must-not-reopen upgrade-journey customer presentation (compact sidebar, `Until Cancelled` wording, detailed print/email) reads none of these new fields and needs zero changes.

## 8. Recommended phase-bounded slice

**Phase 1 — `CZTU` only (Tier-derived), matching today's exact data model.** Today there is exactly one composable offer per Tier Instance, invariant to Edition (`resolveComposableOfferSelection()` reads `$instance['composable_occupant']` directly, no Edition parameter) — so Phase 1 needs zero new admin-authoring capability, only identity wiring (§6 steps 1-6, scoped to `CZTU`) plus the two new snapshot fields (§5) captured at Add-to-Quote time from the sibling primary already in cart. Tests: extend `composable-quote-cart-contract.ts` with a fixture proving `baseOccupantPlatformId`/`upgradePlatformId` survive quote→Request unchanged, plus a `PlatformIdentifierPolicy` contract-style check proving `CZTU` cannot collide with `CZT`/`CZTA`/`CZTG` under the anchored regex (mirroring the existing collision-safety tests for `CZTL`/`CZTEL`).

**Phase 2 — `CZTEU` (Edition-derived), deferred.** This needs a real admin-authoring capability that does not exist yet: today's composable offer cannot be scoped per-Edition at all (one slot per Tier Instance, not per Edition) — Phase 2 must first extend the composable-offer configuration model to be optionally Edition-scoped before `CZTEU` minting is even meaningful, a materially bigger change than Phase 1's pure identity wiring. Do not attempt both phases in one slice.

No implementation performed in this round.