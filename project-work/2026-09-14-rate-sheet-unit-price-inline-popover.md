# Rate Sheet — Unit Price Inline Popover

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Reviewer verdict: **Proceed**
- Production `main`: `9478f106fd7a5ee3ecce0c6a9e6925578614df05`
- Approved topic head: `cf7d7f2b133f3354e617318773b6da2d60d2e610`

## Reviewer result
The trigger correction passes independent review.

The topic is exactly one commit ahead of current production with no divergence. The active Unit Price cell now renders only a normal existing-system **Edit** button; the single Default Price preview is gone. The anchored popover itself is unchanged, including the three standard price rows, extra-option preservation, close/Save behavior, keyboard/focus behavior, and existing row draft/persistence boundary. The locked/read multi-price summary is also unchanged.

The source delta is bounded to the requested trigger refinement plus generated assets, documentation, and focused regression updates. Existing `aria-haspopup`, `aria-expanded`, Escape/outside-click close, and focus return remain preserved. The deployed popover width change already present in `9478f106` is not reverted.

Builder validation reports TypeScript, build, docs, Rate Sheet regressions, service-import and tier-connections checks passing; the Admin Station CSS contract has only the same six pre-existing unrelated findings.

## Next action
Builder may move only exact SHA `cf7d7f2b133f3354e617318773b6da2d60d2e610` to `main` and run the normal deployment. After deployment, record the exact `main` SHA and workflow result, set **AWAITING LIVE VALIDATION**, and ask Nath to verify that the active Unit Price cell shows only Edit and that the existing popover/read summary still behave correctly. Then stop.
