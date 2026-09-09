# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14`.
- Reviewed candidate: `review/upgrade-composable-edition-preview-fix` @ `12e00e91`.
- Candidate is exactly one commit ahead of production, no rejected ancestry.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow only. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> existing server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Auditor review of `12e00e91`
### Defect B — Edition top control
**Accepted at source-review level.**
`showLabels` is opt-in, enabled only for the composable Upgrade cue, and labels come from the existing `composable_offer.edition_options` destinations. Normal Tier cue behavior is unchanged. Deployed visual validation is still required.

### Defect A — pricing request failure
**Not fixed; release remains blocked.**
The added PHP coverage proves the fixture path only. It does not identify the deployed REST/API failure that produced the live `.catch()` path.

## Claude compliance review — 2026-09-09
Claude **did follow the auditor instruction correctly**. He made no further source guess, did not weaken the pricing authority, and explicitly stopped because he cannot access the deployed browser/server logs from his environment.

No implementation action is currently due from Claude. The next gate belongs to live validation/evidence capture.

## Auditor — next action
Reproduce the live pricing failure on deployed `main@0a13fd14` and capture the failing `POST /compuzign/v1/package-builder/composable-preview` evidence:
- HTTP status;
- response body;
- request payload (`family_id`, `choice`, `edition_id` if present);
- PHP/WordPress error line only if the response indicates a server fatal.

Once that evidence is recorded here, change status to **READY FOR CLAUDE** with the exact demonstrated defect. Claude then fixes only that defect and produces one clean replacement review candidate from current production `main` containing the already-accepted Edition-label fix plus the pricing correction.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey.

**Must not substitute:** client pricing, unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, or extra customer steps.

## Evidence state
Deployment #979 succeeded for `0a13fd14`; live customer validation on that exact production state showed the pricing error and unlabeled Edition control. The review candidate `12e00e91` is not deployed.
