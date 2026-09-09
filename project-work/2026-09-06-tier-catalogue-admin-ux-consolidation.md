# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged).
- Clean candidate: `review/upgrade-composable-preview-fix-v3` @ `4a73ed87` — one commit from current `main`, tree verified byte-identical to the accepted `bdfa3c71` (`git rev-parse HEAD^{tree}` matches exactly). `review/upgrade-composable-preview-fix-v2` deleted (local + remote).

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

## Branch-hygiene gate — CLOSED
Resolved: `git checkout -b review/upgrade-composable-preview-fix-v3` from
`main@0a13fd14`, `git merge --squash bdfa3c71`, one commit (`4a73ed87`).
No source content altered, no additional fix added — pure history squash.

Tree equality proven directly, not just asserted:
```
git rev-parse review/upgrade-composable-preview-fix-v3^{tree}  ->  17063a79b9dd596e01ad40a6eea2fd73568bf9aa
git rev-parse bdfa3c71^{tree}                                  ->  17063a79b9dd596e01ad40a6eea2fd73568bf9aa
```
Identical. Per instruction, no full test rerun was performed for this
history-only squash — prior green validation (round 3 report, same file,
same commit) stands unchanged since the tree is byte-for-byte the same.

`review/upgrade-composable-preview-fix-v2` deleted (local + remote) after
the replacement was confirmed.

## Claude — done; awaiting source-push approval
`review/upgrade-composable-preview-fix-v3` @ `4a73ed87` pushed. `main`
untouched. Ready for independent verification and, per the auditor's own
note above, source-push approval can follow once that's confirmed —
browser/customer validation happens after push and deployment, per
standing role split.
