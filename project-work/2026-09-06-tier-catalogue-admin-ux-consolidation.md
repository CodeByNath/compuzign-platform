# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 live UI correction only**
- Auditor verdict: **Proceed with safeguards**.
- `main@75105e92dcdd751c27e48f46491c0cac1f486dd7` is deployed successfully.
- Phase 3 live validation is a **partial fail on presentation/projection only**; scope-targeted editing itself works.
- Separate Always-included initial-cart hydration defect remains untouched.

## Live findings accepted
The deployed UI proves:
- `Default | Edition ...` tabs render and switch scope;
- `Edit Customer Options` correctly opens the selected declaration's existing inclusion-policy editor/session;
- no cross-scope editor-routing defect was observed;
- standalone Customer Selection Rules drawer is gone.

Remaining defects are UI projection/layout:
1. Scope selection currently changes only the Featured/policy middle area; it does **not** update the upper center Build Your Own detail card (price, included-feature count, common-question count, and other declaration-owned summary data).
2. Customer Selection Rules controls are laid out incorrectly: tabs must live at the **top-right of the right column**; the action must live at the **bottom-right of that same right column**.
3. Action copy must be exactly **`Edit`**.
4. Use established Admin design-system primitives/tokens: the existing Admin drawer/tab system for the declaration tabs and the established Admin **primary button** treatment for Edit. No ad-hoc/hardcoded spacing, typography, border, color, or button/tab styling.

## Locked correction architecture
There must be **one selected declaration scope state** for the focused Build Your Own workspace, owned high enough (e.g. `PackageTierWorkspace`) to drive every declaration-scoped projection. Do not keep scope selection private inside `TierComposableMiddleShell` if that prevents the upper card from following it.

Changing `Default | Edition ...` must synchronously project the same selected declaration into:
- upper center Build Your Own detail card: declaration price/billing display, included-feature metric, common-question metric, and any other fields that card already derives from declaration data;
- lower-left Featured Inclusions;
- lower-right Customer Selection Rules counts/details;
- lower-right Edit target.

The two lower columns remain the same two-column deck. Left column contains **Featured Inclusions only** — no tabs/button. Right column contains, in order:
- declaration tabs aligned top-right;
- selected declaration's Customer Selection Rules metrics/details;
- `Edit` primary action aligned bottom-right.

Default remains initial. Edition scope must use that Edition's existing data/identity. `customer_policy = null` inherits Default policy; non-null replaces it. Do not invent copied Edition state or a second resolver.

## Claude — correction only
1. Lift/control selected declaration scope so `TierComposableMiddleShell` and the upper `TierDetailPanel`/equivalent declaration summary consume the same active scope.
2. Reuse existing declaration projections/data already built in `declarationScopes`; extend the scope projection only as necessary to provide upper-card fields. Do not hardcode values.
3. Ensure tabs drive **both lower columns and upper middle detail card**.
4. Re-layout middle shell exactly as above using existing Admin layout/classes/primitives where possible.
5. Replace `Edit Customer Options` with **`Edit`**, using the established Admin primary-button primitive/classes/tokens.
6. Use the established Admin drawer/tab system/primitive for declaration tabs; no bespoke inline tab CSS or hardcoded visual values.
7. Preserve current working selected-scope editor routing and identity isolation.
8. Ordinary Tier/Add-on, backend/storage/lifecycle, customer frontend, quote/cart/PDF/email/order remain unchanged.
9. Add focused contracts proving one selected scope drives upper detail + Featured + rule metrics + Edit target, and ordinary Tier remains unchanged. Add a presentation contract/source check preventing bespoke tab/button styling if suitable.
10. Run tsc/build/docs check and focused Admin/Edition/customer-policy contracts. Push one clean review candidate from current `main@75105e92...`, report exact SHA/files/tests, set **AWAITING CHATGPT REVIEW**.

Do not push main. Do not start another phase.