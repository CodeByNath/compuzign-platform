# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Current review branch: `review/single-occupant-quoted-focus` @ `28ab832f0bc603c2e4a44a4d7dfa08407abbc941`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's exact rule — authoritative
This supersedes every earlier interpretation in this file.

When a Family has exactly one normal Tier occupant and **nothing else** in that Family — no second normal Tier, no add-on, no eligible Upgrade Your Build catalogue — the focused shell remains the permanent Family presentation.

Before Add to Quote:
- focused shell visible;
- Cart hidden;
- no X.

After Add to Quote:
- focused shell **stays visible**;
- Cart **appears alongside it**;
- no X;
- no small Tier card / no View Plan route is needed because the plan is already open.

If the Family has another normal Tier, any add-on, or an eligible Upgrade catalogue, preserve the existing comparison/staged Recommendations behavior. This special Cart-with-focused-shell rule applies only to the genuinely lone occupant Family.

## Audit of current candidate
Claude correctly implemented the lone-Family focus/X part:
- `familyOffersNothingElse` uses single normal occupant + no add-ons + no eligible composable rows;
- quoted lone occupant stays in implicit focused shell;
- `isLockedSingleTierLanding` hides X.

But Nath's latest request is **not fully followed**. `PackageBuilderApp.tsx` still globally defines:

`hasVisibleQuote = items.length > 0 && !focusedShellActive`

and `FamilyTierAdapter` still reports the lone quoted shell as focused (`onFocusedShellActiveChange(effectiveFocusedTierId !== null || upgradeGateActive !== null)`). Therefore keeping the shell focused still hides the Cart. The candidate's regression mounts only `FamilyTierAdapter` and passes a no-op `onFocusedShellActiveChange`, so it cannot prove the required Cart visibility transition.

## Required correction
Do not undo the focused-shell behavior. Add the missing distinction so Cart visibility can coexist with the focused shell **only** for the quoted, genuinely-alone occupant case.

Claude must inspect the cleanest ownership boundary. Preferred shape: have `FamilyTierAdapter` report enough presentation state for `PackageBuilderApp` to know whether the active focused shell is a lone quoted occupant that permits Cart visibility, instead of duplicating Family eligibility logic in `PackageBuilderApp`.

Required behavior:
- lone unquoted occupant: shell yes, Cart hidden, X hidden;
- lone quoted occupant: shell yes, Cart visible, X hidden;
- remove quote: Cart hides again, shell remains;
- other normal Tier present: existing behavior unchanged;
- add-on present: existing staged Recommendations behavior unchanged;
- eligible Upgrade present: existing staged Recommendations behavior unchanged;
- composable browsing / ordinary explicit focused shells continue hiding Cart as before.

Add a regression at the `PackageBuilderApp`/real parent visibility boundary, not only `FamilyTierAdapter`, proving Cart hidden before Add to Quote and visible after Add to Quote while the same focused shell remains mounted.

## Must preserve
Focused shell for lone occupant before/after quote; no X; exact cart/quote mutation; add-ons/Upgrade/Recommendations; multi-Tier comparison; ordinary focused-shell Cart hiding; composable browsing Cart hiding.

## Must remove
The current false coupling where every focused shell necessarily hides Cart, including this lone quoted case.

## Must not substitute
No leaving the focused shell after quote; no small-card workaround; no fake View Plan route; no CSS-only Cart reveal; no duplicate Family eligibility logic in the parent if child-owned state can express it cleanly; no weakening other focused-shell hiding rules.

After correction, rebuild one clean candidate from current production `main`, single commit, 1 ahead / 0 behind, run focused regression/contracts + TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

---

## Claude Report — Cart visibility corrected — 2026-09-11

**The audit was right, and the gap was mine.** My previous report claimed "the
Cart appears alongside" on the strength of cart *state* (`cartCount` rising in
the harness). Cart *visibility* is owned by `PackageBuilderApp`, and my harness
passed a **no-op** `onFocusedShellActiveChange`, so it could not observe the
parent's own `items.length > 0 && !focusedShellActive` — which would have kept
the Cart hidden for exactly this case. The regression proved the wrong half of
the requirement. That is now fixed at the boundary that owns it.

