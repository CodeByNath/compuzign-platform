# Composable Tier — Admin → customer browser handoff

## Status
- **SOURCE PUSH APPROVED — corrected external Customer Options controller accepted for production push.**
- Auditor verdict: **Proceed with safeguards.**
- Production before push: `main@28613c0584440420953da81737acd95d35f47f16`.
- Approved review head: `review/composable-tier-admin-customer-policy@8ff4eff9` (3 commits ahead).

## Locked architecture
Normal Tier occupant and composable occupant remain commercially identical. Build Your Own is configured/published through the normal occupant editor. Customer Selection Rules are an external controller over that occupant, never a fifth Tier product module.

Customer Options controls only: required/optional/excluded, optional default-selected, fixed vs configurable quantity with default/min/max/step, and Featured. It references only existing occupant inclusion `item_id`s. Price Option, Legs, commitment and Editions remain occupant-authored and outside this drawer.

## Auditor review of correction `8ff4eff9`
The correction resolves the prior architectural stop:
- shared `TIER_ENTITY`/normal Tier drawer is back to its established four-module contract;
- composable shell alone receives **Customer Options**;
- launcher is gated on occupant `enabled`/active rather than mere `occupant_id` existence;
- a dedicated `tier-customer-policy` drawer/entity/controller owns the policy UI;
- controller re-checks eligibility defensively;
- rows resolve through the composable occupant's own Rate Sheet selections using the existing catalogue builder;
- persistence remains the occupant's existing `customer_policy` draft/save/revert contract;
- policy Save does not invent a separate lifecycle or settle/publish the occupant;
- normal Tier/Add-on card projection remains unchanged.

The two backend fixes are legitimate: Admin normalization now returns stored `customer_policy`, and the generic module-revert route accepts it.

Independent diff comparison confirms `8ff4eff9` is exactly 3 commits ahead of production and includes the dedicated drawer/controller plus focused contracts; no cart/quote/Request/PDF/email/promotions/TCV scope is present.

Claude reports clean TypeScript/build/docs and focused composable/Tier contracts plus PHP resolver/admin-surface tests. The reported `admin-station-css` and lifecycle-fixture failures remain pre-existing/unrelated; they are not grounds to block this narrow phase.

## Safeguard / live boundary
Source architecture is accepted, but this phase is **not CLOSED** until the exact pushed `main` SHA deploys successfully and live Admin behavior is checked. Do not create fake production records. A real Build Your Own occupant must be configured/published through normal Admin flow before Customer Options can be exercised.

## Claude next action
Push only the accepted `8ff4eff9` source state to `main` using the normal repository workflow. Do not add scope or amend implementation during the push. Then update this same file with:
- exact resulting `main` SHA;
- push/merge relationship to `8ff4eff9`;
- GitHub Actions deployment run ID/status;
- any deployment failure or divergence.
Set **AWAITING CHATGPT REVIEW** and stop. Do not perform production record/configuration changes.