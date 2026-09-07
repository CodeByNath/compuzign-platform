# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — live validation found Edition tab filtering defect**
- Production `main`: `77d5ef76e25622ac8c7756f49b4f0073395fdd2d`.
- Deploy: GitHub Actions run #968 — **Success** for exactly that head SHA.
- Keep the accepted review branch until this live defect is corrected and revalidated.

## Accepted architecture remains unchanged
- Customer Selection Rules keeps `Default | Edition ...` scope tabs for viewing declaration-specific data.
- Edit exists only for **Default** and routes to canonical Default Tier Inclusions.
- Edition authoring remains under Build Your Own -> Options -> Edition -> existing module Edit.
- No special Edition deep-link/auto-open path is to be restored.
- No pricing, resolver, identity, quote/cart/customer behavior changes.

## Claude — fix this only
Live validation shows the **Edition tabs are not filtering the right-side Customer Selection Rules column**. Selecting an Edition still leaves that column showing Default-scope values.

Fix the existing `Default | Edition ...` tabs so the right-side Customer Selection Rules metrics/data are filtered by the currently selected scope. When `Edition 2` is selected, the right column must show Edition 2's values; when `Default` is selected, it must show Default's values.

Do not redesign the UI or change routing/edit behavior. This is only a tab-to-right-column filtering/state-binding correction.

Push the correction to a clean review branch and report the exact SHA plus focused validation. Do not push to `main` until ChatGPT audits it.

Do not touch the separate Always-included initial-cart hydration defect or begin another phase.