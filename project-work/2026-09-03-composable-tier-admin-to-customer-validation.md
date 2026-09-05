# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW — cart hierarchy, complete Total Commitment, and email item separation implemented**
- Auditor verdict: **Proceed with safeguards**
- Deployed source (unchanged, `main` not touched this round): `main@2b3ec74d0d11798ee6c633a546bfd7d15b87467a`, deploy run `33941331424` successful/live.
- Review head with this round's fix: `review/upgrade-journey-finalisation@93ac03ec` — **not yet pushed to `main`**, awaiting this review.

## Claude's report — round: cart hierarchy, complete Total Commitment, email separation

### 1. Cart hierarchy — root cause and fix
Root cause: `QuoteSummary.tsx` rendered `items.map(...)` directly — insertion order. Cart mutation appends: `upsertFamilyAddonQuoteItem`/`upsertFamilyComposableQuoteItem` push the new/updated line to the END of the array, and `replaceFamilyNormalQuoteItem` (a base Tier/Edition swap) REMOVES the old primary and APPENDS the replacement at the END too. So if an add-on or Upgrade already existed and the customer later swapped their base Tier, the new primary landed after them in the array — main plan could visibly render below its own add-ons/Upgrade.

Fix: added `orderedQuoteItems()` to `resources/ts/utils/quote.ts` — a pure, stable, presentation-only reorder (returns the same item references, never mutates its input or canonical cart storage). Each Family/Tier system's items are kept together as one contiguous block, positioned wherever that system first appears among the other cart items (so unrelated Services/other Family systems keep their existing relative position); within a system's own block, items sort by role — primary, then composable (Upgrade), then add-on — with add-ons preserving their own existing relative order via a final stable-sort tie-break. `QuoteSummary.tsx`'s cart list and its one "View details" button's target (previously `familyTierItems[0]`, the same insertion-order bug) now both read through this one shared helper. `QuoteDetailsOverlay.tsx`'s plan-tab bar reuses the exact same derivation (`orderedQuoteItems(items).filter(isFamilyTierQuoteItem)`) rather than a second hand-sort, so tab order and cart order agree.

### 2. Complete Total Commitment — root cause and fix
Root cause: `QuoteDetailsOverlay.tsx` filtered Total Commitment's population to `!item.isAddon` on the stated assumption "no canonical finite-contract math exists for add-ons yet." That assumption was false: `computeTotalContractValue()`/`startingPaymentsByCycle()` (`utils/paymentSummary.ts`) are already fully generic over any item's own `legPaymentSummaries` array, with zero primary-only special-casing in either function — the exclusion was pure omission, silently under-counting the cart's real combined commitment whenever an add-on carried its own finite Leg schedule.

Fix: removed the `primaryFamilyTierItems` filter entirely; `TotalCommitmentTab` now receives the same `allFamilyTierItems` population the tab bar uses (primary + Upgrade + add-ons, each exactly once, in hierarchy order) and aggregates it with the identical unmodified helpers — no second pricing calculator. Each plan's own disclosure still resolves only that item's own stored `inclusionItems`/`legPaymentSummaries` snapshot (unchanged — `disclosureRowsForFamilyTierItem(item)` is called per-item, never against a shared/inferred set).

### 3. Customer email item separation — root cause and fix
Root cause: `NotificationTemplates.php`'s `emailFamilyRow()` put an unconditional `border-bottom` on its own header `<td>`s, then appended `emailInclusionItemsList()`'s own inclusion sub-rows (no border) after it. For any Family item WITH inclusions, this drew the divider line THROUGH the middle of that one item's own block (between its header and its own inclusions) while the genuine boundary — after an item's inclusions, before the NEXT item's header — carried no line at all. Sequential items (e.g. primary, then Upgrade, then add-on) ran together with no visible separation between them.

Fix: the header row's border is now conditional (`$headerBorder = $inclusionRows === '' ? 'border-bottom:...' : ''`) — present only when there are no inclusion rows to trail it. `emailInclusionItemsList()`'s own wrapper `<td>` — always the last visible row of its item's block when inclusions exist — now carries that same border instead. Every item ends with exactly one visible divider before the next one starts. No new elements, no changed labels/prices/quantities — same email-client-safe `<table>`/inline-style markup throughout.

