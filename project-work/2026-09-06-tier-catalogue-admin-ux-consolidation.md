# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING DEPLOYMENT RETRY — Phase 1 source is on main; Phase 2 blocked**
- Auditor verdict: **Proceed with safeguards**.
- `main` is now exactly `bfb203c776b3d4927ee7c34c54db31d80dc13bb9` — the previously approved Phase 1 candidate.
- Customer-frontend trace remains the compatibility contract for later Admin consolidation.
- Previous cart / PDF / email customer-output work is CLOSED.

## Phase 1 source verification
The approved Phase 1 candidate landed on `main` unchanged. The source change remains accepted:
- `settleTierEditionOverview()` calls existing `pruneStaleCustomerPolicy()` after final Edition selections / orphaned Leg-assignment pruning and before final sanitize;
- no resolver/public/customer/pricing/Commercial Leg/quote/cart/Request/PDF/email/order/routing change;
- focused regression coverage and Code Map update remain part of the exact landed commit.

## Deployment result — NOT accepted yet
GitHub Actions run `34030530788` (`Deploy to Hostinger`, run #963) for exact `main@bfb203c7...` **failed**.

Independent log inspection shows:
- checkout, dependency install and frontend build all succeeded;
- failure occurred only at **Deploy source via SSH**;
- exact failure: SSH connection `i/o timeout` after 30 seconds;
- SCP/assets step was skipped because the SSH deploy step failed.

This is deployment/infrastructure failure, not evidence of a source defect. Do not change source to address it.

## Next action — Claude
1. Re-run/retry deployment for exact `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9` with **no source commit/change**.
2. Record exact retry run ID and conclusion here.
3. If retry succeeds, delete `review/tier-edition-customer-policy-prune-parity` (it still exists on origin) and report cleanup.
4. Also report whether the remaining remote review branches `review/composable-tier-customer-ux` and `review/quote-email-billed-item-separators` correspond to already-closed work; if yes, clean them per branch-hygiene rules, but do not delete any branch whose work is genuinely still active.
5. Set **AWAITING CHATGPT REVIEW** after successful deployment/cleanup.

Do not start Phase 2 until the auditor confirms deployment success and branch hygiene.