# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — final Customer Selection Rules UI cleanup**
- Production `main`: `9d4948a5db18b9a1c78f21d134ea1432ed3c76e6`.
- Deploy #969 succeeded for exactly that SHA.
- Nath live-validated the scope-tab refresh: tab selection now shows the correct declaration-specific values.

## Accepted behavior
- `Default | Edition ...` tabs remain and correctly filter the displayed declaration data.
- Customer Selection Rules is now view-only; Edition editing remains under Build Your Own -> Options -> Edition -> module Edit.
- No special Edition deep-link/auto-open path.
- No pricing, resolver, identity, backend, persistence, quote/cart/customer behavior changes.

## Claude — fix these UI details only
1. **Remove the Customer Selection Rules Edit button completely.** There is no longer any Edit action in this panel, including Default.
2. **Fix the double underline beneath the scope tabs.** Keep the normal shared tab underline/indicator only; remove the extra horizontal border/line creating the doubled effect.
3. **Remove the border immediately above the first metric row (`Always included`).** The metrics should begin without that extra separator above the first row.

Do not redesign the panel, tabs, metrics, spacing system, routing, or Edition editing. Reuse the existing shared tab/metric presentation; this is presentation cleanup only.

Prepare a clean review branch from current `main`, update focused presentation contract(s) only as needed, rebuild the Admin bundle, run focused `tsc`/contracts/build, and record exact branch/SHA + validation here as **AWAITING CHATGPT REVIEW**. Do not push to `main` until reviewed.

Do not touch the separate Always-included initial-cart hydration defect or unrelated lifecycle-regression-script failures.