# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `4a73ed87`.
- Rejected candidate: `review/composable-edition-set-completeness` @ `09f453ec`.

## Live state
Pricing remains **PASS** on deployed `4a73ed87`. Do not reopen it.
Composable Edition loading remains **FAIL**: customer cue shows only `Default` + `Subscriptions`.

## Why `09f453ec` is rejected
The candidate removes the `edition_platform_id !== ''` visibility gate and intentionally allows an Active Edition with no CZTE into the public customer set.

That conflicts with already-closed identity architecture, not merely a presentation detail:
- `docs/code-map/tier-edition.md`: a Tier Edition is an independently addressed child carrying its own **CZTE**, assigned on first Active.
- CLOSED `project-work/2026-09-06-composable-upgrade-platform-identification.md`: a composable Catalogue Edition carries **CZTE + CZTEC**, and **activation reserves both unconditionally**.

Therefore an **Active composable Edition without CZTE/CZTEC is an identity/lifecycle defect**. Making that half-identified child customer-visible would hide the defect and weaken the accepted architecture. The fact that current selection happens to use native `id` does not make missing Platform identity acceptable.

Also, the new fixture proves a synthetic `3 active / 1 minted` state can be projected after removing the filter; it does **not** prove the actual omitted live Editions are Active, nor that production legitimately contains Active Editions that should lack IDs.

## Claude — next action
Do not carry the filter-removal fix forward.

Trace the demonstrated missing Edition set against the locked identity lifecycle:
1. Audit composable Edition create/status activation path and prove where CZTE and CZTEC are reserved/bound.
2. Audit migration/backfill for pre-existing composable Editions and prove whether every Active Edition is repaired to both identities.
3. Audit `publicTierEditionOptions()` status eligibility. Confirm customer projection remains Active-only.
4. Build regression coverage for multiple composable Editions where Active rows have valid CZTE/CZTEC and all survive into `composable_offer.edition_options`; disabled/draft/trashed rows do not.
5. Add a corruption/backfill fixture: an Active Edition missing either required Platform identity must be repaired/reconciled by the authoritative identity path, or rejected loudly — **never silently exposed half-identified**.

If source inspection shows the live missing Editions can be validly Active yet identity mint/backfill is absent, fix that authoritative lifecycle/migration defect. If the omitted Editions are not Active, report that instead; do not weaken eligibility to satisfy the screenshot.

**Must preserve:** working pricing; Active-only customer eligibility; CZTE + CZTEC architecture; stable Edition identity; existing Upgrade flow and label UI.

**Must remove:** the actual lifecycle/projection defect causing customer-valid Editions to disappear.

**Must not substitute:** exposing identityless Editions, hardcoded names/counts, native-index identity, client-invented Editions, inactive Edition exposure, second resolver, or extra customer steps.

Produce one clean replacement candidate from `main@4a73ed87`, report exact root cause/tests/SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Additional finding — resolveComposableEligibleRows() inclusions source (Nath direct investigation, 2026-09-09)

Separate from the CZTE/CZTEC tab-visibility defect above. This one is about
what loads on the LEFT side once a tab (Default or a real Edition that IS
already visible, e.g. `Subscriptions`) is selected — confirmed real via git
history, not a guess.

**Root cause, verified:** `resolveComposableEligibleRows()`
(`ComposableOfferBrowser.tsx`) builds its item catalogue lookup from
`offer.inclusions` (the Default occupant's own resolved list) UNCONDITIONALLY
— it never reads the active Edition's own `inclusions_override`, even though
`customer_policy` right next to it correctly switches per Edition. So
switching tabs changes *which item_ids are policy-allowed* but keeps
pricing/labeling every row off Default's own catalogue, never the actual
Edition's own declared items — inconsistent with the identical
inherit-when-empty rule normal Tier's `resolveEffectiveTierDisplay()`
(`PricingTiers.tsx`) already applies correctly.

**This was built correctly once, then lost in a revert:** commit `a584ede0`
("Give the composable occupant its own focused shell, shared with normal
Tiers") had it right:
```ts
const inclusionSource = edition && edition.inclusions_override.length > 0
  ? edition.inclusions_override
  : offer.inclusions;
```
Commit `28b6859c` reverted that entire commit (unrelated reason — a
different UI element in the same commit got rejected in live validation).
Commit `0a13fd14` rebuilt the composable browsing feature from scratch and
restored `edition.customer_policy` Edition-awareness, but never restored
this `inclusionSource` fallback — regressing back to the pre-`a584ede0`
bug.

**Fix (not yet applied — Claude stopped to confirm before touching source,
per Nath's direction):** in `resolveComposableEligibleRows()`, add the
`inclusionSource` line above back exactly as `a584ede0` had it, and build
`inclusionsById` from `inclusionSource` instead of hardcoded
`offer.inclusions`.

**How this relates to the CZTE work above:** independent defects. This one
affects any Edition that's ALREADY visible in the tab list (e.g.
`Subscriptions`, which survived the CZTE filter) — selecting it still shows
the wrong item list. Fixing this does not touch or substitute for the
CZTE/CZTEC lifecycle trace the auditor required above; do both.

### Claude — next action (this finding)
Apply the `inclusionSource` fix above. Add/update a focused regression test
(TS contract, matching `composable-edition-resolution-contract.ts`'s
existing precedent, or a runtime assertion in
`scripts/composable-recommendations-cta-contract.ts`/similar) proving: an
Edition with its own non-empty `inclusions_override` shows ITS OWN
items/prices, not Default's; an Edition with an empty `inclusions_override`
still correctly falls back to Default's. Run `npx tsc --noEmit`,
`npm run build`, relevant existing composable contracts, `npm run docs:check`.
Fold this into the same clean candidate the CZTE work above produces (one
candidate from `main@4a73ed87`, not two separate branches) unless the CZTE
trace is still in progress, in which case land this one first on its own
clean branch — Claude's judgment at execution time, either is fine as long
as it ends up one clean reviewable candidate.
