# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — build external customer-policy controller/drawer.**
- Auditor verdict: **Proceed with safeguards.**
- Production source: `main@28613c0584440420953da81737acd95d35f47f16`.
- Keep all follow-up in this file.

## Verified live state
Studio → Packages → KAIROS — IaaS confirms:
- five normal Tier slots remain unchanged;
- separate subordinate **Build Your Own** card exists below them;
- opening it uses the normal shared Tier occupant editor/lifecycle;
- no customer-policy authoring controls exist yet;
- pricing page correctly shows no Build Your Own while the occupant is empty/unpublished.

## Architecture clarification — locked before implementation
Keep the **normal Tier occupant and composable occupant commercially identical** as far as practical.

The composable occupant itself continues to own the product definition exactly like a normal full Tier occupant:
- Rate Sheet and inclusions;
- authored quantities/Price Options;
- Commercial Legs;
- commitment/headline;
- Editions;
- publish/archive/disable lifecycle.

Do **not** bake customer-composition controls into first-time occupant setup.

After the composable occupant has been created/published through the normal occupant workflow, its **Build Your Own home shell** gets a separate action such as **Customer Options** / **Customer Rules**. That action opens a dedicated drawer/module whose only job is to control customer behaviour over inclusions already owned by that occupant.

The external customer-policy controller/drawer owns only:
- required / optional / excluded;
- optional default-selected;
- fixed vs customer-configurable quantity;
- quantity default/min/max/step;
- Featured bool.

Key invariant:
> If the customer-policy controller is removed, the composable occupant is still a valid normal Tier occupant.

The policy drawer must never create/prioritize/price inclusions independently. It references the published occupant's existing inclusion `item_id`s only. No second inclusion list or duplicated commercial authority.

## Claude implementation scope
1. Preserve the existing normal composable occupant Configure/Edit flow unchanged.
2. On the composable home shell, expose a customer-policy View/Edit action only when there is a real composable occupant to manage; define sensible disabled/empty-state behavior before first publish.
3. Open a dedicated policy drawer/module from that shell action, not a second product configurator.
4. Load policy rows from the occupant's existing inclusions and existing `customer_policy` persistence contract.
5. Save through established composable occupant persistence with server-side identity/value validation; reopen must faithfully reproduce saved policy.
6. Customer Price Option remains non-selectable. Commercial Legs/commitment/Editions are read-only/out of scope in this drawer.
7. Add focused contracts for shell action visibility, policy/inclusion identity binding, save/reopen, validation, and no regression to normal Tier/Add-on occupant flows.

## Hard non-change boundary
No sixth Tier, second Tier Instance/Family assignment, separate product identity, parallel inclusion catalogue, client pricing math, fake production records, REST/DevTools bypass, cart/quote/Request/PDF/email/promotions work, or TCV arithmetic.

## Claude next action
Audit the current composable home shell, shared drawer/lifecycle, and existing `customer_policy` persistence path first. Implement the smallest external policy-controller drawer on a review branch. Record design, changed files, tests/contracts, exact branch SHA and unresolved risks here; set **AWAITING CHATGPT REVIEW** and stop. Do not push `main`.