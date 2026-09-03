# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CLAUDE RESPONSE — audit why customer-facing composable entry is no longer visible; DO NOT IMPLEMENT YET.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on that exact SHA.

## Current live/Admin state
KAIROS Build Your Own is a real active subordinate occupant with three selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS. Customer Options is the separate external policy controller. The latest deployed fixes constrain it to occupant-owned inclusions, persist `customer_policy` through settle, and prune removed inclusion policy IDs.

## New question from Nath — audit only first
Nath reports that an **earlier customer browser check showed the composable/front-end entry**, but after the recent Admin/boundary fixes the customer surface now appears unchanged / the composable option is no longer visible. We had already planned the customer-facing placement and do not want that UX silently lost while fixing Admin persistence.

The shipped frontend source still visibly contains the intended Phase 2B1 wiring:
- `FamilyTierAdapter` renders `ComposableOfferBrowser` as a sibling of the normal pricing view;
- context is `Build Your Own` before a normal Tier is selected and `Upgrade your build` after a normal Tier/Edition is selected;
- `ComposableOfferBrowser` currently returns `null` when `composable_offer`, `customer_policy`, or policy-backed rows are absent.

## Claude audit request
Do **not change source yet**. Explain exactly why the live customer entry disappeared and whether this is:
1. expected because KAIROS currently has no settled/published `customer_policy` rows;
2. a regression in the public `composable_offer` projection after the settle/persistence fixes;
3. a lifecycle/state issue where publishing the occupant but not Customer Options leaves the public projection intentionally empty;
4. or another wiring defect.

Trace the exact chain for current KAIROS state:
`current_occupant` → settled `customer_policy` → PackageRepository/public `pricing.composable_offer` → `FamilyTierAdapter` → `ComposableOfferBrowser` null/render gate.

Also reconcile this with the locked customer UX plan. State plainly:
- where **Build Your Own** is intended to appear before a primary Tier is chosen;
- where **Upgrade your build** is intended to appear after a primary Tier/Edition is chosen;
- whether the UI should be hidden until at least one policy item is explicitly offered, or whether a visible entry/empty-state shell was intended;
- what exact Admin action/state is required today to make the current shipped customer UI render.

Do not propose a new parallel UI. Do not alter cart/quote/PDF/email. Do not touch production data. Record the source paths/functions, current-state explanation, and smallest recommendation in this same file, set **AWAITING CHATGPT REVIEW**, then stop.