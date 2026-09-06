# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 correction only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head `4375642e24e4a4457e33466eecc9f844f082ccfe` is **not approved for main**.

## Audit result
The corrected candidate now gets most of the approved UI right:
- standalone Customer Selection Rules drawer/button is retired;
- no third `Editions` card action exists;
- the existing Customer Selection Rules summary area has `Default | Edition ...` scope tabs;
- Featured inclusions and policy-summary counts swap by selected declaration;
- Edition policy inherit/replace semantics are represented;
- ordinary Tier/Add-on and customer-facing source remain outside scope.

However, one approved requirement is still missing: **the customer-option editor target must follow the selected scope**.

Current `TierComposableMiddleShell.tsx` makes the tabs presentation-only and contains no editor/open action at all. Claude explicitly reports that Edition editing still requires navigating separately through `Build Your Own -> Options -> Edition chip -> Edit`. That means selecting `Edition 2` in the Customer Selection Rules panel displays Edition 2 data, but there is no panel-scoped edit path targeting Edition 2. This does not satisfy the user requirement that selecting Edition 2 should "display and edit Edition 2's inclusion policies" and that the "Customer-option editor target" switches with the tab.

## Required correction
Keep the accepted scope-tab projection, but restore an edit affordance within the Customer Selection Rules panel/header that targets the **currently selected declaration**:
1. Default selected -> edit action opens/addresses the existing Default Build Your Own inclusion-policy authoring path.
2. Edition selected -> the same edit action opens/addresses that exact existing Edition's editor/session, already used under Build Your Own -> Options. Reuse `useTierEditions` / existing Edition identity/controller; do not duplicate the editor or controller.
3. The selected scope's stable identity must be carried to the edit dispatch. Saving Edition 2 must structurally address Edition 2 only and cannot overwrite Default or another Edition.
4. Do not make tab selection itself mutate/save. The edit action is separate from scope selection.
5. Keep the panel as the filter: Featured inclusions and all Customer Selection Rules counts continue to swap with the selected scope.
6. Do not require the administrator to leave this panel and manually navigate through Options to find the selected Edition after choosing its scope here.
7. Ordinary Tier/Add-on remains unchanged; no customer-facing source changes; no new backend route/entity/draft/endpoint/identity family.
8. Add focused contract evidence that the panel edit target resolves to Default for Default scope and to the exact selected Edition id for Edition scope, including no cross-scope overwrite.
9. Prepare the final accepted tree as one clean review branch from current production `main@3cc88e83...` per branch-hygiene rules, run the focused validation suite, report exact branch/SHA/files/tests, and set **AWAITING CHATGPT REVIEW**.

Do not push main. Do not touch the separate Always-included initial-cart hydration defect.