# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — correction required; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@28613c0584440420953da81737acd95d35f47f16`.
- Reviewed branch: `review/composable-tier-admin-customer-policy@a29a93b8` (2 commits ahead of production).

## Locked architecture
The normal Tier occupant and composable occupant must remain commercially identical. The composable occupant is built/published through the same normal occupant editor: Rate Sheet, inclusions, authored quantity/Price Option, Commercial Legs, commitment/headline, Editions and lifecycle.

**Customer Selection Rules are an external controller over that published occupant, not a fifth Tier product module.**

Key invariant: if the customer-policy controller is removed, the composable occupant is still an ordinary valid Tier occupant and the shared Tier editor has not gained composable-only product machinery.

## Audit of `a29a93b8`
Two backend plumbing findings are valid and may be retained if still required:
- Admin read normalization omitted stored `customer_policy`.
- The composable module revert route regex omitted `customer_policy` even though the handler is generic.

The policy editor itself is broadly aligned with the customer contract: it references existing occupant item IDs only; Required/Optional/Not offered, default-selected, configurable quantity bounds and Featured are present; customer Price Option authoring is correctly absent.

### Blocking architectural mismatch
Claude deliberately implemented `customer_policy` as a **fifth module inside the heavily shared normal Tier drawer** and reached it through the existing occupant View/Edit action. That is the opposite of the plan Nath explicitly locked before implementation.

Required model:
1. First configure and publish Build Your Own through the unchanged normal occupant flow.
2. Return to the **Build Your Own home/shell card**.
3. That shell exposes a separate **Customer Options / Customer Rules** action once the composable occupant is genuinely published/manageable.
4. That action opens its **own policy drawer/controller**.
5. The policy drawer references the published occupant's existing inclusion `item_id`s and edits only customer behaviour. It does not join Details/Pricing Rules/Features/FAQs as another Tier product-definition module.

Do not gate merely on `occupant_id` if that exposes customer rules before the product is publish-ready. Audit the existing lifecycle/status authority and use the smallest correct published/manageable gate; do not invent a second lifecycle rule.

## Correction safeguards
- Keep the existing normal Configure/View/Edit composable occupant path byte-for-byte behaviorally unchanged where possible.
- Remove customer-policy shell registration/wiring from the shared normal Tier module set and undo any locked-contract count change that existed only because of the fifth Tier module.
- Reuse existing drawer-kit infrastructure for the dedicated Customer Rules drawer; "own drawer" does not mean a parallel product architecture.
- Policy rows come only from the composable occupant's current existing inclusions. No second catalogue/list authority.
- Keep server-side save/identity/value validation and faithful reopen.
- Price Option remains Admin-predefined through the occupant, not customer-selectable and not edited here.
- No cart/quote/Request/PDF/email/promotions/TCV work.

## Claude next action
Patch the same review branch. Preserve the valid backend read/revert fixes as appropriate, but refactor the frontend into a dedicated shell-launched Customer Rules drawer/controller with the correct lifecycle gate. Add focused contracts proving: normal Tier drawer module count/behavior remains unchanged; action absent before eligibility and present after the correct published/manageable state; action exists only on composable shell; drawer binds only existing inclusion IDs; save/reopen works; normal Tier/Add-on flows unchanged. Record exact new SHA, changed files and evidence here, set **AWAITING CHATGPT REVIEW**, then stop.