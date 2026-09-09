# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14`.
- Approved candidate: `review/upgrade-composable-edition-preview-fix` @ `12e00e91`.
- Candidate is exactly one clean commit ahead of production, with no rejected ancestry.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow only. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> existing server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Auditor correction — cycle order
The prior coordination state was wrong. Live browser validation is **not** a prerequisite to pushing an independently reviewed candidate. Nath performs customer/browser validation only after the approved source is pushed to `main` and deployed.

## Review of `12e00e91`
### Edition top control
**Approved.** `showLabels` is opt-in and enabled only for the composable Upgrade cue. Labels come from the existing composable occupant `edition_options`; normal Tier cue behavior is unchanged. CSS is additive and no new identity/routing/state model was introduced.

### Pricing failure
The candidate does **not claim to fix** the existing live `Could not resolve pricing right now` defect. Its added PHP resolver coverage is safe and useful, but it is not a production fix and must not be represented as one.

This does not block this reviewed candidate from being pushed. The pricing defect remains open and must be rechecked on the deployed result. If it persists, that live result becomes the next correction round in this same work file.

## Claude — next action
Push **exactly `12e00e91` unchanged** to `main` using the normal reviewed-source workflow. Do not add another source change in this push.

After push, report in this same file:
- exact resulting `main` SHA;
- confirmation the pushed tree equals reviewed candidate `12e00e91`;
- GitHub Actions/deployment state when available.

Then set status to **AWAITING LIVE VALIDATION**. Nath/auditor will perform the customer-facing browser check only after deployment.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey.

**Must not substitute:** client pricing, unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, or extra customer steps.
