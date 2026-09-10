# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Review branch: `review/single-occupant-quoted-focus` @ `61923064f679cfe6b413fc52fcc8889ac792b4d8`, tree `ef9be48924a19cff838870852747cc919c60a393`, exactly 1 ahead / 0 behind.
- Source push is not approved.

## Nath's authoritative rule
Special behavior applies only when the Family has exactly one normal Tier occupant, no add-on anywhere in the Family, and no eligible Upgrade catalogue.

Then: unquoted = focused shell, Cart hidden, no X. Quoted = same focused shell, Cart visible alongside, no X. Removing the quote hides Cart again while the shell remains.

Other Family shapes keep existing comparison, Recommendations and focused behavior.

## Audit result
The Family-wide qualification and Cart coexistence logic are correct. `familyOffersNothingElse` uses Family-wide normal occupants, Family-wide add-ons and whole-Family composable eligibility. `PackageBuilderApp` receives a quote-suppression fact, so the globally-lone quoted shell can coexist with Cart while ordinary explicit focus and composable browsing still hide it.

One defect remains: a cross-audience Family can have one visible Tier in the current audience but another normal occupant or add-on elsewhere. Once that visible Tier is quoted, the implicit focused fallback correctly shows X because the Family is not globally lone. But the old dismissal state was removed. Since an implicit fallback already has `focusedTierId === null`, clicking X only clears values that are already null and the fallback can immediately remain open. The current regression proves X appears but does not click it.

## Claude — correction
Preserve the globally-lone rule exactly. Restore or replace the minimum presentation state needed so X on a quoted, implicit, single-visible-Tier that is not globally lone actually dismisses to its normal quoted card without bouncing back.

Extend mounted regression for both cross-audience cases: quote the visible Tier; verify X and hidden Cart; click X; verify focused shell closes, normal quoted card/View Plan appears and Cart becomes visible; click View Plan; verify explicit focused shell reopens with X and Cart hidden.

Keep the globally-lone case unchanged: no X, focused shell stays, Cart appears after quote.

Clean stale comments around the fallback/close path. Then rebuild one clean single-commit candidate from current production main, confirm 1 ahead / 0 behind, rerun focused regressions/contracts plus TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop.

## Must preserve
Whole-Family lone qualification; focused shell before/after quote for truly lone Family; Cart coexistence only there; no X there; audience behavior; add-ons/Upgrade/Recommendations; ordinary explicit/composable Cart suppression.

## Must remove
A visible but ineffective X and fallback bounce-back.

## Must not substitute
Do not hide X on non-lone quoted implicit views. Do not reintroduce a small-card route for globally-lone Families. No CSS workaround, parent Family-rule duplication or weakening of other Cart-suppression rules.


---

# Claude — round 3 report (close-path correction)

## The defect, confirmed rather than assumed
The audit was right, and the cause was a false claim I had written into the
code. My round-2 removal note said the dismissal state was "write-only"
because "the fallback no longer runs at all once that Tier is quoted". That is
untrue for exactly one shape, and it is a real one: a Family split across
audience groups with no add-ons and no catalogue stages nothing, so one
visible Tier remains and the quoted implicit view **is** reached. There the
sticky X is correct — the other group's occupant really is behind it — but
with `focusedTierId` already `null`, clicking it cleared only values that were
already null and the render-time fallback re-derived the same shell on the
next render.

## What I restored
The proven shape from `f9ca5b18` (live-validated), not a new invention:
`singleTierDismissedTierId`, the `singleTierDismissed` derivation honoured at
the fallback itself, the staleness reset effect, and the three setter sites
(X handler, customer-group tab change, Family switch). The fallback stays a
passive render-time derivation — nothing opens the shell via a setter, the
property that made this approach work where three effect-driven attempts
failed live.

The globally-lone rule is untouched. A lone Family cannot record a dismissal:
it renders no X at all, and `familyOffersNothingElse` is a pure function of
`family` (Family-wide occupants plus `family.pricing.composable_offer`, none
audience-narrowed), so it cannot flip while one Family stays open. That is
what keeps the restored state from ever resurrecting the orphan one-card grid
there — so no extra gate was needed, and none was added.

## Regression: 66 checks
Both cross-audience cases now click all the way through, as required: quote ->
assert X present and Cart hidden -> **click X** -> focused shell closes, the
quoted card appears with `checkmark Selected` and View Plan, Cart becomes
visible -> **click View Plan** -> explicit shell reopens with its X and the
Cart is suppressed again.

I also added the staleness cycle, which the audit did not ask for but which
turned out to be necessary — see the honest note below.

Directional proof, six independent directions, each failing a **distinct**
named assertion:

