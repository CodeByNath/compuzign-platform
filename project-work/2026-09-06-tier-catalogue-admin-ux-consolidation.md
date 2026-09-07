# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — extend final cleanup with declaration Group label**
- Production `main`: `9d4948a5db18b9a1c78f21d134ea1432ed3c76e6` (deploy #969 success).
- Existing UI-cleanup candidate `bd0a48d8` is one clean commit from current main and its three requested presentation changes are accepted in principle, but **do not push it yet** because Nath has added one final requirement to this same phase.

## Already-required UI cleanup — preserve
- Remove Customer Selection Rules Edit completely, Default included.
- Keep one normal shared tab underline only.
- No separator above first metric row (`Always included`); later metric row separators remain.
- Existing declaration tab filtering stays correct.

## New requirement — Group label
Nath wants a generic admin-controlled grouping/category label for the Default declaration and each Edition, e.g. `Standard`, `Subscriptions`, `Fixed Terms`, without changing their actual identity or Edition title.

Implement this as an **additive declaration metadata field** named `group_label` unless current source already has an equivalent authoritative field (prove before substituting).

Required behavior:
- Default/CZT declaration can store/edit its own optional **Group label** through its existing Overview authority.
- Each CZTE Edition can store/edit its own optional **Group label** through its existing Edition Overview session.
- Customer Selection Rules scope tabs display `group_label` when non-empty.
- Safe backwards-compatible fallback: Default tab = `Default`; Edition tab = existing Edition `title` when no group label exists.
- Edition `title` remains independent and unchanged; Group label is taxonomy/presentation metadata, not identity, pricing, lifecycle, billing, or commercial authority.
- Persist through the existing Tier/Edition draft-save-settle paths only. No new endpoint, controller, drawer, lifecycle, or parallel storage.
- Store it authoritatively so it can be useful to customer/frontend grouping later, but **do not change current customer-facing UI or quote/cart behavior in this phase**.

## Must not change
CZTE/CZTEC/CZT/CZTC identity, Edition ownership, Rate Sheets, Commercial Legs, pricing/resolver, lifecycle semantics, customer policy, quote/cart, or the removed Edition deep-link route. Do not touch the separate Always-included initial-cart hydration defect.

## Claude — next action
Audit the existing Default Tier Overview and Edition Overview persistence/sanitization/draft-settle chain first, then extend the current cleanup with the smallest additive `group_label` path. Update affected current-state Code Maps/contracts.

Return **one clean final review commit from current `main`** containing: the already-reviewed UI cleanup + Group label implementation + rebuilt Admin assets. Run focused `tsc`, relevant Tier/Edition/declaration contracts, `docs:check`, and build. Record exact branch/SHA, files and validation here as **AWAITING CHATGPT REVIEW**. Do not push to `main` until reviewed.