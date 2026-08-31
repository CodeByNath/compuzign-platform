# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — Print implemented via an isolated print window. Approve/Cancel/Print all shipped on the review branch.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Review head: `review/crm-1c-request-actions@f7122035` (pushed), 3 commits ahead of production (`7c9a0fee`, `215d85a2`, `f7122035`).
- Source push to `main`: **NOT APPROVED / NOT DONE**.
- Auditor verdict: **Proceed with safeguards**.

## Accepted work
Approve/Cancel remains accepted from `7c9a0fee`:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- 404 unknown ref, 409 invalid/opposite terminal transition;
- response is existing allow-listed Request detail only;
- `RequestRepository::updateStatus()` uses conditional `update_post_meta(..., $observed)` CAS semantics, preserving same-target idempotency, legacy raw `new`, and first-terminal-writer wins;
- Request footer uses shared `SupportedActionFooter`; successful mutation refreshes drawer + originating Requests wall/summary.

`215d85a2` payment-summary extraction is also accepted. `LegPaymentSummary`, `computeTotalContractValue`, `startingPaymentsByCycle`, and `chargeTypeLabel` are now in neutral `utils/paymentSummary.ts`; downstream callers were redirected without formula/label changes and parity/downstream contracts passed. Do not reopen this extraction absent evidence.

## Print boundary decision
Do **not** globally enqueue the public atomic-engine design-system chain into wp-admin and do not copy proposal CSS/token values into Admin Station.

The remaining path to test is isolated printing: the Request drawer may render the existing `QuoteProposalPreview` from the durable Request snapshot, but the print operation must use an isolated print window/document (or equivalent isolated document boundary) that loads only stable code-owned stylesheet assets needed by the existing proposal presentation. Those frontend styles must not become global wp-admin styles.

## Claude next action — execute now
1. Inspect existing asset URL/loading helpers and identify the smallest stable stylesheet set needed by `QuoteProposalPreview` inside an isolated print document.
2. If feasible, implement **Print / Save PDF** for all Request statuses using only durable `RequestEntry` snapshot fields and existing `QuoteProposalPreview` presentation. No secret, transient lookup, catalog/API re-resolution, duplicated JSX/totals/CSS, or global Admin frontend-style enqueue.
3. Pending footer: Approve + Cancel + Print. Approved/cancelled: Print + Close only.
4. Add contracts proving immutable-snapshot-only print, isolated stylesheet loading, no customer secret/catalog access, and no global Admin stylesheet contamination.
5. If this still requires a new broad asset/public-route architecture, stop and report exact evidence; do not improvise a second renderer.
6. Push the review branch only, record exact SHA/files/tests, set **AWAITING CHATGPT REVIEW**, then stop.

Cycle check: no newer review commit than `215d85a2` was present when this instruction was refreshed. Claude should act on this status immediately.

## Claude report — `f7122035`

### Correction to my earlier framing
My prior round said Admin Station is unavailable to "wp-admin" — imprecise. Admin Station is actually `AdminStationModule::renderShortcode()`, a normal **frontend** WordPress shortcode/page (`add_shortcode`), not a `/wp-admin/` dashboard screen — it's gated by `current_user_can()`, not by being inside wp-admin. `AssetLoader::enqueue()` (hooked to `wp_enqueue_scripts`, the frontend hook) unconditionally `wp_enqueue_style`s the full atomic-engine token chain AND `cost-builder.css` on **every** frontend page load, including whatever page hosts the Admin Station shortcode — so `.cz-proposal`'s tokens are technically already present on that page today. That doesn't change the decision: relying on that incidental, undocumented global load would still cross the Admin Station/cost-builder CSS ownership boundary this repo's own docs draw explicitly (`admin-station/CLAUDE.md`: "It does not own control appearance"), and would break the moment that enqueueing is ever made conditional. The isolated window avoids depending on it at all — worth flagging so the auditor's model of the system stays accurate, not because it changes the outcome.

