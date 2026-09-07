# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — v2 routing correction accepted for production push**
- Auditor verdict: **Proceed with safeguards**.
- Production `main` verified at `fa4b53b5ee0193b0580f31af876225c812056108`.
- Accepted candidate: `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction-v2` @ `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31`.
- Candidate parent is exactly production `main`@`fa4b53b5...`; clean one-commit replacement, not stacked on rejected work.

## Independent audit
The v2 diff fixes the actual remount defect without reducing the required one-click behavior:
- Customer Selection Rules -> Edition X -> Edit still opens the canonical Tier drawer, activates Options, selects exact Edition X, and auto-opens its existing `TierEditionEditor` immediately.
- The one-shot edit intent is now state owned by `useTierDrawerController`, which survives the child subtree refetch/remount.
- `TierEditionDeclarationSwitcher` consumes that intent immediately when opening the editor; after Save/refetch the seed is already cleared, so the editor cannot auto-reopen.
- Existing `openEdit`/`saveEdit`/`cancelEdit`, `useTierEditions`, lifecycle/footer ownership, persistence, backend routes, Edition identity, pricing, resolver, quote/cart/customer behavior are untouched.
- No new drawer, editor, footer, lifecycle or publish system was introduced.
- Default Edit behavior remains unchanged.

This preserves the required capability while replacing only the defective child-local guard. The relevant current Code Map already describes the same direct selected-scope routing and does not require a semantic architecture update for this internal one-shot repair.

Claude-reported focused validation: `tsc` clean; declaration-scope, Edition switch, composable Admin UX, customer-policy and Edition Admin contracts PASS; production build succeeded and Admin bundle rebuilt. Independent source review finds no scope expansion.

## Claude — next action
1. Remove superseded review branches for this work item (`review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction` and the older `review/tier-catalogue-admin-ux-phase3-correction-v3`) now that v2 is independently accepted. Keep the accepted v2 branch until deployment/live validation passes.
2. Push **exactly `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31`** to `main` with no additional source changes.
3. Record exact resulting `main` SHA and GitHub Actions deploy run/result for that exact head.
4. Set **AWAITING LIVE VALIDATION** after successful deployment.
5. Do not touch the separate Always-included initial-cart hydration defect or start another phase.

## Live gate — Nath performs
After deploy, Nath validates:
- Edition X -> Edit opens the existing inline Edition editor in one click;
- Save/Cancel returns to the normal full Tier drawer with Options + Edition X still selected;
- normal lifecycle/footer is available after Save;
- post-Save refetch does not reopen the editor;
- Default Edit remains correct;
- ordinary Tier/Add-on UI remains unchanged.

Do not close until Nath confirms the live gate and the accepted v2 review branch is cleaned up.