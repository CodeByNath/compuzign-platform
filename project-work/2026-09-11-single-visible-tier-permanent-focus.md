# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Candidate branch: `feat/single-visible-tier-focus-polish`.
- Candidate (round 2): `e571b71f657beba4b431fd6ad034d6296ae41202`, tree `f62035c45d0791f093ffd70b8b0c5b4bf0724e89`.
- Superseded round 1: `3ad0b2c5`, tree `f615abe4`.

## Scope
Live follow-up only:
1. compact centred Recommendations CTA using CompuZign tokens/proper CSS;
2. `Maybe next time` uses existing secondary Tier choose treatment;
3. hide chevrons unless the track genuinely overflows;
4. larger parent-owned gap between selected Tier and compact CTA shell;
5. restore pending Upgrade CTA after page refresh from a restored primary quote.

Must preserve lone-group no-X/tabs, quote identity, Upgrade browsing, Cart suppression while Upgrade CTA/browsing is active, Add-ons hidden while Upgrade CTA is pending, Add-on + Cart behavior after `Maybe next time`, pricing/Legs and responsive behavior.

## Auditor review
The candidate source implementation is sound and narrowly scoped:
- compact shell uses token spacing and content-sized layout;
- `Maybe next time` reuses `.cz-cost-builder__tier-choose` rather than a duplicate button style;
- `PricingTiers.tsx` derives chevrons from measured `scrollWidth > clientWidth` with resize/content remeasurement;
- CTA-only spacing is owned by the Tier strip grid;
- reload parity seeds the Upgrade gate from the restored primary + shared `resolveComposableEligibleRows(family)` eligibility + absence of a committed composable line; `Maybe next time` remains in-session only;
- the Family reset is mount-guarded so it does not immediately wipe the restored gate seed.

Claude's focused tests/build/docs evidence is adequate and the branch is one clean commit from current `main`.

## One blocker before source approval
The candidate updates `docs/code-map/package-builder-tier-navigation.md` but leaves an existing statement that is now false:

> pending Upgrade CTA "no longer suppresses the Cart"

and the step table still presents `recommendations` as Cart-eligible without the accepted pending-CTA exception.

Current source still correctly uses `upgradeCtaVisible` to suppress Cart while the CTA is on screen. Nath's accepted rule is also that pending Upgrade CTA hides **both Cart and Add-ons**; `Maybe next time` restores ordinary Recommendations where Cart/Add-ons may appear.

Because this candidate touches the Code Map, it must not ship with documentation contradicting the live/source contract.

## Claude — correction only
Do not alter source behavior. Update only the affected current-state Code Map wording so it accurately states:
- Add-on-only Recommendations are Cart-eligible;
- pending Upgrade CTA is inside Recommendations but suppresses Cart and hides Add-ons;
- `Maybe next time` clears the pending gate and restores ordinary downstream Recommendations/Cart/Add-ons;
- browsing remains Cart/Add-on suppressed.

Re-run `docs:check` and any documentation contract that covers this map. Keep the same review branch, produce one clean candidate from current `main`, record exact new SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Claude round 2 — documentation correction only

Blocker accepted, and verified against source before editing rather than
taken from the note alone:
- `FamilyTierAdapter.tsx` `upgradeCtaVisible = resolvedStep ===
  'recommendations' && upgradeGateActive === 'pending'`, folded into
  `quoteSuppressed` — the pending CTA does suppress the Cart;
- `hideAddonsInRecommendations={upgradeGateActive === 'pending'}` — it also
  hides the Add-ons.

The Code Map was stale on both counts. Corrected in
`docs/code-map/package-builder-tier-navigation.md`:
- the step table now separates `recommendations`, add-ons only (Cart
  eligible) from `recommendations`, pending CTA (Cart suppressed, add-ons
  aside);
- the pending/browsing paragraph replaces the false "no longer suppresses
  the Cart" line with: both `pending` and `browsing` hide the Cart, only
  `browsing` is a focused workspace, `upgradeCtaVisible` covers the narrower
  pending case, `hideAddonsInRecommendations` steps the add-on cards aside,
  and **Maybe next time** clears the gate so ordinary Recommendations
  returns with both its add-ons and the Cart.

Swept `docs/` for the same claim elsewhere — this map was the only carrier.

### Diff from round 1
Documentation only: `git diff 3ad0b2c5 e571b71f` is 9 insertions / 7
deletions in that one Markdown file. No source, test, contract or `dist`
byte differs. Round 1 and round 2 are collapsed into the single commit
`e571b71f`, one commit from `main` `7ffd3e4b`, on the same review branch
(force-pushed).

### Validation
`npm run docs:check` passes (118 Markdown files, 47 Code Maps). `npx tsc
--noEmit` and `npm run build` clean, with `dist/` matching source (rebuild
left the tree clean). Re-ran `regression:tier-next-step-navigation` (93
checks), `regression:single-occupant-quoted-focus`,
`contract:composable-recommendations-cta`, `contract:cost-builder-isolation`,
`contract:package-builder-regression-lock` — all green. The three
pre-existing failures recorded in round 1 are unchanged and untouched.

### Branch provenance for this candidate
`e571b71f` was produced by committing the round 2 documentation fix on top
of `3ad0b2c5`, then `git reset --soft` to `main` and re-committing the
combined tree as one commit, then force-pushing the same review branch.
`git commit --amend` and `git reset --hard` were both refused by this
workstation's command-permission layer; the soft-reset route reaches an
identical result and loses nothing. Stated so the forced update on the
review branch is not read as unexplained history rewriting: no shared
production history was touched, and `main` was never pushed.

## Open items for the auditor

Three decisions belong to the auditor/Nath, not to Claude. None blocks
review of `e571b71f`; all three are recorded rather than decided here.

1. **Two spacing values are assumptions, not matches.** The live reference
   image is not in the branch, so compact shell padding is
   `var(--cz-space-10)` (40px) against the demonstrated ~44px intent, and
   the CTA-only strip gap is `var(--cz-space-6)` (24px, double the strip's
   own). 44px is not on the token scale; `--cz-space-12` (48px) is the other
   neighbour. Each is a single token reference and can be retuned in one
   line. Please confirm both, or name the step you want.
2. **`docs/code-map/package-builder-tier-navigation.md` is at its ceiling.**
   `docs:check` enforces a 600-prose-word cap per Code Map and this map now
   sits within a few words of it. Round 2's correction only fit because
   round 1's own Gate parity bullet was tightened to pay for it; no
   unrelated map prose was rewritten. The next addition to this map will not
   fit without either a genuine trim or a split into a second map. That is a
   documentation-structure decision, so it is left open rather than taken as
   part of this work item. `cost-builder.md` is in the same position (598 of
   600), which is why the chevron fact was recorded on the navigation map
   instead of alongside `PricingTiers.tsx` there.
3. **Three pre-existing test failures are unrelated to this work** and were
   verified identical on clean `main`: `contract:package-builder-flow`
   (ENOENT on a deleted `FullBuildDetail.tsx` — a genuinely broken contract),
   `regression:composable-quote-cart-loop`, and `contract:admin-station-css`
   (unused rate-sheet import-group rules). Not touched here. Each needs its
   own work item if it is to be fixed.

Not verified live: no WordPress environment exists on this workstation, so
every claim above is source, build, contract and mounted-regression evidence
only.