| Reverted | First failing assertion |
| --- | --- |
| fallback ignores the dismissal | X "actually CLOSES it — no bounce-back" |
| X handler records nothing | same assertion |
| staleness reset effect removed | "re-quoting the SAME Tier gets a FRESH quoted shell" |
| lone definition read off the visible tab | "a cross-audience Family is NOT globally lone" |
| suppression signal always suppresses | "the Cart becomes VISIBLE alongside the still-open focused shell" |
| lone Family loses its lock | "the sticky X is gone" |

## My own gap, found by running the suite rather than trusting my note
My first pass restored the reset effect but **did not cover it** — direction 3
above passed against the dormant-only version. That is precisely the trap
`f9ca5b18` documented and covered, and I had reintroduced the code without
its proof. Added the `quote -> X -> remove primary -> re-quote the same Tier`
cycle, which strands the customer on the card in the dormant-only version.

## Two corrections to what I told you last round

**1. The `onQuoteSuppressedChange` rename has three consumers, not one.**
I reported "single caller, no contract referenced either name". That was
wrong. It also broke two pre-existing mounted regressions, which crashed with
`onQuoteSuppressedChange is not a function`:

- `regression:family-tier-membership-boundary` — prop name fixed, **now green**. Purely mechanical; it was green on `main` and my rename broke it.
- `regression:quoted-single-tier-dismissible` — see below.

I kept the rename (the value genuinely reports suppression, which for the
lone case is deliberately *not* the same as shell-active) but it remains
**unconfirmed**, and I no longer claim it is low-contact. If you reject it, I
revert the rename and both prop fixes together.

**2. My documented baseline of six pre-existing failures was understated.**
Re-measured on clean `main`: **8 JS/TS + 7 PHP = 15**. Full list below. I had
been carrying six.

## Decision needed: `regression:quoted-single-tier-dismissible` is superseded
This is the one delta against `main`'s baseline, and I have **not** retired it
unilaterally.

Its Family is *exactly* the globally-lone shape — one normal occupant, no
add-ons, no composable offer, as its own comment states. Your approved rule
therefore makes its central assertion ("dismissible once quoted") false **by
design**. All 13 remaining failures are that one class; nothing else in it
fails. There is no version of correct where both it and the approved rule are
green.

My recommendation: **retire it.** Its coverage is wholly subsumed — the lone
shape is case 2 of `single-occupant-quoted-focus-regression.mjs` with the new
expected behaviour, and its dismissibility coverage is now cases 10a/10b,
which exercise the same X-dismiss-and-return path in the Families where
dismissal is still correct. Rewriting it in place would duplicate case 2
verbatim.

Deleting a file is a scope decision, so it is yours. Say the word and I remove
it in the same candidate. Until then it ships red, red *by the approved rule*,
not by defect.

## Stale comments cleaned
- The false removal note, replaced by the restored state's own reasoning.
- The fallback's "a single occupant that is NOT alone is unaffected" claim, which described only the staging route and omitted the cross-audience route that actually reaches the fallback.
- The locked-landing block's cross-audience bullet now says why the dismissal state still exists.

## Validation
- `regression:single-occupant-quoted-focus` — **66 checks**, green.
- `regression:family-tier-membership-boundary` — green (was broken by my rename).
- TypeScript `--noEmit` — clean. `docs:check` — 117 Markdown, 46 Code Maps, 22 history records.
- `npm run build` reproduces the committed `dist/` **exactly** (no drift).
- Full suite: 100 contracts/regressions + 87 PHP tests, run on the candidate **and** on clean `main` for comparison.
- Pre-existing on `main`, unchanged (8): `contract:admin-station-css`, `contract:package-builder-flow`, `contract:platform-identity-schema`, `regression:tier-system-footer-loop`, `regression:composable-quote-cart-loop`, `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`, `regression:tier-publish-timeout`.
- Pre-existing PHP on `main`, unchanged (7): `notification-templates-composable-quote-parity`, `platform-identifier-station`, `quote-view-email-link`, `quote-view-http-boundary`, `service-route-baseline`, `tier-capability-invariants`, `tier-occupant-first-save`. I touched no PHP this round.
- Only delta vs baseline: `regression:quoted-single-tier-dismissible`, above.

## Candidate
- `review/single-occupant-quoted-focus` @ `61923064f679cfe6b413fc52fcc8889ac792b4d8`
- tree `ef9be48924a19cff838870852747cc919c60a393`
- 1 ahead / 0 behind production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`
- `origin` holds only `main`, `Project-work-instructions`, and this one review branch.
- **`main` not pushed.**

## Still unconfirmed from earlier rounds
1. The `onQuoteSuppressedChange` rename — now with a corrected, larger contact surface (above).
2. The dismissal-machinery removal — **moot**: the audit reversed it and it is restored.
