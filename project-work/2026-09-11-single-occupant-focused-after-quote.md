# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW — RULE REVERSED BY NATH, see the final report**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Previous cart Bundle/Upgrade work is **CLOSED** after Nath live pass.

## Live defect
A Family can have exactly one normal Tier occupant and no add-ons, no Upgrade catalogue, and no other Tier card. Before selection, the focused shell is correct because there is nothing to compare. After that only Tier is added to Cart, the same Family still auto-renders the focused shell, now with a sticky `X`; the customer must manually close it even though there is no Recommendations continuation and no alternate plan choice.

Nath's rule:
- **single occupant + not yet quoted → focused shell**;
- **single occupant + already quoted → do NOT auto-focus; show the normal quoted card/cart state**.

`View Plan` must still be able to open the focused shell explicitly after quote.

## Source audit
`FamilyTierAdapter.tsx` currently derives:
- `singleVisibleTier = normalTiers.length === 1 ? normalTiers[0] : null`;
- `singleTierIsQuoted = singleVisibleTier !== null && selectedTierId === singleVisibleTier.id`;
- but `effectiveFocusedTierId` still auto-falls back to that single Tier whenever `singleTierDismissed` is false, regardless of `singleTierIsQuoted`.

That is the missed logic. The existing dismissal/X machinery was built to make a quoted single Tier manually dismissible, but Nath's desired behavior is simpler: quoted single-Tier state should not enter the implicit focused fallback at all.

## Required behavior
- Exactly one real normal occupant, unquoted: implicit focused shell remains the landing; no orphan one-card grid.
- Same occupant once quoted: implicit focused fallback is disabled; render the normal quoted card + Cart directly.
- Explicit `View Plan` still opens the focused shell and keeps its normal X return path.
- Removing the quoted primary restores the unquoted implicit focused landing immediately.
- Families with 2+ normal occupants are unchanged.
- Families with add-ons or Upgrade catalogue keep their existing staged/Recommendations behavior; do not remove those flows.

## Claude — implementation
From current production `main`, create one review branch.
1. Correct only the implicit single-Tier fallback derivation in `FamilyTierAdapter.tsx` so it applies when the single Tier is **not quoted**. Preserve explicit focus (`focusedTierId`) unchanged.
2. Re-check whether `singleTierDismissedTierId` is still required for the explicit quoted `View Plan` X route; do not delete it unless source proof shows it is dead after this correction.
3. Add/extend focused regression/contract coverage proving:
   - single unquoted Tier auto-focuses;
   - adding it exits to normal quoted card/cart without requiring X;
   - `View Plan` explicitly reopens focus;
   - X from explicit focus returns to the quoted card;
   - removing primary restores implicit focus;
   - multi-Tier and Recommendations/add-on/Upgrade flows unchanged.
4. Run relevant package-builder/focused-shell/customer-tabs/cart contracts, TypeScript, build, docs. Push review branch only, record exact SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Single unquoted focused landing; explicit View Plan focused route; X on explicit focus; cart state; quote identity; Recommendations/add-ons/Upgrade flows; multi-Tier comparison behavior.

## Must remove
Implicit auto-focus for a single occupant once that occupant is already quoted.

## Must not substitute
No CSS hiding of X; no automatic synthetic close; no extra customer click; no disabling View Plan; no treating add-ons as normal occupants; no route redesign; no cart mutation.

---

## Claude Report — 2026-09-11

Review branch `review/single-occupant-quoted-focus`, cut from production
`main@22b1ff3619363fef80beadd8cb944d2560f4571f`, pushed at
**`84ef258512ba703b1e896d65f0e5576a7a7ec8c9`** (superseding `59d0a603`) — **1 ahead / 0 behind**,
single commit. **Not merged to `main`.**

### 1. The fallback derivation — corrected
`effectiveFocusedTierId`'s implicit branch now tests `!singleTierIsQuoted`
instead of `!singleTierDismissed`. Explicit focus is untouched: `focusedTierId`
still wins ahead of the fallback.

Nath's added requirement — *"if the add to quote is actioned, cart must appear
by showing the occupant small card, so that way we can keep View Plan
working"* — is exactly what this produces, and is asserted directly from the
rendered DOM. In the quoted state the component renders:

