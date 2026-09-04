# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Upgrade Journey Finalisation state/transition plan recorded, no source changed.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that exact SHA.

## Accepted live state retained
- Request/Review right rail: `max-height:96%`, bottom padding `0`, help padding `16px`.
- `.cz-rf-left` and `.cz-rf-right` remain scrollable but scrollbar chrome is hidden.
- Previous composable architecture, pricing, resolver, Rate Sheet, identity, Request persistence/email and quote snapshot rules stay locked.
- Remaining representation checks (Upgrades label, composable Quote Details, Admin Request detail, proposal/PDF/public quote exact-once, totals once, no raw IDs) still need closure.

## New required phase — Upgrade Journey Finalisation
Nath clarified that **Upgrade your build** and standalone **Build Your Own** are different customer journeys.

### Upgrade journey
1. Starts only from an already-selected normal Tier/Edition.
2. Customer enters **Upgrade your build** and adds/removes only Admin-authorised composable inclusions/quantities.
3. While in this journey, the upgrade composition is **dependent on the selected base Tier/Edition**. It must not silently survive as an independent Build Your Own line if that base is removed/replaced.
4. Customer gets an explicit **Finalise build** transition.
5. Finalising converts the working `base plan + upgrades` configuration into the final **Build Your Own** quote representation/snapshot.
6. After finalisation it behaves as the composed Build Your Own result, not as “primary + loose upgrades”.

### Standalone Build Your Own — deferred
Do **not** design or implement the standalone Build Your Own journey yet. Nath explicitly wants that as a separate journey later; it should not simply load alongside the normal Tier cards. We will plan that only after the Upgrade journey is established.

## Important current mismatch to audit
Current cart code deliberately treats the composable line as independent:
- `upsertFamilyComposableQuoteItem()` is independent of the primary;
- `removeFamilyTierSystemQuoteItems()` preserves composable when primary is removed;
- `composableCoexistsWithPrimary()` derives the current “Upgrades” label contextually from coexistence.
That is insufficient for the new behavioral distinction because removal/replacement of the primary can change semantics implicitly.

## Claude instruction — audit/plan only first
Before editing source, audit the current customer/cart/quote/request paths and propose the **smallest explicit quote-time state/transition** needed to represent:
- in-progress upgrade tied to an exact base Tier/Edition;
- explicit Finalise Build transition;
- final composed Build Your Own snapshot;
- safe behavior if base Tier/Edition is removed/replaced before finalisation.

Do not create a new platform entity, second Tier System, customer-owned Legs, or mutate the published composable occupant. Keep this as bounded quote/customer workflow semantics. Do not start standalone Build Your Own UX or the final broad UI/UX refinement yet.

Record the proposed state shape, mutation rules, affected files, persistence/request/PDF implications, migration/legacy handling, and focused contracts in this same file. Set **AWAITING CHATGPT REVIEW**. No source push to `main`.

## Claude audit/plan — Upgrade Journey Finalisation (no source changed)

### What already exists (read from `main@aa820596`, not implemented here)
- `ComposableOfferBrowser` already receives a `context: 'build_your_own' | 'upgrade_your_build'` prop, computed by `FamilyTierAdapter.tsx` as `selectedTierId === null ? 'build_your_own' : 'upgrade_your_build'` — the two journeys are already distinguished at the UI layer, but the constructed cart item carries no memory of which one produced it.
- `onCommit` (`ComposableOfferBrowser.tsx`) auto-fires on every interaction (debounced), immediately calling `upsertFamilyComposableQuoteItem()` — there is no existing "Add"/"Finalise" gesture; the composable line is always live-synced to the browser's current selection.
- `PackageBuilderApp.tsx` wires: `add()` → `replaceFamilyNormalQuoteItem` (switch primary Tier/Edition), `removePrimary()` → `removeFamilyTierSystemQuoteItems` (drop primary+add-ons, **never** touches composable), `addComposable()`/`removeComposable()` → `upsertFamilyComposableQuoteItem`/`removeFamilyComposableQuoteItem`.
- `resolveQuoteItemRole()` is the single source of truth for `primary`/`addon`/`composable`; `composableCoexistsWithPrimary()` is a **pure, render-time-only** derivation (never stored) that `OrderSummary.tsx`/`QuoteSummary.tsx` use to show "Upgrades" instead of "Build Your Own" — it just checks whether a sibling primary for the same `familyId`+`tierInstanceId` currently exists.
- `RequestSchema.php::sanitizeCartItems` (or equivalent) builds the persisted `family_tier` snapshot as a strict explicit per-field allow-list — it copies `isComposable` etc. one field at a time from raw input; anything not explicitly copied is silently dropped. This means a new client-only field is safe by construction: it can never reach persistence/PDF/email unless a line is deliberately added to carry it through.

### Why today's behavior is insufficient
`removeFamilyTierSystemQuoteItems()` deliberately preserves the composable line when the primary is removed — correct for a **finalised**/standalone Build Your Own line (which must survive on its own), but wrong for an **in-progress upgrade** draft, which per the new requirement must not silently survive its base being removed or swapped for a different Tier/Edition. Nothing in the current model distinguishes "draft, tied to a specific primary" from "finalised, independent" — both are just `isComposable: true`.

### Proposed state shape — smallest addition
One new optional field on `FamilyTierQuoteItem` (`types.ts`), meaningful only when `isComposable === true`:

```ts
/**
 * Present only on an in-progress "Upgrade your build" composable line that
 * has not yet been explicitly finalised: the exact base Tier/Edition it was
 * built against, captured at the moment of last commit while still a draft.
 * Absent for a standalone ("Build Your Own", no primary) composable line,
 * and cleared once finaliseUpgradeQuoteDraft() converts a draft into the
 * final composed result — at that point it is indistinguishable from
 * today's unconditionally-surviving composable line.
 */
upgradeDraftBase?: { tierPlatformId: string; tierEditionPlatformId: string | null } | null;
```

