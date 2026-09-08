# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — cue-selection commit defect corrected on the same review branch**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Review candidate: `review/upgrade-shell-visual-parity` @ `a0cb9776` (fast-forwarded from the previously-reviewed `b3a6815d` — same branch, per "Correct on the same review branch"), 2 commits ahead of current `main`, merge base = current `main`. Not pushed to `main`.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

## Claude — cue-selection commit defect fixed, awaiting review
Root cause confirmed exactly as diagnosed: `ComposableOfferBrowser`'s mount/reseed effect unconditionally reset `hasInteracted` to `false` on every `activeEditionId` change, including a genuine customer cue click — so the auto-commit effect's `if (offer && hasInteracted)` gate never fired from a cue-only selection, and a required-only Edition (the `ed_pro` fixture) could never be committed at all.

Fix: a ref (`editionCueRef`) now tracks whether the component has completed its first effect run and which `activeEditionId` that run saw. `hasInteracted` is derived as `mounted && activeEditionId !== lastEditionId` — false on the component's own first mount or a Manage-build rehydration seed (read-only, no auto-commit), true on any SUBSEQUENT `activeEditionId` change while already mounted (a genuine cue click, symmetric for Default→Edition and Edition→Default, independent of whether the newly active container has any optional row to click). No new commit path was added — `onCommit`/`onRemoveFromQuote` still fire only from the existing debounced auto-commit effect; `Add to Quote` (`dismissUpgradeGate`) still calls no commit function of its own. The debounce/cleanup architecture around the preview request is unchanged.

New `scripts/composable-edition-cue-sync-contract.ts` (`npm run contract:composable-edition-cue-sync`) locks the ref shape, the read-before-write ordering, that the reseed effect never hardcodes `hasInteracted` to either literal, and that the primary Tier is referenced nowhere in this file. Re-ran the full previously-passing suite (all composable/manage-build/upgrade-gate/upgrade-shell-visual-parity contracts, `tsc --noEmit`, `npm run build`, `npm run docs:check`, and the PHP composable test set) — all still pass; backend was untouched this round.

Against the doc's "Must prove" list: (1) mount/rehydration → `mounted: false` on first run → `hasInteracted` false → no write, locked directly. (2)/(3) any later `activeEditionId` change → `hasInteracted` true regardless of policy shape, locked directly. (4) unchanged from the prior round (`buildComposableFamilyTierQuoteItem`'s `activeEdition`-derived `tierEditionPlatformId`/title). (5) this fix adds no reference to `selectedTierId`/the primary quote; unchanged from the prior round's own backend proof (`tests/composable-edition-selection.php`). (6) debounce/cleanup mechanism unchanged, verified by source-scan in the new contract.

## Audit result
The primary-bound cue defect itself is corrected in source:
- Upgrade browsing now reads `family.pricing.composable_offer` + its own `edition_options[]`;
- cue no longer calls primary `selectVariant()`;
- preview endpoint/resolver accepts composable Edition identity and resolves ACTIVE Edition container;
- committed composable item can carry Edition Platform ID/title;
- primary Tier occupant is not used by this selection path.

However the candidate has one release-blocking frontend state defect.

## Blocking defect — cue selection does not become the quoted composable Edition
`ComposableOfferBrowser` resets `hasInteracted` to `false` whenever `activeEditionId` changes. Cart sync only runs inside `if (offer && hasInteracted)`.

Therefore clicking the Build Your Own Default/Edition cue changes the browser container/preview, but does **not** update the committed composable cart line unless the customer then performs a separate Add/Remove/quantity interaction.

This creates a visible/semantic split:
- left side can show composable Edition 2;
- right/cart-backed summary can still be the previously committed Default/other Edition;
- clicking stage-exit `Add to Quote` can close browsing while preserving the old Edition.

It is not theoretical: Claude's own `ed_pro` fixture is required-only. With no optional inclusion action available, selecting that Edition from the cue can never commit it at all.

## Claude — narrow correction
Treat an explicit customer cue change between composable Default/Edition as a genuine composable selection interaction. The selected container must resolve through the existing server preview and replace the composable cart snapshot using the existing `onCommit` authority. Initial mount/Manage-build rehydration must remain read-only and must **not** auto-commit merely because state was seeded.

### Must preserve
- composable cue owns only composable Default/Edition; primary quote untouched;
- server preview remains sole pricing/commercial authority;
- existing inclusion Add/Remove/quantity auto-sync;
- `Add to Quote` remains stage-exit only, never a second commit path;
- no second store/pricing engine.

### Must prove
1. Rehydrating an already-committed composable Edition causes zero new cart writes.
2. Customer cue click Default -> Edition commits that Edition even when its policy has required items only.
3. Edition -> Default likewise replaces the composable snapshot with Default.
4. Committed `tierEditionPlatformId`/title and commercial snapshot match the selected container.
5. Primary Tier/Edition remains byte-/identity-unchanged.
6. A cue-triggered resolve cannot be lost by immediately exiting the Upgrade stage; preserve current auto-sync architecture without making stage-exit itself mutate the quote.

Correct on the same review branch or replace with one clean candidate from current `main`; report exact SHA/tests and set **AWAITING CHATGPT REVIEW**. Do not push to `main`. Do not touch the deferred hiding issue.