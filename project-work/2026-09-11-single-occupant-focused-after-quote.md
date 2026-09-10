# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Current review branch: `review/single-occupant-quoted-focus` @ `83a9d1117ddf1d5bdefc13feabe632e38a846b82`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's exact rule — authoritative
Special behavior applies only when the Tier occupant is genuinely alone across the **whole Family**:
- exactly one normal Tier occupant in the Family;
- no add-on occupant anywhere in the Family;
- no eligible Upgrade Your Build catalogue.

Then:
- before Add to Quote: focused shell visible, Cart hidden, no X;
- after Add to Quote: same focused shell stays visible, Cart appears alongside, no X;
- remove quote: shell remains, Cart hides again.

If the Family has another normal Tier occupant, any add-on, or eligible Upgrade catalogue, preserve existing comparison/staged Recommendations behavior. Ordinary explicit focused shells and composable browsing still suppress Cart.

## Current candidate — what is correct
Claude fixed the parent visibility boundary correctly. `FamilyTierAdapter` now reports quote **suppression** rather than raw shell activity; `PackageBuilderApp` owns one `hasVisibleQuote = items.length > 0 && !quoteSuppressedByShell` decision. The lone quoted implicit shell can therefore coexist with Cart while explicit focus/composable browsing still hide it. The candidate also keeps the lone shell locked with no X.

## Remaining defect before push approval
The candidate does **not yet enforce Nath's “whole Family” condition exactly**.

`singleVisibleTier` and `addonTiers` are derived from `visibleTiers`, which is already filtered by the active customer/audience group. Therefore a Family could contain:
- one Personal & Business normal occupant and one Enterprise normal occupant, or
- an add-on that exists only in the other audience group,

and the currently visible group could still look like “one Tier + no add-ons”. `familyOffersNothingElse` would incorrectly classify it as a genuinely lone Family.

The special shell+Cart/no-X behavior must be keyed from **Family-wide membership**, not current tab visibility.

## Claude — correction
Use the already-derived Family-wide authorities (`familyOccupants`, `normalOccupants`, and Family-wide add-on membership) to determine whether this Family truly contains only one normal Tier and no add-ons. Keep `resolveComposableEligibleRows(family).length === 0` for Upgrade eligibility unless source proves a stricter Family-wide authority is required.

Do not change the visible-group rendering rules themselves. The selected customer group may still determine what is shown; it must not determine whether the Family qualifies as globally lone.

Add regression proof for cross-audience cases:
1. PB normal Tier + Enterprise normal Tier => **not** globally lone; special persistent focused+Cart behavior must not activate merely because current tab shows one Tier.
2. One normal Tier in current group + add-on in another group => **not** globally lone.
3. Truly one normal Tier across Family + zero add-ons + zero eligible Upgrade => special behavior still works exactly.
4. Parent Cart visibility boundary remains: hidden before quote, visible after quote while focused shell remains, hidden again after removal.

Also clean the nearby stale comments that still describe quoted single-Tier implicit focus as having an ordinary sticky X; that is no longer true for the globally-lone case.

Rebuild one clean candidate from current production `main`, single commit, 1 ahead / 0 behind, rerun the focused mounted regression/contracts + TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Focused shell before/after quote for genuinely lone Family; Cart hidden before quote and visible after quote; no X; exact cart mutation; audience-tab behavior; add-ons/Upgrade/Recommendations; multi-Tier comparison; explicit focused-shell Cart hiding; composable browsing Cart hiding.

## Must not substitute
No visible-tab-only definition of “alone”; no small-card/View Plan workaround; no leaving focused shell after quote; no CSS-only Cart reveal; no parent duplication of Family eligibility logic; no weakening other shell suppression rules.

---

## Claude Report — Family-wide gating — 2026-09-11

**The audit was right again.** `familyOffersNothingElse` read `singleVisibleTier`
and `addonTiers`, both derived from `visibleTiers` — already narrowed to the
active customer group. A Family split across audiences would have qualified
from whichever tab happened to be open.

### Updated candidate
- Branch: `review/single-occupant-quoted-focus` (same name reused).
- Candidate head: **`83a9d1117ddf1d5bdefc13feabe632e38a846b82`** (supersedes `28ab832f`).
- Tree: **`1b68afc8992bfac00eebdc0ec12cbd73baed3f07`**
- Parent: production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`.
- **1 ahead / 0 behind**, single commit. Superseded stacks removed from `origin`.

### The correction
```ts
const familyAddonOccupants = familyOccupants.filter((tier) => family.pricing.tiers[tier.id]?.is_addon === true);
const familyOffersNothingElse = normalOccupants.length === 1
  && familyAddonOccupants.length === 0
  && resolveComposableEligibleRows(family).length === 0;
