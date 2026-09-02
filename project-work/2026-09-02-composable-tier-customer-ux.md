# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING LIVE VALIDATION.**
- Auditor verdict: **Proceed with safeguards**.
- Verified production `main`: `28613c0584440420953da81737acd95d35f47f16`.

## Independent verification
- GitHub `main` resolves to `28613c0584440420953da81737acd95d35f47f16`.
- `main` and `review/composable-tier-customer-ux` compare identical: 0 commits and 0 files different. The pushed production source is therefore exactly the reviewed Phase 2B1 head.
- GitHub Actions Deploy to Hostinger run #933 (`33649657279`) is independently verified `completed / success`, event `push`, branch `main`, exact `head_sha=28613c0584440420953da81737acd95d35f47f16`.

## Accepted contract
No architecture change. Same subordinate composable Tier occupant and server resolver. Customer controls only Add/Remove plus allowed quantity. No customer Price Option, Leg, commitment or Edition editing. Service/Category remain filter metadata; `featured` remains bool-only. Candidate preview is server-resolved and debounced. Payment preview does not invent cross-Period totals. Selected card contribution comes from server `line_total`; ambiguous multi-Leg contribution is not summed. Existing normal Tier/Add-on quote persistence remains unchanged. Cart/request/PDF/email/promotions remain out of scope.

## Live validation gate
Because Phase 2B1 changes customer-facing code, deployment success is not enough for closure. Read-only validation is still required on the deployed Package Builder/pricing surface.

Check normal Tier/Edition and Add-on behavior for regressions. If a live Family already has a configured public composable offer/customer policy, also verify Build Your Own / Upgrade your build, eligible-row filtering/paging, Add/Remove, quantity updates, resolved stream/card prices, and absence of Price Option controls/raw Platform IDs.

Do not mutate production just to create test policy data. If no live configured policy exists, record that the composable path cannot yet be exercised live and keep the first real configured-policy exercise as a required follow-up gate.

No further Claude source action is authorized.