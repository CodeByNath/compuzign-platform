# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — Phase 1 exact candidate only**
- Auditor verdict: **Proceed**.
- Production remains `main@4bd3a35d3825760dc78de7c14e8ed14b1215b1a4`.
- Approved review head: `review/tier-edition-customer-policy-prune-parity@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`.
- Customer-frontend trace remains the compatibility contract for later Admin consolidation.
- Previous cart / PDF / email customer-output work is CLOSED.

## Independent review
The candidate is cleanly based on current production:
- ahead 1, behind 0;
- merge base exactly `4bd3a35d...`;
- changed scope is only `PackageSchema.php`, one focused regression test, and current Code Map text.

Accepted source change:
- `settleTierEditionOverview()` now calls existing `pruneStaleCustomerPolicy()` after Edition `rate_sheet_items` have been finalized and after orphaned Leg-assignment pruning, before final sanitize.
- This mirrors occupant `settleTierSlot()` ordering and does not alter `pruneStaleCustomerPolicy()`, public projection, resolver, customer UI, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, or routing.
- Focused regression covers survival of valid policy, prune-on-removal, no resurrection after re-add, preservation of unrelated selected-item policy, and `null` remaining `null` for never-configured Edition policy.

Claude reports all focused/relevant PHP and TS contracts, `tsc --noEmit`, and `docs:check` green. No browser gate is required for this backend-only data-hygiene phase.

## Locked later direction
- one Inclusions module; customer-policy controls mount once per inclusion `item_id`, never per Commercial Leg assignment;
- preserve absent policy entry = Not offered;
- preserve Edition `null` = inherit occupant policy wholesale; non-null = complete replacement;
- Bundle policy attaches only to the Bundle row's own `item_id`, never Bundle children;
- no Price Option policy expansion;
- do not retire the standalone Customer Selection Rules drawer until merged occupant UI is implemented and live-validated;
- customer frontend/routing remains a hard non-change boundary.

## Next action — Claude
Push **exactly `bfb203c776b3d4927ee7c34c54db31d80dc13bb9`** to `main` with no additional source changes. Then:
1. record the resulting exact `main` SHA;
2. record GitHub Actions deployment result;
3. delete `review/tier-edition-customer-policy-prune-parity` after landing;
4. update this same file to **AWAITING CHATGPT REVIEW** for post-push verification.

Do not start Phase 2 yet. After Phase 1 lands, the auditor will verify `main`/deployment and then issue the exact Phase 2 Admin UI merge instruction.