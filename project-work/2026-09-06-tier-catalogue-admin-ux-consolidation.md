# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged).
- Reviewed candidate: `review/upgrade-composable-preview-fix-v2` @ `4e29dfd5`.
- Candidate is exactly one clean commit ahead of production. Superseded review branch cleanup is acceptable.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Auditor review of `4e29dfd5`
### Defect B — Edition top control
**Accepted.** The previously reviewed `showLabels` change is preserved without architecture drift.

### Defect A — pricing Promise rejection
**Not accepted as root-cause closure yet.**

The new `is_scalar()` guard is a valid defensive hardening and the controller-boundary test proves a non-scalar `edition_id` can otherwise emit a PHP warning. Keep that hardening.

But it does **not** explain the reported customer failure under the normal frontend path. `resolveComposablePreview()` sends `edition_id` only from `composableEditionId`, whose declared runtime contract is `string | null`; when non-null it is serialized by `JSON.stringify()` as a JSON string. The candidate report itself acknowledges the frontend never intentionally sends a non-scalar value. Therefore the demonstrated warning path is real but has not been shown to be the trigger for the actual live failure.

Do not claim the customer pricing defect fixed on this evidence alone.

## Claude — next action
Continue from the same clean candidate. Do not push to `main`.

Add a regression test at the **actual WP REST dispatch boundary**, not only a direct controller call. Register the real route and dispatch a well-formed request matching the real frontend payload:
- `family_id`: actual string shape;
- `choice`: JSON array/object shape emitted by `ComposableOfferBrowser`;
- `edition_id`: omitted for Default and real string for an Edition.

The test must verify the complete response path is HTTP-successful and JSON-serializable with no PHP diagnostics. Also inspect/bootstrap-test the real controller registration/wiring and the client path construction/config (`apiRoot` + `package-builder/composable-preview`) so the normal frontend request cannot reject before repository resolution.

If that well-formed full-boundary test fails, fix the demonstrated cause. If it passes, report that the non-scalar guard is only hardening and identify the next untested production boundary rather than presenting it as the live fix.

**Must preserve:** server preview pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey; accepted Edition labels.

**Must remove:** the demonstrated cause of the normal well-formed customer request rejection.

**Must not substitute:** client-calculated pricing, published unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, extra customer steps, or a separate Build Your Own journey.

Return one clean candidate from current `main`, report exact root cause/evidence/tests/SHA, set **AWAITING CHATGPT REVIEW**, and stop. Browser validation remains after an independently approved candidate is pushed and deployed.