### Verification performed
- `npx tsc --noEmit`, `npm run build`, `php -l src/Modules/Requests/Notifications/NotificationTemplates.php` — all clean.
- Full contract + regression + docs-check sweep (85 scripts). Extended `composable-quote-cart-contract.ts` with the exact required regressions named above as pure-function checks against `orderedQuoteItems()` (main+addon; main+Upgrade+addon; the actual reported base-swap re-append shape `[addon, composable, primary]` still resolving to main/Upgrade/addon; add-on relative-order preservation; no mutation/no re-cloning; a non-Family item's position untouched) plus source-scan coverage for the email fix. Updated `package-builder-addon-focus-contract.ts`'s stale primary-only-Total-Commitment assertions to match the corrected behavior. All pass, including `regression:composable-quote-cart-loop` (real-DOM) unchanged.
- 7 unrelated pre-existing failures reconfirmed as out of scope (Tier Occupant/Edition Admin lifecycle, Rate Sheet Tool CSS, a pre-existing missing `FullBuildDetail.tsx`, Platform Identifier schema) — this round's diff touches none of those files.

### Not independently verifiable without a live browser / real mail client
- Actual visual hierarchy order and dynamic add/remove reflow in the live cart UI.
- A rendered PDF/email fixture for a real primary+Upgrade+add-on quote showing the corrected divider placement and combined Total Commitment figure — no live mail-send or browser rendering capability is available in this environment. The fix is verified at the source/logic level (pure-function regressions + PHP source-scan) but not visually confirmed.

## Current live fixes required
### Customer email structure
Render each quoted item as its own clearly bounded email-safe HTML section. Preserve existing labels, prices, quantities and responsive/email-client-safe markup. Add consistent visible separation between item header/inclusions and the next quoted item.

### Complete Total Commitment
Build Total Commitment from the complete authoritative Family quote collection. Include each primary, Upgrade and add-on exactly once. Aggregate each item's existing `legPaymentSummaries` using the accepted payment-summary helpers; no second pricing calculator and no inference from visible tabs. Each disclosure must resolve only that item's stored inclusion snapshot.

Current source evidence: `QuoteDetailsOverlay.tsx` deliberately filters Total Commitment to `!item.isAddon`; that is the omission to remove. Add-ons already have their own tabs, so the commitment population must now match the complete quoted Family population.

## New cart hierarchy requirement
For each Family/Tier system, customer cart presentation must be deterministic and hierarchical:
1. **Main plan**
2. **Upgrades**, when present
3. **Add-ons**

If no Upgrade exists, add-ons follow the main plan immediately. If an Upgrade is later added, it takes the second position and existing add-ons move below it. If Upgrade is removed, add-ons move back up immediately.

Current source evidence: `QuoteSummary.tsx` renders raw `items.map(...)`, so visible order currently depends on insertion history. Fix presentation order from stable item role/Family identity, not by mutating canonical cart storage or rewriting quote identity.

Requirements:
- Keep main plan first for its Family/Tier system.
- Upgrade second only when present.
- Add-ons follow, preserving their own existing relative order.
- Ordering must update dynamically on add/remove without duplicating or recreating items.
- Do not change cart authority, removal semantics, pricing, IDs, snapshots or submission payload values.
- Reuse one ordering helper/derived view where the same hierarchy is needed; do not hand-sort separately in multiple customer surfaces.
- Customer Review/PDF/email may consume the same hierarchy when safe, so the commercial story remains consistent end-to-end.

## Required regressions
- main + add-on => main, add-on.
- main + Upgrade + add-on => main, Upgrade, add-on.
- adding Upgrade to main+add-on moves only presentation order; identities/snapshots unchanged.
- removing Upgrade restores main, add-on.
- multiple add-ons preserve relative order.
- Total Commitment contains primary + Upgrade + add-ons exactly once with correct combined Contract Value / Initial Payment.
- Email fixture visibly separates primary + Upgrade + add-on sections.
- Existing decimal precision, filter reset, cart readiness/removal/hydration, PDF naming and footer containment stay green.

## Next Claude action
Done — see "Claude's report" above. Awaiting auditor review of `review/upgrade-journey-finalisation@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`. Do not push product source until reviewed.