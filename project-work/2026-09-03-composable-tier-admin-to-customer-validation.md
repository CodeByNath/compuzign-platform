# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — Admin customer-policy authoring is the blocker.**
- Auditor verdict: **Proceed with safeguards.**
- Production source: `main@28613c0584440420953da81737acd95d35f47f16`.
- Keep all follow-up in this file; do not create another work file.

## Verified production
On 2026-09-03 the auditor independently confirmed:
- GitHub `main` exactly matches the recorded SHA.
- Deploy to Hostinger run `33649657279` / #933 completed successfully for that exact SHA.
- Live pages: `/studio/` and `/pricing/`.

## Live Admin result
Read-only route: Studio → Packages → KAIROS — IaaS.

Passed:
- KAIROS retains its normal assigned Tier System and displays **Tiers 5**.
- A separate subordinate card appears below the five normal slots with the explicit text: **“Composable occupant — subordinate to this Tier system, not one of the 5 Tiers.”**
- The card is labelled **Build Your Own**, status **Empty**, with **Configure Build Your Own**.
- Opening it mounts the shared Tier drawer: Details, Options, Connections, Support, Overview, Rate Sheet/pricing rules, inclusions, Editions, lifecycle footer and Publish.
- It is Pending/unconfigured; no second Family→Tier System relation or sixth normal Tier was created.
- No Add-on or Popular authoring control was exposed for this composable context.

Blocking failure:
- No normal Admin controls exist in Details, Options, Connections, Support, or their visible actions for:
  - inclusion mode: required / optional / excluded;
  - optional default selection;
  - configurable quantity default / min / max / step;
  - Featured boolean.
- Price Option was not exposed as customer-selectable.
- No Save, Publish, Disable, catalogue assignment, Edition change, or other runtime mutation was performed.

## Live customer result
The existing KAIROS pricing page still renders its normal Tier/Edition and Add-on experience. No Build Your Own offer appears before plan selection. Because the Admin occupant is Empty/unpublished and its policy cannot be authored, this is expected and **is not a customer defect**. Per the stop boundary, no customer configurator behavior, quantity pricing, filters, paging, or post-plan “Upgrade your build” claim was made.

## Exact Claude instruction
Add the smallest normal Admin authoring flow for the composable occupant’s existing `customer_policy` contract. It must support, per inclusion:
- required / optional / excluded;
- optional default selected state;
- fixed versus configurable quantity with default/min/max/step;
- Featured boolean.

Expected behavior:
- Authoring belongs inside the existing shared Tier occupant editor and persists through the established composable occupant lifecycle.
- Validate values and identity server-side; reopen must faithfully show saved policy.
- Price Option remains non-customer-selectable.
- Once a genuine policy and real catalogue/Rate Sheet configuration can be authored, the same published offer may proceed to customer validation.

Hard non-change boundary:
- No parallel configurator/editor, sixth Tier, second Tier Instance, second Family assignment, fake records, DevTools/REST bypass, client-owned pricing math, or changes to normal Tier/Edition/Add-on behavior.
- Do not expand into final cart/quote, Request, PDF, email, promotions, or invented cross-period/TCV totals.

Report root cause/design, changed files, contracts/tests, exact commit SHA, push/deploy state, and unresolved risks here, then set **AWAITING CHATGPT REVIEW**.
