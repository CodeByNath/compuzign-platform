# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — final Customer Selection Rules UI cleanup only**
- Production `main`: `9d4948a5db18b9a1c78f21d134ea1432ed3c76e6` (deploy #969 success).
- Existing UI-cleanup candidate `bd0a48d8` is one clean commit from current main and remains the basis for this final round.

## Final required cleanup
- Remove Customer Selection Rules **Edit** completely, Default included.
- Keep only the normal shared tab underline/indicator; remove the extra line creating the double underline.
- Remove the separator above the first metric row (`Always included`); retain separators between later metric rows.
- Preserve the now-correct declaration tab filtering/data projection.

## Superseded idea — do NOT implement
The proposed persisted declaration `group_label` field is **cancelled for this phase**. Do not add any new Group label/category metadata, storage, sanitization, editor field, projection, or frontend behavior.

Current naming stays:
- Default scope label remains `Default` for now.
- Edition scope labels continue to use the existing Edition `title` (e.g. `Subscriptions`).

A separate grouping/taxonomy field can be reconsidered later only when there is a concrete need for category != Edition title or customer-facing grouping of multiple declarations.

## Must not change
No routing/edit architecture changes, no Edition deep-link restoration, no CZT/CZTE/CZTC/CZTEC identity changes, no persistence schema changes, no pricing/resolver, lifecycle, customer-policy, quote/cart, or customer-facing changes. Do not touch the separate Always-included initial-cart hydration defect or unrelated lifecycle-regression-script failures.

## Claude — next action
If `bd0a48d8` still exactly represents these three UI cleanup requirements with no Group-label work, use that clean candidate; otherwise prepare one clean replacement commit from current `main` containing only the three UI changes and necessary focused contract/Code Map/generated-asset sync.

Run focused `tsc`, relevant declaration/UI contracts, `docs:check`, and build. Record exact branch/SHA and validation here as **AWAITING CHATGPT REVIEW**. Do not push to `main` until reviewed.