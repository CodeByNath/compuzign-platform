# Cart Initial Payment Must Include Add-ons

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Current review branch: `review/cart-initial-payment-addons` @ `2a873b801f6888210785f6b840756f9b33b6c9c0`, 2 ahead / 0 behind production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
Round 2 fixes the actual customer-state split correctly. Cart, Review & Finalise and proposal/PDF now feed Initial Payment from the whole Family population (primary + composable + add-on), while Total Contract Value remains on its existing primary/composable population. `NotificationTemplates.php` had the same independent omission and is corrected the same way; its Contract Value path remains unchanged.

The rewritten parity assertions are acceptable: the old assertions encoded the defective shared population. The new checks distinguish TCV population from Initial Payment population and are therefore stricter, not weaker.

Independent GitHub compare confirms the branch is based exactly on production and changes only the expected customer/request/email presentation, regression/contract, package script entry and generated bundles.

## Safeguards still required before push approval
1. **Fix stale source comments** in `OrderSummary.tsx` and `QuoteProposalPreview.tsx`. Both still describe “same primary-only Total Contract Value / Initial Payment semantics” and say Family add-ons never enter the combined sum. That is now false and would misdocument the accepted rule. Rewrite only those comments so they clearly say TCV is primary/composable-only while Initial Payment is whole-Family-line.
2. Per branch-hygiene rules, do not ask to push a 2-commit review stack. After the comment correction, produce one clean candidate head from current production `main@1a9b6cc0` containing the accepted final tree for this work item. Reuse the same review branch name if practical; do not leave a superseded review branch.
3. Re-run the focused regression/parity checks affected by the comment-only correction plus TypeScript/build/docs as needed for the rebuilt final candidate. Record exact candidate SHA, tree/diff summary, and confirm 1 ahead / 0 behind production.
4. Stop at **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item payment rows; each item's own earliest-start semantics; same-cycle aggregation only; current TCV population; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback; email/PDF structure.

## Must remove
Primary/composable-only population from **Initial Payment** on every customer surface, plus the stale comments that still claim that old behavior.

## Must not substitute
Do not delete surviving add-ons; reattach them to another Family; broaden TCV; fake flat add-on pricing; re-resolve Rate Sheets; change the helper algorithm; invent cross-cycle arithmetic; or weaken customer parity tests.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. The add-on remains. Cart, Review & Finalise, proposal/PDF and email must agree on Initial Payment and include the surviving add-on's own starting charge(s), excluding later-starting Legs. TCV behavior must remain unchanged.
