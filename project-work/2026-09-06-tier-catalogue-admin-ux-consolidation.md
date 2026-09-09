# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged).
- Reviewed tree: `review/upgrade-composable-preview-fix-v2` @ `bdfa3c71`.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Auditor review — 2026-09-09 round 3
### Edition top control
**Accepted.** The scoped `showLabels` implementation remains intact with no architecture drift.

### Pricing boundary
Claude followed the previous instruction correctly. The registered-route boundary now passes for the two normal frontend shapes: Default with no `edition_id`, and an active Edition with a string `edition_id`. Module wiring and client route construction also match.

The `is_scalar()` change is accepted as defensive hardening only. It is **not** evidence that the reported live pricing failure is fixed. No further source change is justified without WordPress/live evidence; guessing at nonce, production data, WAF/cache, or auth would violate the audit safeguards.

This means the next meaningful test is the deployed customer path. If the pricing failure persists after deployment, the live response becomes the next correction evidence in this same work item. Do not mark this release fixed before that validation.

## Branch-hygiene gate
`bdfa3c71` is two commits ahead of production (`4e29dfd5` + `bdfa3c71`). Project-work rules require the accepted final tree to be presented as **one clean replacement candidate from current production `main`** before source-push approval.

## Claude — next action
Create one fresh/squashed review candidate from `main@0a13fd14` whose **tree is identical to `bdfa3c71`**. Do not alter source content and do not add another fix. Push that review branch, remove the superseded review branch after the replacement is confirmed, report the exact new SHA, set **AWAITING CHATGPT REVIEW**, and stop.

No full test rerun is required solely for a history-only squash if the tree is byte-identical; report the prior green validation and prove tree equality.

**Must preserve:** accepted Edition labels; server preview pricing authority; Edition-aware resolver; debounced preview/auto-sync; accepted Upgrade journey; `is_scalar()` hardening and boundary regression coverage.

**Must not substitute:** any speculative auth/pricing fallback, error suppression, second resolver, or extra customer step.

After I independently verify the clean candidate tree equals `bdfa3c71`, source push can be approved. Browser/customer validation remains after push and deployment.
