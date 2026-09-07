# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — live validation exposed an Edition Edit routing defect**
- Auditor verdict: **Stop — architectural risk in the current isolated Edition-editor presentation.**
- Production `main`: `fa4b53b5ee0193b0580f31af876225c812056108`.
- Deploy #966 succeeded for that SHA.
- Keep `review/tier-catalogue-admin-ux-phase3-correction-v3` until this correction is replaced/reviewed.

## Live evidence
Nath validated the deployed Admin UI. Customer Selection Rules scope switching is present, but **Edition -> Edit** deep-links into the Edition editor as an isolated/focused drawer task. After Save the Edition becomes **Pending**, while the normal Tier drawer lifecycle context/footer is not available, leaving no normal Publish path in that presentation.

This must **not** be repaired by adding header/footer/lifecycle actions to the isolated view.

## Required correction
Remove the special Customer Selection Rules Edition presentation/deep-link behavior that scopes the Edition editor out as a standalone focused task.

Target behavior:
1. Customer Selection Rules -> **Default -> Edit** keeps using the canonical Default Inclusions edit path.
2. Customer Selection Rules -> **Edition X -> Edit** must route into the **canonical existing Tier drawer** exactly through its normal Edition ownership:
   - open the Build Your Own Tier drawer;
   - activate **Options**;
   - select the exact real Edition X;
   - open that Edition's existing inline editor, using the existing `TierEditionEditor` and existing draft/save path.
3. On **Save or Cancel**, return to the normal full Tier drawer with:
   - **Options** still active;
   - the same Edition still selected;
   - normal Details / Options / Connections / Support drawer groups and normal lifecycle/footer behavior available.

## Non-change boundaries
- Do **not** create another Edition editor, drawer, header, footer, lifecycle system, controller, persistence path, or publish action.
- Do **not** add Publish/Enable/Disable/etc. into the isolated editor presentation.
- Do **not** change Edition identity, CZTE/CZTEC ownership, `tier_editions[]`, save/settle/publish semantics, pricing, resolver, quote/cart/customer behavior, or backend routes.
- Reuse the real Edition ID and the existing Options/Edition inline editor.
- Remove only the extra presentation/routing machinery that causes the standalone focused-editor detour (including any now-unnecessary `initialEditTab`/auto-open plumbing if that plumbing exists only for this detour).
- Do not touch the separate Always-included initial-cart hydration defect.

## Claude — next action
Implement only this correction on a clean review branch from current production `main`. Update the relevant Code Map if current-state routing documentation changes. Run focused TypeScript/contracts/build checks required by the touched area.

Then update this same work file with:
- exact branch + candidate SHA;
- changed files;
- what routing/presentation code was removed or simplified;
- proof that canonical Edition save/lifecycle ownership is unchanged;
- validation results;
- `AWAITING CHATGPT REVIEW`.

Do **not** push to `main` until independent review approves the candidate.