# Single Occupant Focused State After Quote

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Approved candidate: `fd2878385b23becf1478018b94db47b5a50d7cf9`.
- Candidate tree: `8d4f75d71d9cabdb963dbc64f7293594b5b62233`.
- GitHub compare: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Accepted behavior
Only a genuinely lone Family gets the special presentation: exactly one normal Tier occupant across the whole Family, no add-on anywhere, no eligible Upgrade catalogue.

Then:
- unquoted: focused shell visible, Cart hidden, no X;
- quoted: same focused shell remains, Cart visible alongside, no X;
- remove quote: shell remains, Cart hides again.

Other Family shapes keep existing comparison, Recommendations and focused behavior.

The accepted implementation also preserves the required non-lone close path:
- cross-audience quoted implicit single-visible-Tier shells keep X and suppress Cart;
- X actually dismisses to the normal quoted card without bounce-back;
- Cart becomes visible on that card;
- View Plan reopens explicit focus and suppresses Cart again;
- stale dismissal is cleared across remove/re-quote.

`FamilyTierAdapter` owns Family-wide qualification and reports quote suppression rather than raw shell activity; `PackageBuilderApp` keeps the single Cart-visibility decision without duplicating Family membership logic. The `onQuoteSuppressedChange` rename is accepted because the reported fact now differs from shell activity.

The obsolete `quoted-single-tier-dismissible` regression has been retired because its lone-Family expectation directly contradicted Nath's new rule. Replacement coverage is in `single-occupant-quoted-focus-regression.mjs` (66 checks), covering both globally-lone persistent/no-X behavior and valid non-lone X/View Plan behavior. No runtime source changed during that retirement.

Claude reports full relevant validation green with zero new failures against clean-main baseline; TypeScript/build/docs green and built dist reproduced exactly. Known baseline failures remain unchanged.

## Must preserve
Whole-Family lone qualification; focused+Cart coexistence only for the lone quoted Family; no X there; working X/View Plan on non-lone quoted implicit views; add-ons/Upgrade/Recommendations; ordinary explicit/composable Cart suppression.

## Claude — next action
Fast-forward **exactly `fd2878385b23becf1478018b94db47b5a50d7cf9`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `review/single-occupant-quoted-focus` is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation after deployment
For a truly lone Family: confirm focused shell/no X before quote; Add to Quote keeps the same focused shell, shows Cart alongside, still no X; remove quote hides Cart while shell remains. Also spot-check a non-lone/cross-audience single-visible-Tier case: quoted implicit shell has X, X closes to quoted card + Cart, View Plan reopens focus and hides Cart.


---

# Claude — push record

## Pushed to production
- `main` is now **`fd2878385b23becf1478018b94db47b5a50d7cf9`**
- `main` tree **`8d4f75d71d9cabdb963dbc64f7293594b5b62233`**
- Previous production `main` was `22b1ff3619363fef80beadd8cb944d2560f4571f`.

Both SHA and tree match the approved candidate exactly — the fast-forward
carried it unchanged, with no amendment, rebase or rebuild in transit. The
merge base was exact production `main`, so the history is linear:
`22b1ff36 -> fd287838`, one commit.

## Deployment
- Workflow: `Deploy to Hostinger`
- Run id: **`34537225257`**, attempt 1
- Status: completed — **conclusion: success**

## Branch cleanup
Verified `review/single-occupant-quoted-focus` is a genuine ancestor of
`origin/main` **before** deleting anything, then removed it locally and on
`origin`. `origin` now holds only `main` and `Project-work-instructions`.

## Status
Set to **AWAITING LIVE VALIDATION**. No further implementation until Nath
reports live results.

## Live checks for Nath
**Truly lone Family** (one normal Tier occupant across the whole Family, no
add-on anywhere, no Upgrade catalogue):
1. before quote — focused shell visible, Cart hidden, **no X**;
2. Add to Quote — the **same** focused shell stays, Cart appears alongside,
   still **no X**, and no small quoted card;
3. remove the quote — Cart hides again, shell remains.

**Non-lone cross-audience spot-check** (one visible Tier in the active group,
another occupant or add-on in the other group):
4. quoted implicit shell **does** show the X, Cart suppressed;
5. clicking X closes to the normal quoted card with the Cart visible — it must
   not bounce straight back open;
6. View Plan reopens explicit focus, with its X, Cart hidden again;
7. remove and re-quote the same Tier — the shell must reopen fresh, not stay
   suppressed by the earlier dismissal.

Item 5 and item 7 are the two that previously failed; they are the ones worth
the closest look.

## Open items carried forward (unchanged by this work)
- `2026-09-10-cart-initial-payment-addons.md` — still AWAITING LIVE VALIDATION,
  deferred by Nath, now deployed across four rounds.
- `regression:composable-quote-cart-loop` — red on `main`, undecided.
- `2026-08-30-quote-email-billed-item-separators.md` — abandoned; its dangling
  commits `bf727fc7`/`add030a7` hold the fix for two of the red PHP tests.
