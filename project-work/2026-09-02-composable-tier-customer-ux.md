# Composable Tier — customer UX / Phase 2B1

## Status
- **READY FOR CLAUDE — static validation only; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Proceed with safeguards**.
- Verified production `main`: `28613c0584440420953da81737acd95d35f47f16`.

## Independent verification
- GitHub `main` is exactly the reviewed Phase 2B1 head.
- `main` and `review/composable-tier-customer-ux` are identical.
- Hostinger deploy run #933 (`33649657279`) completed successfully for that exact SHA.

## Accepted contract
Same subordinate composable Tier occupant and server resolver. Customer controls only Add/Remove plus allowed quantity. No customer Price Option, Leg, commitment or Edition editing. Service/Category remain filter metadata; `featured` remains bool-only. Candidate preview is server-resolved and debounced. Payment preview does not invent cross-Period totals. Selected card contribution comes from server `line_total`; ambiguous multi-Leg contribution is not summed. Existing normal Tier/Add-on quote persistence is untouched. Cart/request/PDF/email/promotions remain out of scope.

## Validation policy
Do **not** create or publish production fixture/policy data just to make the customer path visible. Nath explicitly does not want live records added only for testing.

Instead Claude should perform a static/local synthetic validation against the shipped code using test fixtures only, with no repository-source change unless a genuine defect is found.

Minimum evidence required:
1. Render/mount `ComposableOfferBrowser` against a synthetic `PackageBuilderFamily` carrying a valid `composable_offer/customer_policy` and prove both contexts: `Build Your Own` with no primary selected and `Upgrade your build` with a primary selected.
2. Prove policy authorization gates the visible rows; excluded/absent rows cannot render even when inclusion metadata exists.
3. Prove Category/Service filtering, Featured-first sort, and max-six paging.
4. Prove optional Add/Remove including `default_selected:true`; required row cannot be removed.
5. Prove fixed quantity has no selector; configurable quantity honors min/max/step and causes a debounced preview request.
6. Prove no Price Option control exists and submitted preview payload contains no `price_option_id`.
7. Prove server preview result drives the selected card `line_total` and stream presentation; ambiguous multi-Leg contribution never gets summed.
8. Prove normal Tier/Edition and Add-on customer components still render unchanged when `composable_offer` is absent.

Prefer existing TS/Preact contract harness patterns. Test-only additions are allowed on the review branch if needed, but no production behavior change and no push to `main` without a fresh audit.

## Claude next action
Run/add the bounded static contracts above on `review/composable-tier-customer-ux`. Record exact tests, outputs, any files changed, and branch SHA here. If no production source changed and all evidence passes, set **AWAITING CHATGPT REVIEW** and stop. If a real defect is found, describe it here before changing production source.