### Updated candidate
- Branch: `review/single-occupant-quoted-focus` (same name reused).
- Candidate head: **`28ab832f0bc603c2e4a44a4d7dfa08407abbc941`** (supersedes `e6f70ac6`).
- Tree: **`b1f2d5c2cc6ddeae519f317c8efa34236a4e8a9e`**
- Parent: production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`.
- **1 ahead / 0 behind**, single commit. Superseded stacks removed from `origin`.

### The correction — the child reports SUPPRESSION, not activity
The false coupling was the reported signal itself. `onFocusedShellActiveChange`
answered "is a shell open?", and the parent treated that as "hide the Cart".
Those were the same fact until this rule existed.

Renamed and re-scoped to `onQuoteSuppressedChange`, with the eligibility staying
in the child:

```ts
// FamilyTierAdapter
const focusedShellPermitsQuote = isImplicitSingleTierView
  && singleTierIsQuoted
  && familyOffersNothingElse
  && upgradeGateActive === null;
const focusedShellOpen = effectiveFocusedTierId !== null || upgradeGateActive !== null;
onQuoteSuppressedChange(focusedShellOpen && !focusedShellPermitsQuote);

// PackageBuilderApp
const hasVisibleQuote = items.length > 0 && !quoteSuppressedByShell;
```

This follows the preferred shape in the instruction: `PackageBuilderApp` gains
**no** Family-eligibility logic — it never learns about add-ons, occupant counts
or Upgrade catalogues — and still has exactly one place deciding Cart
visibility. `MobileQuoteBar` and the `--has-quote` sidebar track read the same
single flag, so all three stay consistent by construction.

### Required behavior — each line proven
| Requirement | Result |
| --- | --- |
| lone unquoted: shell yes, Cart hidden, X hidden | asserted |
| lone quoted: shell yes, **Cart visible**, X hidden | asserted, incl. `Cart: 1` |
| remove quote: Cart hides again, shell remains | asserted |
| other normal Tier present: unchanged | comparison grid asserted |
| add-on present: unchanged | staged Recommendations asserted, Cart visible there |
| eligible Upgrade present: unchanged | staged Recommendations + Upgrade CTA asserted |
| ordinary explicit focused shell still hides Cart | asserted, with its X still present |

### Regression — now 36 checks, at the parent boundary
The harness no longer stubs the callback. It mirrors `PackageBuilderApp`'s own
visibility expression **verbatim** and renders a real Cart element, so every
Cart assertion is a rendered-DOM fact rather than an inference:

```js
const [quoteSuppressedByShell, setQuoteSuppressedByShell] = useState(false);
const hasVisibleQuote = items.length > 0 && !quoteSuppressedByShell;
```

**Directional proof in both directions** — the regression now fails against
each half of the defect independently:
- revert the derivation -> `once quoted, the single occupant no longer auto-renders the focused shell` (the original sticky-X defect);
- revert the suppression signal to raw activity -> **`the Cart becomes VISIBLE alongside the still-open focused shell — the parent-boundary fact, not just cart state`**.

That second failure is precisely the defect this audit caught, and the previous
revision of the script could not express it.

### Validation
Green: `regression:single-occupant-quoted-focus` (36),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24),
`contract:package-builder-customer-tabs`, `contract:composable-recommendations-cta`,
`contract:composable-quote-cart`, `contract:composable-offer-eligibility`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:cost-builder-isolation`, `contract:package-builder-regression-lock`,
`contract:composable-live-correction`, `contract:quote-sidebar-scroll`,
`contract:drawer-module-entry`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check`. Build reproduces the committed `dist/` exactly.

PHP green: `tier-instance-public-projection`, `tier-pricing-parity`,
`tier-edition-public-projection`, `notification-templates-family-quote-parity`,
`package-family-notification`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Diff summary — 5 files
| File | Change |
| --- | --- |
| `package-builder/FamilyTierAdapter.tsx` | lone-occupant focus + locked X; reports Cart suppression; dead dismissal machinery removed |
| `package-builder/PackageBuilderApp.tsx` | consumes the suppression signal; no Family logic added |
| `scripts/single-occupant-quoted-focus-regression.mjs` | new, 36 checks at the parent boundary |
| `package.json` | registers the regression |
| `dist/js/cost-builder.js` | rebuilt bundle |

### Note on the renamed prop
`onFocusedShellActiveChange` -> `onQuoteSuppressedChange` (and
`focusedShellActive` -> `quoteSuppressedByShell`). No contract or regression
referenced either name; `PackageBuilderApp` is the only caller. Flagging the
rename since it is an interface change, not just a body edit — the alternative
was leaving a boolean named "active" that no longer means active.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