```
"View Plan"    class="cz-cost-builder__tier-choose"
"✓ Selected"   class="cz-cost-builder__tier-action is-selected"
```

so the shell closes, the occupant's own small card appears with the Cart, and
View Plan remains the route back in.

### 2. `singleTierDismissedTierId` — proven dead, removed
Re-checked as instructed. After the correction the only consumer of the stored
dismissal was the fallback itself, so the entire apparatus became **write-only**
— the state, the customer-tab reset, the Family-switch reset, the staleness
reset effect, and the X handler's own record. Nothing read it.

Removed, because write-only state that reads as a live guard is worse than no
state. The proof is **behavioural, not by inspection**: the regression's
X-then-return and remove-then-re-add cycles are precisely what the dismissal
existed to protect, and all 24 checks pass with it gone.

No contract or regression referenced any of the removed identifiers
(`grep` over `scripts/` returns nothing for `singleTierDismissed`,
`singleTierIsQuoted`, `isLockedSingleTierLanding`, `isImplicitSingleTierView`).

### 3. Real behavioural coverage — first time for this feature
`scripts/single-occupant-quoted-focus-regression.mjs`, registered as
`npm run regression:single-occupant-quoted-focus`. **24 checks, all passing.**

It mounts the **real** `FamilyTierAdapter` through happy-dom + Preact and
drives it with actual clicks. Every existing contract covering this feature
asserts source text instead, on the stated assumption that the component
"carries too much live-fetched Family/pricing state to instantiate standalone
in a script". **That assumption is false** — its props are plain data plus
callbacks, with no context provider and no fetch on these paths. It mounts
cleanly with ordinary fixtures.

**This is the finding that matters most here**, given this feature's history of
three live failures reasoned from static reading:

> Mounting FRESH with `selectedTierId` already set does **not** reproduce the
> defect. `stagedTierId` is seeded from `selectedTierId`, so `stagedTier` is
> non-null and the fallback's own `stagedTier === null` guard suppresses it.
> The defect appears **only** through the real in-session transition, where
> `commitSelection()` clears `stagedTierId` to null for a Family with no
> add-ons and no Upgrade catalogue.

My first probe rendered the assumed end state and showed pre-fix and post-fix
behaving identically — i.e. it would have "passed" against the broken code. So
every scenario in the final script drives the component rather than rendering
an assumed state. A source-text contract could not have caught this.

Coverage, matching your list point for point:
- single unquoted Tier auto-focuses, with **no** Close X;
- Add to Quote exits to the quoted card + Cart, **no X required**;
- `View Plan` explicitly reopens the focused shell, with its ordinary X;
- X from explicit focus returns to the quoted card and does **not** bounce;
- removing the quoted primary restores the implicit landing immediately;
- re-quoting the same Tier exits again on a second cycle (no stale state);
- a Family with **two** normal occupants still lands on the comparison grid;
- a single occupant **with add-ons** still auto-focuses unquoted and then
  stages into **Recommendations** once quoted — that flow is unchanged.

**Directional proof:** against the pre-fix derivation the run fails with
`once quoted, the single occupant no longer auto-renders the focused shell`,
and the pre-fix render shows `shell=true X=true` at exactly the step Nath
reported.

### Validation
Green: `regression:single-occupant-quoted-focus` (24),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24),
`contract:package-builder-customer-tabs`, `contract:composable-recommendations-cta`,
`contract:composable-quote-cart`, `contract:package-family-cart`,
`contract:quote-cart-addon`, `contract:tier-addon-flow`,
`contract:tier-edition-switch`, `contract:cost-builder-isolation`,
`contract:package-builder-regression-lock`, `contract:composable-offer-eligibility`,
`contract:composable-live-correction`, `contract:request-flow-family-tier-parity`,
`contract:quote-view`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

PHP green: `tier-instance-public-projection`, `tier-public-projection-is-addon`,
`tier-pricing-parity`, `tier-edition-public-projection`,
`notification-templates-family-quote-parity`, `package-family-notification`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Diff summary — 4 files
| File | Change |
| --- | --- |
| `package-builder/FamilyTierAdapter.tsx` | fallback keyed on not-quoted; dead dismissal machinery removed |
| `scripts/single-occupant-quoted-focus-regression.mjs` | new, 24 mounted checks |
| `package.json` | registers the regression |
| `dist/js/cost-builder.js` | rebuilt bundle |