```

`familyOccupants`/`normalOccupants` are the Family-wide authorities this
component already resolves **ahead of every audience derivation** — their own
docblock says they exist for exactly this class of reason — so no new authority
was introduced. `familyAddonOccupants` is the Family-wide add-on membership the
file did not previously derive (`addonTiers` is the audience-filtered one, and
is left alone because the rendering rules still need it).

`resolveComposableEligibleRows(family)` is kept for Upgrade eligibility, as
instructed. Source check: it takes the whole `family` and reads
`family.pricing.composable_offer`, whose `customer_policy`/`inclusions` carry
no customer-group narrowing of their own — so it is already a Family-wide
authority and no stricter one is required.

**Visible-group rendering rules are untouched.** The implicit fallback still
keys on `singleVisibleTier`, so what is SHOWN is still audience-driven; only
whether the Family QUALIFIES as globally lone changed.

### Regression — now 50 checks
Added the three cases you asked for, each first asserting its own premise so it
cannot silently stop testing what it claims:

1. **PB normal Tier + Enterprise normal Tier** — asserts the active group
   really renders exactly one `Add to Quote` card, then that once quoted the
   **ordinary sticky X returns** and the **Cart stays suppressed**. The special
   behaviour must not activate from a single *visible* Tier.
2. **One normal Tier in the active group + add-on only in the other group** —
   asserts the other group's add-on is genuinely not rendered, then the same
   two outcomes once quoted.
3. **Control: the genuinely lone Family** — shell, no X, Cart hidden before
   quote; shell stays, no X, **Cart visible** after quote; Cart hides again on
   removal with the shell remaining. This is what proves 1 and 2 discriminate
   rather than simply disabling the behaviour everywhere.

Point 4 of your list (the parent Cart-visibility boundary) was already asserted
in the previous round and still is, via the harness mirroring
`items.length > 0 && !quoteSuppressedByShell` verbatim.

**Directional proof, now in three directions** — each half of the rule fails
independently:
- revert the derivation → `once quoted, the single occupant no longer auto-renders the focused shell`;
- revert the suppression signal → `the Cart becomes VISIBLE alongside the still-open focused shell`;
- revert to the visible-tab definition of "alone" → **`a cross-audience Family is NOT globally lone: once quoted, the ordinary sticky X returns`**.

### Stale comments cleaned
Two, both about the quoted implicit case:

1. The fallback docblock said a quoted single-Tier view always gets "the
   ordinary sticky X". Rewritten as three named cases: locked unquoted landing;
   globally-lone quoted (permanently locked, Cart beside it); and quoted-but-
   not-globally-lone (unchanged sticky X, lands on its own card).
2. The `isLockedSingleTierLanding` comment claimed a non-alone single occupant
   "never reaches the implicit view while quoted (it stages into Recommendations
   instead)". That is false for exactly the cross-audience case this round added
   — no add-ons and no catalogue means nothing stages, so it *does* reach the
   implicit view while quoted, and deliberately keeps its X. Corrected to name
   both routes, and to record why `familyOffersNothingElse` must be Family-wide.

### Validation
Green: `regression:single-occupant-quoted-focus` (50),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24),
`contract:package-builder-customer-tabs`, `contract:composable-recommendations-cta`,
`contract:composable-quote-cart`, `contract:composable-offer-eligibility`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:cost-builder-isolation`, `contract:package-builder-regression-lock`,
`contract:composable-live-correction`, `contract:quote-sidebar-scroll`,
`npx tsc --noEmit`, `npm run build`, `npm run docs:check`. Build reproduces the
committed `dist/` exactly.

PHP green: `tier-instance-public-projection`, `tier-pricing-parity`,
`tier-edition-public-projection`, `notification-templates-family-quote-parity`,
`package-family-notification`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Still open from earlier rounds
- The **`onFocusedShellActiveChange` → `onQuoteSuppressedChange` rename**
  (interface change, single caller, no contract referenced either name).
- The **dismissal-machinery removal**, proven write-only and behaviourally
  covered.

Both were flagged before and are unchanged; neither has been confirmed yet.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
