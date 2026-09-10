# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Review branch: `review/single-occupant-quoted-focus` @ `fd2878385b23becf1478018b94db47b5a50d7cf9`, tree `8d4f75d71d9cabdb963dbc64f7293594b5b62233`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's authoritative rule
Only a genuinely lone Family gets the special presentation: exactly one normal Tier occupant across the whole Family, no add-on anywhere, no eligible Upgrade catalogue.

Then: unquoted = focused shell, Cart hidden, no X. Quoted = same focused shell, Cart visible alongside, no X. Remove quote = shell remains, Cart hides again.

Other Family shapes keep existing comparison, Recommendations and focused behavior.

## Audit result
The implementation now satisfies the actual runtime rule and the previously-missed close path:
- Family-wide lone qualification is correct.
- `FamilyTierAdapter` reports quote suppression, so `PackageBuilderApp` can show Cart beside only the globally-lone quoted implicit shell.
- cross-audience quoted implicit shells keep X + Cart suppression;
- restored `singleTierDismissedTierId` makes that X genuinely dismiss to the quoted card and prevents bounce-back;
- stale dismissal is cleared so removing/re-quoting the same Tier gets a fresh shell;
- globally-lone Family cannot enter the dismissal path because it has no X.

The renamed `onQuoteSuppressedChange` contract is accepted. The value is no longer equivalent to shell activity, so retaining the old `onFocusedShellActiveChange` name would be misleading. All known mounted callers have been updated.

## Required cleanup before source approval
`regression:quoted-single-tier-dismissible` is now obsolete and intentionally red because its fixture is exactly the globally-lone Family whose approved behavior changed. Its central contract says quoted lone Tier must be dismissible, which now contradicts Nath's rule. Do not ship a deliberately failing regression.

Retire that obsolete regression completely:
1. delete `scripts/quoted-single-tier-dismissible-regression.mjs`;
2. remove its `package.json` script entry;
3. rely on `single-occupant-quoted-focus-regression.mjs`, which now covers both replacement responsibilities: globally-lone persistent/no-X behavior and non-lone cross-audience X dismissal/View Plan return.

Then rebuild one clean single-commit candidate from current production `main`, exactly 1 ahead / 0 behind. Run the new focused regression, membership-boundary regression, relevant package/cart/focus contracts, TypeScript, build and docs; report exact SHA/tree and baseline comparison; set **AWAITING CHATGPT REVIEW** and stop. Do not push `main`.

## Must preserve
Whole-Family lone qualification; focused+Cart coexistence only for lone quoted Family; no X there; working X/View Plan on non-lone quoted implicit views; add-ons/Upgrade/Recommendations; ordinary explicit/composable Cart suppression.

## Must remove
Only the superseded regression that encodes the old product rule.

## Must not substitute
Do not weaken the new regression, hide X on non-lone views, restore a small-card route for globally-lone Families, or alter runtime behavior while retiring the obsolete test.


---

# Claude — round 4 report (obsolete regression retired)

## What was asked, and what I did
Retire the superseded regression, change no runtime behaviour, rebuild one
clean candidate. All three done.

1. Deleted `scripts/quoted-single-tier-dismissible-regression.mjs`.
2. Removed its `package.json` entry — the suite goes 100 -> 99 registered
   contracts/regressions, and `npm run` no longer lists it.
3. Verified the replacement coverage claim rather than asserting it (below).

## Grepped before deleting
The whole tree, across `*.json` / `*.md` / `*.mjs` / `*.ts` / `*.tsx` /
`*.yml`, for both the script name and the slug: the only references were its
own `package.json` entry and the two usage lines in its own header. No Code
Map, history record, CI workflow or aggregate npm script named it — I checked
all 103 script bodies for a reference, not just the obvious ones. Nothing is
left dangling.

## No runtime behaviour changed while retiring it
The diff of this retirement against the previously audited candidate
`61923064` is exactly two files:

    package.json                                   |   1 -
    quoted-single-tier-dismissible-regression.mjs  | 230 ---------

`FamilyTierAdapter.tsx` and `PackageBuilderApp.tsx` are byte-identical to the
audited candidate. The retirement touched no source.

## Replacement coverage, confirmed
The retired file's two responsibilities are both live in
`single-occupant-quoted-focus-regression.mjs`:

- **globally-lone persistent / no-X behaviour** — cases 1-3 and 10c: the shell
  before quote with no X and Cart hidden; the shell after quote with no X and
  the Cart visible alongside; removal hiding the Cart while the shell stands;
  and the re-quote cycle.
- **non-lone cross-audience X dismissal and View Plan return** — cases 10a/10b:
  quote, assert X present and Cart suppressed, **click X**, land on the quoted
  card carrying `Selected` and View Plan with the Cart visible, then **click
  View Plan** to reopen the explicit shell with its X and the Cart suppressed
  again — plus the remove/re-quote cycle that a dormant-only dismissal strands.

Its Edition-identity assertion is not lost either: 10a/10b assert the quoted
card and its View Plan route back into the same shell.

The new regression was not weakened to accommodate the retirement — it is
unchanged from the audited candidate at **66 checks**, still failing in six
independent directions on six distinct named assertions.

## Validation on the committed candidate, from a clean tree
- `regression:single-occupant-quoted-focus` — 66 checks, green.
- `regression:family-tier-membership-boundary` — green.
- Full suite: **99** contracts/regressions + **87** PHP tests.
- **Zero new failures** against the clean-`main` baseline. Candidate failures
  are exactly the 8 pre-existing ones: `contract:admin-station-css`,
  `contract:package-builder-flow`, `contract:platform-identity-schema`,
  `regression:tier-system-footer-loop`, `regression:composable-quote-cart-loop`,
  `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`,
  `regression:tier-publish-timeout`.
- PHP: the same 7 pre-existing failures, unchanged. I touched no PHP.
- TypeScript `--noEmit` clean; `docs:check` 117 Markdown / 46 Code Maps / 22
  history records; `npm run build` reproduces the committed `dist/` **exactly**.
- The retired script is gone from disk and unregistered — both verified after
  committing, not before.

## Candidate
- `review/single-occupant-quoted-focus` @ `fd2878385b23becf1478018b94db47b5a50d7cf9`
- tree `8d4f75d71d9cabdb963dbc64f7293594b5b62233`
- 1 ahead / 0 behind production `main@22b1ff3619363fef80beadd8cb944d2560f4571f`
- `origin` holds only `main`, `Project-work-instructions`, and this one review branch.
- **`main` not pushed** — SOURCE PUSH NOT APPROVED honoured.

## Open items carried forward
- Deferred: live validation of `2026-09-10-cart-initial-payment-addons.md`
  (still AWAITING LIVE VALIDATION — DEFERRED BY NATH, deployed three rounds).
- Undecided, both pre-existing on `main` and untouched by this work:
  `regression:composable-quote-cart-loop`, and the abandoned
  `2026-08-30-quote-email-billed-item-separators.md` whose dangling commits
  `bf727fc7`/`add030a7` hold the fix for two of the red PHP tests.
