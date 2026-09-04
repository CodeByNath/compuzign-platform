# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — audit/plan Upgrade Journey Finalisation before final UI/UX refinement.**
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

## Work journey update
Sequence is now:
1. close remaining representation validation;
2. establish **Upgrade Journey Finalisation** semantics;
3. implement/review/deploy/live-validate that phase;
4. only then begin the dedicated customer UI/UX refinement pass;
5. standalone Build Your Own journey is a later separate phase.