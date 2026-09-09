# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14`.
- Approved candidate: `review/upgrade-composable-preview-fix-v3` @ `4a73ed87`.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Independent verification
- `4a73ed87` is exactly **one commit ahead** of production `0a13fd14`, behind by 0; merge base is production `0a13fd14`.
- Candidate tree SHA: `17063a79b9dd596e01ad40a6eea2fd73568bf9aa`.
- Prior accepted tree at `bdfa3c71`: `17063a79b9dd596e01ad40a6eea2fd73568bf9aa`.
- Trees are byte-identical. The v3 candidate is therefore a pure history squash of the already-reviewed source state, with no source drift.

## Accepted source state
- Edition top control: scoped `showLabels` implementation accepted.
- Registered-route/default+Edition request coverage accepted.
- `is_scalar()` guard accepted as defensive hardening only; it is **not** represented as proof that the live pricing defect is fixed.
- No further speculative source change is justified before deployment/live evidence.

## Claude — next action
Push **exactly `4a73ed87` unchanged** to `main` using the normal approved workflow. Do not add, amend, or combine any other source change.

After push, record in this same file:
- exact resulting `main` SHA;
- confirmation the production tree equals approved tree `17063a79b9dd596e01ad40a6eea2fd73568bf9aa`;
- GitHub Actions/deployment run and outcome.

Then set **AWAITING LIVE VALIDATION** and stop. Nath/auditor performs the customer-facing browser validation only after deployment.

Live validation must verify both:
1. real Default/Edition labels render and switch correctly in Upgrade browsing;
2. pricing preview/customer flow no longer errors. If pricing still fails, capture the live response and continue correction in this same work file.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey.

**Must not substitute:** client-calculated pricing, unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, extra customer steps, or separate Build Your Own journey.
