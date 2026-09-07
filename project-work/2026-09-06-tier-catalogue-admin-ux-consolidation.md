# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION — final Customer Selection Rules UI cleanup deployed**
- Nath pushed `bd0a48d8be81c591e48ebe220dda21645b349089` to `main` (fast-forward, exact SHA, no additional source changes).
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`.
- Deploy: GitHub Actions run **#970**, workflow `deploy`, `head_sha` = `bd0a48d8be81c591e48ebe220dda21645b349089`, conclusion **success** (2026-09-07). Run URL: `https://github.com/CodeByNath/compuzign-platform/actions/runs/34125188009`.

## Independent audit
Accepted candidate contains only the requested final presentation cleanup:
1. Customer Selection Rules **Edit** removed completely, Default included; prop/dispatch/button path removed from this panel.
2. Redundant `.cz-tier-workspace__composable-metrics` `border-top` removed, leaving the shared `StationTabSet` underline/selected indicator as the only tab line.
3. Because that same border was the separator above the first metric row, `Always included` now starts without an extra top border; the existing `> * + *` rule still separates later metric rows.
4. Scope selection/filtering remains controlled by the existing selected declaration state and was not altered.
5. Cancelled `group_label` idea is absent: no new field, persistence, sanitizer, projection, editor, or storage change.
6. Existing Edition title labels and literal Default label remain unchanged.

No routing/edit architecture, Edition deep-link, CZT/CZTE/CZTC/CZTEC identity, backend, persistence schema, pricing/resolver, lifecycle, customer policy, quote/cart, or customer-facing behavior changed. Relevant Code Map/contracts and generated Admin assets are synchronized.

Claude-reported re-validation: `tsc` clean; focused declaration/overview/Edition/composable contracts PASS; `docs:check` PASS; build succeeded with clean working tree afterward. No browser validation was performed by Claude.

## Claude / Nath — next action
Deployed. Awaiting Nath's live check on production:
- no Edit button in any scope;
- one clean tab underline only;
- no border above `Always included`;
- Default/Edition tab filtering still works correctly.

Keep the accepted review branch until live validation passes. Do not touch the separate Always-included initial-cart hydration defect or unrelated lifecycle-regression-script failures.