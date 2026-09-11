# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Approved candidate: `e571b71f657beba4b431fd6ad034d6296ae41202`.
- Candidate tree: `f62035c45d0791f093ffd70b8b0c5b4bf0724e89`.
- Review branch: `feat/single-visible-tier-focus-polish`.

## Scope accepted
1. Compact Recommendations / Upgrade CTA shell uses existing CompuZign tokens and owning CSS; no fixed height or inline styles.
2. `Maybe next time` reuses the existing secondary Tier choose treatment; `Browse Catalogue` remains primary.
3. Recommendation chevrons render only when their actual track overflows.
4. CTA-only selected-Tier/Recommendations spacing is owned by the Tier strip grid.
5. A restored quoted primary with eligible Upgrade catalogue and no committed composable line restores the pending Upgrade CTA after refresh.

## Audit result
Round 2 fixes the only blocker from round 1: `docs/code-map/package-builder-tier-navigation.md` now matches current source and Nath's accepted rule:
- add-on-only Recommendations are Cart-eligible;
- pending Upgrade CTA suppresses Cart and hides Add-ons;
- `Maybe next time` clears the pending gate and restores ordinary downstream Recommendations, Cart and Add-ons;
- Upgrade browsing remains Cart/Add-on suppressed.

Independent comparison confirms the candidate is one clean commit from current production `main`. The documentation correction is folded into the same candidate; no source behavior was changed in round 2.

Claude's reported validation is adequate for source approval: TypeScript, build, docs check, mounted navigation regression (93 checks), lone-occupant focus regression and relevant Upgrade/CTA/contracts are green. Recorded unrelated pre-existing failures remain outside this work item.

## Must preserve
Lone-group no-X/tabs behavior; exact Tier/Edition and Add-on identity; Upgrade Browse Catalogue flow; Cart hidden while pending/browsing; Add-ons hidden only while pending/browsing; `Maybe next time` in-session semantics; quote/composable mutation; pricing/Legs; responsive behavior.

## Notes for live validation
The token choices are acceptable for first live pass: compact padding `--cz-space-10` (40px) and CTA-only gap `--cz-space-6` (24px). Retune only if the deployed UI visibly misses Nath's reference.

Validate on live customer page:
- compact CTA shell matches reference proportions/alignment;
- no useless chevrons when the strip fits; chevrons appear when it truly overflows;
- refresh with pending Upgrade CTA restores it;
- Cart/Add-on visibility still follows the accepted Upgrade gate rules;
- `Maybe next time` restores Cart/Add-ons.

## Next action
Claude may push **exact candidate `e571b71f657beba4b431fd6ad034d6296ae41202` unchanged** to `main`, then record resulting `main` SHA plus deployment evidence here, set **AWAITING LIVE VALIDATION**, and stop. Remove the review branch after the accepted candidate lands on `main` per branch hygiene.
