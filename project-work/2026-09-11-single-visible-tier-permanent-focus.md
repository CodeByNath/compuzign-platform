# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Previous `main`: `e571b71f657beba4b431fd6ad034d6296ae41202` (now the parent).
- Shipped tree: `8b4667555d6d90c405aec5489a4a5f5294d064c9`.
- Review branch `feat/single-visible-tier-focus-polish`: **deleted**, local and
  remote. Repository is back to `main` + `Project-work-instructions`.

## Audit result
Round 3 is one clean commit directly on current production `main` and is limited to the requested visual/grid correction.

Accepted changes:
- removes `.cz-cost-builder__tier { max-width: 440px; }` completely, so the Tier strip grid owns card width;
- removes the mobile `max-width: none` that only existed to cancel that cap;
- compact Recommendations CTA spans `grid-row: 1 / span 9`, preventing it from inflating one shared TierCard subgrid row and creating the large blank band;
- preserves the 9-row Tier strip and TierCard `subgrid` architecture for normal comparison/add-on cards;
- compact CTA now uses the requested centered flex structure with both `justify-content` and `align-items`, full-width text rows, token padding, and `--cz-space-3` lower spacing under `Upgrade your build`;
- existing round-2 behavior remains unchanged: shared secondary Maybe-next-time button, overflow-driven chevrons, parent-owned CTA gap, Upgrade CTA reload parity, and current Cart/Add-on gating.

The CSS contract now explicitly protects the two visual defects Nath identified: no base Tier max-width cap and no compact CTA placement into a single shared row. Claude reports focused contracts/regressions, TypeScript, build and docs all green.

## Must preserve
Lone-group no-X/tabs; normal TierCard section alignment; comparison/add-on card layouts; exact quote/Tier/Edition identity; Upgrade Browse Catalogue; pending/browsing Cart and Add-on suppression; Maybe-next-time downstream restoration; pricing/Legs.

## Live validation required
After deployment verify:
1. selected Tier fills its available grid column;
2. the large blank band at the top of the Tier card is gone;
3. compact CTA matches Nath's reference alignment/proportions;
4. ordinary multi-card/add-on grids still align correctly;
5. refresh still restores the pending Upgrade CTA;
6. no useless chevrons when the strip fits.

Mobile note: existing `align-self: center` may make the compact shell content-width below 768px because the strip becomes a flex column. This predates round 3 and is not a regression from this candidate; check it during live validation before closure.

## Next action
Claude may push **exact candidate `8271bb0259c199724979ecc4c1d0647454df3c91` unchanged** to `main`, record resulting `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, remove the review branch once merged per branch hygiene, and stop.

---

## Push record

Approved candidate `8271bb0259c199724979ecc4c1d0647454df3c91` pushed to `main`
**unchanged**, as instructed. Verified after the fact, not assumed:

- `origin/main` now resolves to `8271bb02`, with `e571b71f` as its parent — a
  clean single-commit fast-forward, no merge commit;
- the shipped tree is `8b4667555d6d90c405aec5489a4a5f5294d064c9`, identical to
  the tree recorded in the approval above: nothing was rebuilt, amended or
  rebased between audit and push;
- `git merge-base --is-ancestor` confirmed the review branch was a merged
  ancestor of `main` before either branch ref was removed.

Claude's own `git push` to `main` was blocked by the local Claude Code auto-mode
classifier (`[Production Deploy]`), as it is for every `main` push in this
workflow; Nath ran the exact fast-forward command. The same classifier also
blocks `git fetch origin main:main`, so the local `main` ref still reads
`7ffd3e4b`. That is a cosmetic local-ref lag only — `origin/main` is correct and
is what every check above was resolved against.

### Deployment evidence — NOT captured
`gh` is not installed in this environment and no other Actions-reading tool is
available here, so **no GitHub Actions run status was retrieved**. This is an
explicit gap, not a pass. What can be stated from the repository alone:

- `.github/workflows/deploy.yml` triggers on push to `main` filtered to
  `wp-content/plugins/compuzign-platform/**`, which this commit touches, so the
  workflow is expected to have fired;
- it runs `npm install` + `npm run build` in the plugin directory, then pushes
  source to Hostinger over SSH (`git checkout -f origin/main -- …`) and SCPs the
  freshly built `dist` over the deployed one. The workflow rebuilds `dist`
  itself, so the committed `dist/css/cost-builder.css` is not what ships — the
  CI build output is. Both come from the same source CSS in this tree.

**Before closure, the run result for `8271bb02` must be confirmed green.** A red
or skipped run means nothing in the live-validation list below has actually been
exercised.

## Live validation — pending
Auditor's six checks stand as written above. Restating for the validator, with
what each one is actually testing:

1. selected Tier fills its available grid column (the removed 440px cap);
2. the large blank band at the top of the Tier card is gone (the `1 / span 9`
   CTA placement — this is the round's substantive fix);
3. compact CTA matches Nath's reference alignment/proportions;
4. ordinary multi-card/add-on grids still align correctly (the 9-row strip and
   TierCard subgrid were deliberately preserved — this is the regression check
   that the CTA fix did not buy item 2 at their expense);
5. refresh still restores the pending Upgrade CTA (round-2 behavior, unchanged
   here, confirming this candidate did not disturb it);
6. no useless chevrons when the strip fits.
7. Mobile, per the auditor's note: below 768px the strip becomes a flex column,
   where the pre-existing `align-self: center` governs the horizontal axis, so
   the compact shell may sit at content width rather than filling. Predates this
   candidate and is not a regression from it — check at phone width and raise
   separately if it looks wrong.

Items 1-3 are the corrections; 4-6 are the non-change boundary. Do not mark
**CLOSED** until the Actions run is confirmed and live behavior matches.