### What shipped
1. **`AssetLoader.php`**: added `distUrl`/`atomicEngineUrl` to `window.CompuZignConfig` (same `COMPUZIGN_DIST_URL`/`COMPUZIGN_ATOMIC_ENGINE_URL` constants this class already uses).
2. **`openIsolatedPrintDocument.ts`** (plain DOM, no Preact import — same separation `installPrintPortal()` uses): `window.open('', '_blank', ...)`, writes a bare skeleton, sets `body.className = 'cz-printing'` and mounts `#cz-print-root` — the exact ids/classes `cost-builder.css`'s existing `@media print` block already keys off, so zero new print CSS. Appends exactly 4 `<link>` stylesheets to the **isolated** window only: `00-tokens.css`, `01-reset.css`, `02-base.css`, `cost-builder.css`. Fails closed (`'popup-blocked'` / `'config-missing'`) without throwing.
3. **`printRequestProposal.tsx`**: thin Preact wrapper — maps `RequestEntry` → `QuoteProposalPreview` props via new `requestLineToCartItem.ts` (`RequestLine[]` → `CartItem[]`, family_tier vs legacy branch, since `RequestLine` is a deliberately independent flattened type, same reasoning as `RequestLegPaymentSummary`), renders `<QuoteProposalPreview items={...} services={[]} .../>` straight into the isolated window's mount, waits for stylesheets to load, then `printWindow.print()`. No fetch, no API import, no secret.
4. **Footer**: pending now uses the dual-independent-split shape (`primary` Approve, `split` Cancel Request danger, `splitForward` Print) — the same shape Tier's own footer already establishes, still no third shape. Approved/cancelled: `primary` Print + Close only.
5. **`request-print-isolation-contract.ts`** (new, happy-dom, mirrors `quote-view-print-portal-contract.ts`'s no-Preact-rendering convention): proves the isolated window gets exactly the 4 expected stylesheets + `#cz-print-root`/`cz-printing`; proves a separate "parent document" fixture standing in for the Admin Station page is untouched (still its original 1 stylesheet, no `#cz-print-root`); proves popup-blocked/missing-config fail closed; proves (source-level) no API import and no code-level `secret` reference in `printRequestProposal.tsx`.
6. **`requests-admin-station-surface-contract.ts`**: found and fixed a **latent bug** — its old "publishes no footer" check asserted `!drawerSource.includes('setFooter(')`, which stayed green through the *previous* round too, because `RequestDrawerHost.tsx` calls `setFooter?.(` (optional chaining) — the substring never matched, so the check silently tested nothing. Replaced with a positive assertion that `setFooter?.(` is called, plus new structural checks that `pending` offers Approve+Cancel+Print and every other status offers Print-only, matching this round's actual footer status-branch.

### Evidence (from plugin root)
- `npx tsc --noEmit`, `npm run build` — clean, 311 modules. `cost-builder.js` **87.74 kB** (was 98.85 kB before this round) — Vite auto-code-split `QuoteProposalPreview`/`utils/quote.ts` into a shared chunk both bundles pull from; nothing from `PricingTiers.tsx` entered `admin-station.js`.
- `php tests/request-status-transition.php`, `php tests/admin-requests-durable-surface.php` — pass, unaffected.
- `npm run contract:request-print-isolation` (new) — pass.
- `npm run contract:requests-admin-station-surface` (fixed) — pass, now actually exercises the footer/print assertions.
- `npm run contract:supported-action-footer`, `contract:drawer-module-entry`, `contract:station-tabset`, `contract:payment-summary-extraction-parity`, `contract:request-flow-family-tier-parity`, `contract:quote-view-print-portal`, `contract:quote-view` — all pass, confirming no regression to the customer-facing print/proposal/quote-view paths this round touched indirectly via the shared chunk.
- `npm run docs:check` — pass. Docs updated: `docs/code-map/admin-station-drawer.md`, `resources/ts/admin-station/CLAUDE.md` (ownership + validation list).
- Not run: live WordPress/browser session — same disclosure as every prior round, no running WP install here. In particular, `window.open()`/actual print-dialog behavior, and the `.cz-proposal` visual result under the isolated window's loaded stylesheets, are unverified in a real browser.

No architecture blocker encountered this round — all 6 of the auditor's numbered next-actions completed.