### Flagging for your call
The dismissal removal is the one judgement call here. You asked me not to
delete it without source proof; I have that plus behavioural proof, and no
test referenced it. But this feature has a live-failure history, so if you would
rather ship the one-line derivation change alone and remove the machinery in a
separate round, say so and I will restore it — it is a clean revert of a single
contiguous set of hunks.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.

---

## Claude Report — Nath's condition set confirmed — 2026-09-11

Nath restated the rule: *"when tier add to quote action, focused, single tier
occupant, if has no add-on, upgrade build, or other tier occupants in the
family, simply show the cart as it's the only thing available."*

**That is exactly what the candidate already does** — no source change was
needed. What was missing was proof of the third condition, so the regression
now covers all three independently.

### Updated candidate
- Branch: `review/single-occupant-quoted-focus` (same name reused).
- Candidate head: **`84ef258512ba703b1e896d65f0e5576a7a7ec8c9`**
- Tree: **`50000222efd805f2e752e53dafe03ea6d2e1feda`**
- Parent: production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`.
- **1 ahead / 0 behind**, single commit. Superseded stack removed from `origin`.
- The only change from `59d0a603` is **added regression coverage**; source is
  byte-identical (`resources/ts` untouched in that step).

### How each condition is enforced
The bare quoted-card outcome is scoped by three *independent* guards, which is
why it cannot leak into a Family that still has somewhere to go:

| Condition | Guard | Result when present |
| --- | --- | --- |
| Other normal Tier occupants | `singleVisibleTier = normalTiers.length === 1 ? … : null` | fallback never applies; comparison grid |
| Add-on Tiers | `commitSelection()` stages the primary → `stagedTier !== null` | staged Recommendations with add-on choices |
| Upgrade catalogue | same staging via `resolveComposableEligibleRows()` | staged Recommendations with the Upgrade CTA |

Only when all three are absent does `stagedTier === null` **and**
`singleVisibleTier !== null` hold, so the quoted test decides — and the shell
steps aside for the Cart plus the occupant's own small card.

### Regression — now 33 checks
Added since the previous report:

- **Upgrade catalogue Family** (the condition not previously proven): a single
  occupant with `composable_offer` + `customer_policy` still auto-focuses while
  unquoted, and on quoting lands in staged Recommendations **with the Upgrade
  CTA** — asserted via `cz-package-builder__upgrade-gate-inline` — never the
  bare quoted card.
- **The condition set stated as one case**: for the dead-end Family, asserts
  *no* focused shell, *no* X, *no* staged Recommendations header, *no* Upgrade
  CTA, and that what remains is the occupant small card with `View Plan` and
  `✓ Selected` beside the Cart.

Sections 6 (other occupants) and 7 (add-ons) already covered the other two.

### Validation on the rebuilt candidate
`npm run build` reproduces the committed `dist/` exactly.

Green: `regression:single-occupant-quoted-focus` (33),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24),
`contract:package-builder-customer-tabs`, `contract:composable-recommendations-cta`,
`contract:composable-quote-cart`, `contract:composable-offer-eligibility`,
`contract:package-family-cart`, `contract:tier-addon-flow`,
`contract:cost-builder-isolation`, `contract:package-builder-regression-lock`,
`npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Still open for your call
The **dismissal-machinery removal** flagged in the previous report is
unchanged and still the one judgement call in this candidate.

### Status
Remains **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.

---

## Claude Report — RULE REVERSED by Nath — 2026-09-11

> **This supersedes this file's own "Required behavior" section and both of my
> earlier reports. Please re-audit against the new rule, not the written one.**

Nath's latest instruction, verbatim:

> *"if tier occupant is alone, for whole family, we do not need small view, we
> can keep focused state as no add-on, no upgrade no family members to show, it
> can show cart once added and stay in focused state, and hide 'X' as main
> navigation is available. this only when a tier occupant is all alone inside
> family. no nothing just by itself"*

### What changed against the written spec
This file's `Required behavior` said:

> *"Same occupant once quoted: implicit focused fallback is disabled; render the
> normal quoted card + Cart directly."*
> *"Explicit `View Plan` still opens the focused shell and keeps its normal X."*

