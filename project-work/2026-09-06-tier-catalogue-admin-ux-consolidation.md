# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87` (pushed by Nath directly — classifier blocks Claude pushing to `main`; verified `origin/main` resolves to `4a73ed87`, tree `17063a79b9dd596e01ad40a6eea2fd73568bf9aa`, matching the approved tree exactly).
- Deploy/Actions run: **not independently confirmed by Claude** — no `gh` CLI available in this sandbox to query GitHub Actions. Nath/auditor should confirm the Hostinger deployment workflow succeeded for this exact SHA before live validation.

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

## Claude — done
Pushed exactly `4a73ed87`, no other source change combined. `origin/main`
verified to resolve to `4a73ed87` with tree
`17063a79b9dd596e01ad40a6eea2fd73568bf9aa` — matches the approved tree
exactly, no drift. Deployment/Actions outcome not independently checked
(no `gh` CLI here) — needs confirming before live validation below.

Live validation must verify both:
1. real Default/Edition labels render and switch correctly in Upgrade browsing;
2. pricing preview/customer flow no longer errors. If pricing still fails, capture the live response and continue correction in this same work file.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey.

**Must not substitute:** client-calculated pricing, unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, extra customer steps, or separate Build Your Own journey.