No new platform entity, no second Tier System, no customer-owned Legs, no mutation of the published composable occupant — this is a plain optional field on the existing client-side cart-item shape, exactly like `planDurationMonths`/`composableSelection` before it.

### Proposed mutation rules (`utils/quote.ts`)
1. **`composableDraftIsStale(item, items): boolean`** — new pure predicate: true iff `resolveQuoteItemRole(item) === 'composable'`, `item.upgradeDraftBase` is set, and no line in `items` is a `primary` for the same `familyId`+`tierInstanceId` whose `tierPlatformId`/`tierEditionPlatformId` matches `upgradeDraftBase`. Covers both "removed" (no primary at all) and "replaced" (a primary exists but for a different Tier/Edition) in one check.
2. **`replaceFamilyNormalQuoteItem()`** and **`removeFamilyTierSystemQuoteItems()`** each gain one additional filter clause: also drop the composable line for that `familyId`+`tierInstanceId` if `composableDraftIsStale()` is now true for it. A finalised line (no `upgradeDraftBase`) is never touched — byte-identical to today's behavior for every existing/legacy cart.
3. **`finaliseUpgradeQuoteDraft(items, familyId, tierInstanceId): CartItem[]`** — the explicit "Finalise build" transition: find the composable line for that Family+Instance; if absent or `composableDraftIsStale()`, return `items` unchanged (a no-op — the UI should gate the Finalise action on validity, never call this on a stale/absent draft); otherwise remove the primary+add-ons via the existing `removeFamilyTierSystemQuoteItems()` and replace the composable line with a copy that has `upgradeDraftBase: undefined` — per requirement 6, finalising folds "primary + upgrades" into the one composed Build Your Own result rather than leaving three coexisting lines.
4. `composableCoexistsWithPrimary()` needs **no change**: once `finaliseUpgradeQuoteDraft()` removes the primary, the existing "does a sibling primary exist" check already returns false on its own, so the label correctly flips from "Upgrades" to "Build Your Own" with zero new logic.
5. **Where `upgradeDraftBase` gets set:** `buildComposableFamilyTierQuoteItem()` (`ComposableOfferBrowser.tsx`'s commit builder) takes the `context` it already receives, plus (when `context === 'upgrade_your_build'`) the current primary's `tierPlatformId`/`tierEditionPlatformId`, and stamps `upgradeDraftBase` on every live-committed item while `context === 'upgrade_your_build'`; `context === 'build_your_own'` always produces `upgradeDraftBase: undefined`, leaving that deferred journey's behavior exactly as it is today.

### Affected files (implementation phase, not yet touched)
- `resources/ts/components/cost-builder/types.ts` — add `upgradeDraftBase`.
- `resources/ts/utils/quote.ts` — `composableDraftIsStale()`, `finaliseUpgradeQuoteDraft()`, extend `replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()`.
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — stamp `upgradeDraftBase` in the commit builder; add the explicit "Finalise build" action (new button, gated on `context === 'upgrade_your_build'` and draft validity).
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — pass the primary's exact identity down alongside `context`.
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — wire a new `finaliseComposable` callback (mirrors `addComposable`/`removeComposable`) calling `finaliseUpgradeQuoteDraft()`.
- No change anticipated in `OrderSummary.tsx`, `QuoteSummary.tsx`, `QuoteProposalPreview.tsx`, `RequestSchema.php`, `RequestRepository.php`, `NotificationTemplates.php`, `RequestLifecycle.php`, or any PHP/backend surface.

### Persistence / Request / PDF implications
`upgradeDraftBase` never reaches submission: `RequestSchema.php`'s allow-list sanitiser only copies fields it explicitly names, so this new field is dropped automatically, with no sanitiser change needed. Net effect if a customer submits a Request while a draft is still un-finalised: the stored snapshot simply reads as today's existing "primary + Upgrades" coexistence (unchanged current behavior) — a submitted Request is a frozen point-in-time snapshot regardless, so this is a safe, low-risk default rather than a gap. Whether to also *proactively* prompt/force finalisation before "Review & Finalise Quote" is a UX policy call, not a data-shape necessity — flagging it as an open decision rather than deciding it unilaterally; my inclination is no hard gate is needed for this phase, since the fallback behavior is identical to what ships today.

### Migration / legacy handling
Fully additive and optional — every existing/persisted cart (localStorage) and every historical Request predates `upgradeDraftBase` and simply omits it, which reads as "not a draft" (today's unconditional-survive behavior), so no migration step is required in either direction.

### Proposed focused contracts (implementation phase)
A new `contract:upgrade-quote-draft` (pure `utils/quote.ts` logic, no DOM) asserting: (1) a draft matching its recorded base survives `replaceFamilyNormalQuoteItem`/`removeFamilyTierSystemQuoteItems` untouched when the base is re-selected unchanged; (2) it is dropped when the base is removed; (3) it is dropped when the base is replaced with a *different* Tier/Edition (not just removed); (4) a finalised line (no `upgradeDraftBase`) survives both mutations exactly as today; (5) `finaliseUpgradeQuoteDraft()` is a no-op on a stale or absent draft; (6) on a valid draft it removes the primary+add-ons and strips `upgradeDraftBase`; (7) `composableCoexistsWithPrimary()` returns `false` immediately after finalisation with no further changes.

## Work journey update
Sequence is now:
1. close remaining representation validation;
2. establish **Upgrade Journey Finalisation** semantics;
3. implement/review/deploy/live-validate that phase;
4. only then begin the dedicated customer UI/UX refinement pass;
5. standalone Build Your Own journey is a later separate phase.