The lone-occupant case is now the **opposite**:

| | Written spec (superseded) | Nath's new rule (implemented) |
| --- | --- | --- |
| Lone occupant, quoted | leave shell, show small card + Cart | **stay in the focused shell**, Cart appears alongside |
| Small quoted card | rendered, carries View Plan | **not rendered at all** |
| Close X | ordinary sticky X returns | **hidden** — nothing sits behind it; main nav is the way out |

The reported defect was the *sticky X on a dead-end view*, not the shell
itself. Nath's rule removes the X rather than removing the shell.

**Scope of the reversal:** only when the occupant is genuinely alone. Every
other Family shape keeps today's behaviour exactly.

### Updated candidate
- Branch: `review/single-occupant-quoted-focus` (same name reused).
- Candidate head: **`e6f70ac65919aa5ff47edacb523ad35c23b96c99`** (supersedes `84ef2585`, which superseded `59d0a603`).
- Tree: **`2783e8a825d0d095a0e3236dda6bbc5f47b63a1a`**
- Parent: production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`.
- **1 ahead / 0 behind**, single commit. Superseded stacks removed from `origin`.

### Implementation
Two derivations in `FamilyTierAdapter.tsx`:

```ts
const familyOffersNothingElse = singleVisibleTier !== null
  && addonTiers.length === 0
  && resolveComposableEligibleRows(family).length === 0;

const isLockedSingleTierLanding = isImplicitSingleTierView
  && (!singleTierIsQuoted || familyOffersNothingElse);
```

`familyOffersNothingElse` reads the same authorities those flows already use —
`normalTiers`/`addonTiers` and `resolveComposableEligibleRows()`, the shared
eligibility truth `commitSelection()`'s own staging check reads — never a
second or derived test.

The implicit fallback no longer excludes the quoted case, so the shell persists
across Add to Quote. A single occupant that is **not** alone is unaffected:
add-ons or a catalogue make `commitSelection()` stage the primary, so
`stagedTier === null` is false once quoted and the fallback steps aside for
staged Recommendations, unchanged. Explicit focus keeps its ordinary X, since
`isImplicitSingleTierView` is false on that route.

### Observed behaviour, driven through the real component
```
UNQUOTED      shell=true  X=false  cart=0   buttons: … "Add to Quote"
QUOTED        shell=true  X=false  cart=1   buttons: … "✓ Selected"
AFTER REMOVE  shell=true  X=false  cart=0   buttons: … "Add to Quote"
```

### Regression — 27 checks, updated to the new rule
Rewritten sections: the shell now **persists** through Add to Quote with no X
and **no small card**; remove and re-quote cycles keep the same locked landing.

Unchanged and still passing, which is what confines the reversal:
- a two-occupant Family still lands on the comparison grid;
- a single occupant **with add-ons** still stages into Recommendations once
  quoted;
- a single occupant **with an Upgrade catalogue** still stages with its Upgrade
  CTA;
- the lone-occupant Family shows no staged view and no CTA.

### Note on the View Plan route
Nath's earlier message asked for the small card specifically so View Plan kept
working. This instruction supersedes that: with no card, there is no View Plan
button for a lone occupant — the shell is already open, so there is nothing for
it to open. `View plan details` (the Plan Details modal) is still present in the
shell and unaffected. Flagging it explicitly since it reverses a stated
requirement from one round earlier.

### Dismissal machinery
Still removed, and now on firmer ground: there is no Close on the lone-occupant
landing at all, and a non-alone single occupant cannot reach the implicit view
while quoted. Nothing reads the dismissal state on any path.

### Validation
Green: `regression:single-occupant-quoted-focus` (27),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24),
`contract:package-builder-customer-tabs`, `contract:composable-recommendations-cta`,
`contract:composable-quote-cart`, `contract:composable-offer-eligibility`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:cost-builder-isolation`, `contract:package-builder-regression-lock`,
`contract:composable-live-correction`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check`. Build reproduces the committed `dist/` exactly.

PHP green: `tier-instance-public-projection`, `tier-pricing-parity`,
`tier-edition-public-projection`, `notification-templates-family-quote-parity`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Status
Remains **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
