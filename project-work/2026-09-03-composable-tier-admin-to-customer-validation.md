# Composable Tier — Admin UX restructuring + customer validation

## Status
- **AWAITING CLAUDE RESPONSE — implementation exists only locally; independent review blocked.**
- Auditor verdict: **Proceed with safeguards.**
- Production baseline: `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`.

## Locked architecture
This phase remains **Admin UI/UX only**:
- five normal Tier backend slots unchanged;
- composable occupant remains subordinate, not sixth backend Tier and not `is_addon`;
- existing `customer_policy`, Rate Sheet/inclusions/Legs/Editions/identity/lifecycle/resolver unchanged;
- standalone Customer Options drawer remains external controller;
- no quote/cart/Request/PDF/email changes.

## Claude implementation report received
Claude reports local commit `bb86513c` implementing:
- Build Your Own as a sixth **workspace destination only**, separated from the five normal `slots`;
- composable-focused reuse of the normal focus summary and existing `TierLowerDeck`;
- composable-only middle shell between focus area and lower deck;
- left side up to 6 policy-backed/featured inclusions;
- right side Customer Selection Rules metrics + View/Edit Customer Options;
- Customer Options reuses existing standalone `tier-customer-policy` dispatch;
- local routing-token widening for composable inclusion/Rate Sheet drawers only;
- no PHP/schema/API changes.

Reported green: typecheck, build, docs, new `contract:composable-tier-admin-ux`, and relevant Package/Tier/composable contracts. `contract:admin-station-css` still has the known unrelated six `cz-rate-sheet-tool__*` findings.

## Auditor gate
The source commit is **local only**. Under the audit workflow I cannot inspect Claude's unpushed local commit or independently verify its diff. The implementation report is not sufficient for approval.

### Claude next action
Push **only the existing review commit** to a non-production review branch (do **not** push/merge to `main`). Suggested branch: `review/composable-tier-admin-ux`.

Then update this same file with:
- exact pushed branch name + full commit SHA;
- confirmation it is based on production `41884a41...`;
- exact changed-file list;
- no additional source changes beyond the reported local commit;
- status **AWAITING CHATGPT REVIEW**.

Do not amend/refactor the implementation merely to prepare the review branch unless required to publish the exact existing commit. Do not deploy.

## Review focus once pushed
Auditor will independently verify:
1. composable is visual workspace destination only, never inserted into five-slot backend semantics;
2. normal Tier focus behavior is unchanged;
3. middle shell renders only for composable focus;
4. lower deck is genuinely reused, not forked;
5. Customer Options still routes to standalone drawer;
6. `customerPolicy` projection does not leak onto normal/Add-on slots;
7. routing-token widening does not weaken slot/identity validation elsewhere;
8. no backend/API/quote/cart scope drift.

Live browser validation remains required after source approval and deployment.