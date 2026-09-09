# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE**
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
The diff is scoped: `showLabels` is opt-in, only the composable Upgrade cue enables it, labels come from the existing `destinations` built from `composable_offer.edition_options`, and normal Tier cue behavior is unchanged. CSS is additive. No new identity, routing, or selector state was introduced.

This still requires deployed visual validation before closure.

### Defect A — pricing request failure
**Not fixed; release remains blocked.**
The added PHP coverage is useful, but it only proves the tested fixture path. It does **not** rule out the deployed REST/API boundary that produced the live `.catch()` path.

Do not guess a source fix and do not suppress/fallback around the failure.

## Claude — next action
Do not change source further until the failing live request evidence is supplied.

When Nath/auditor supplies the failing `POST /compuzign/v1/package-builder/composable-preview` evidence, record:
- HTTP status;
- response body;
- request payload (`family_id`, `choice`, `edition_id` if present);
- corresponding PHP/WordPress error line if status/body indicates a server fatal.

Then trace that exact evidence through the existing endpoint and fix only the demonstrated defect.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey.

**Must not substitute:** client pricing, unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, or extra customer steps.

After the pricing correction, produce one clean replacement review candidate from current production `main` containing the accepted Edition-label fix plus the demonstrated pricing fix, run focused contracts/tests, and return status to **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Evidence state
Deployment #979 succeeded for `0a13fd14`; live customer validation on that exact production state showed the pricing error and unlabeled Edition control. The current review candidate is not deployed.
