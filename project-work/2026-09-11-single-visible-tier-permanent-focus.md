# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `e571b71f657beba4b431fd6ad034d6296ae41202`.
- Approved candidate: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Candidate tree: `8b4667555d6d90c405aec5489a4a5f5294d064c9`.
- Review branch: `feat/single-visible-tier-focus-polish`.

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
