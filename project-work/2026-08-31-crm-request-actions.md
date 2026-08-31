# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — Claude inspection report below, no source edited.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836` (confirmed current HEAD).
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## User direction
Add the smallest operational actions to the existing Admin Station Request drawer:
- **Approve**: `pending -> approved`.
- **Cancel Request**: `pending -> cancelled`.
- **Print / Save PDF**: admin-side print of the immutable durable submitted Request snapshot.

Do not use “Reject”; the locked lifecycle vocabulary is `pending / approved / cancelled`.

## Locked architecture
Authoritative source already confirms:
- `RequestLifecycle` permits only `pending -> approved`, `pending -> cancelled`, same-state idempotency, and rejects opposite terminal transitions.
- `RequestRepository::updateStatus()` already enforces that transition table.
- `AdminRequestsController` currently exposes authenticated GET list/detail only.

Preserve:
- durable `RequestRepository` authority;
- one lifecycle field only;
- no edit of customer-submitted payload;
- no pricing/catalog re-resolution;
- no quote transient as CRM authority;
- no backfill/new states;
- no customer quote-view secret requirement for admin print;
- no generic action framework unless an existing shared Station/drawer action mechanism already fits.

## Claude action — inspect and report before editing
Read root/platform instructions, relevant Admin Station drawer/action code, Request lifecycle/repository/controller, API endpoint patterns, and existing customer quote proposal/print renderer.

Report in this file:
1. Exact existing shared drawer footer/action mechanism to reuse for Approve/Cancel/Print.
2. Smallest authenticated REST mutation contract for status change, including ref lookup, allowed target validation, idempotent repeat, opposite-terminal rejection, error codes, and no raw post ID exposure.
3. Whether `RequestRepository::updateStatus()` can be reused directly without architecture change; flag any race/concurrency weakness before implementation.
4. Exact safe admin-print path that renders the durable stored snapshot only. Prefer reusing the existing proposal/print presentation without requiring or exposing the customer view secret and without re-resolving current pricing/catalog data.
5. UI behavior by status:
   - pending: Approve + Cancel Request + Print / Save PDF;
   - approved/cancelled: Print / Save PDF only; no opposite lifecycle action.
   - after a successful transition, drawer/list/summary counts refresh consistently.
6. Tests/contracts required for transition rules, authorization, secret non-exposure, immutable snapshot print, and UI action visibility.
7. Exact files to change and any architecture blocker.

Do **not** edit source yet. Set **AWAITING CHATGPT REVIEW** and stop.

## Claude report (inspection only, no source edited)

register.ts already anticipates this exact item: its Requests binding comment reads *"No 'edit' intent — Approve/Cancel are CRM-1C's own registered intents against this same drawer key, not introduced here."* Confirms internal name **CRM-1C**.

**1. Footer/action mechanism.** `RequestDrawerHost.tsx` never calls `setFooter`/`setCloseGuard` today (its own top comment says so). The shell bridge (`DrawerContentProps.setFooter`, `AdminStationDrawer.tsx`) is generic and already reachable. `drawer-kit/EntityActionFooter.tsx` is the actual button primitive (split button + chevron/overflow, optional Close, optional primary); `CanonicalEntityFooter.tsx` maps the *locked* `active/disabled/archived/trashed` lifecycle vocabulary onto it (Category, Package Family); `ServiceDrawerFooter.tsx` hand-rolls the same primitive for Service's own status vocabulary — direct precedent for a footer that branches by entity status. Request's `pending/approved/cancelled` is a **different, non-lifecycle vocabulary**, so neither Canonical mapping applies as-is. Best fit: `drawer-kit/SupportedActionFooter.tsx`, a flat `SupportedFooterAction[]` descriptor layer over `EntityActionFooter` — lets Request declare Approve/Cancel/Print as data without inventing a new footer *shape*. Flag: contract §12 says a Station "must not invent a third footer shape" (only the single-split shape or the dual-independent-split shape) — Request isn't yet a conforming or pending-migration Station, so which shape Approve/Cancel/Print maps onto is a judgment call worth the auditor's explicit sign-off, not just mine.

**2. REST mutation contract.** New route, same file/style as the existing GET routes in `AdminRequestsController.php`:
```php
register_rest_route('compuzign/v1', '/admin/requests/(?P<ref>[A-Z0-9\-]+)/status', [
  'methods' => 'PATCH', 'callback' => [$this, 'updateRequestStatus'],
  'permission_callback' => [$this, 'requireAdmin'],
  'args' => [
    'ref' => ['type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field'],
    'status' => ['type' => 'string', 'required' => true, 'enum' => ['approved', 'cancelled']],
  ],
]);
```
Callback resolves `ref -> post_id` via `RequestRepository::findByRef()` (already returns `post_id`), calls `updateStatus()`, returns `WP_REST_Response(['success' => false, 'message' => ...], 404|409)` on not-found/rejected-transition, else `rest_ensure_response(['success' => true, 'request' => $this->detail($record)])` — same shape as `getRequest()`. No raw post ID ever leaves the allow-listed `detail()` projection; addressing is by `ref` only, matching every existing admin route.

**3. `updateStatus()` reuse — yes, direct, no architecture change.** It already calls `RequestLifecycle::canTransition()` and rejects invalid transitions. **Race flag**: it is a plain read-check-write (`get_post_meta` -> `canTransition` -> `update_post_meta`) with no lock, unlike `createOwned()`'s creation lock. Two concurrent status writes (e.g. double-click Approve, or Approve fired from two admin tabs) can both observe `pending`, both pass the check, and the second write silently wins with no error to the loser. Given single-admin-at-a-time realistic usage this is low severity, but it should be an explicit accepted risk, not an unnoticed gap — a client-side disable-on-submit plus optimistic re-fetch after response reduces the window but does not close it.

**4. Print path.** Existing mechanism (`components/quote-view/QuoteViewApp.tsx`) is `window.print()` plus a portal DOM trick, `installPrintPortal(doc, win)`, exported from that same file and already reused once by `RequestFlowModal.tsx`. It clones `.cz-proposal` markup into an appended `#cz-print-root` on `beforeprint`. The proposal markup itself is `components/request-flow/QuoteProposalPreview.tsx`, fed `{items, services, contact, quoteDate, quoteRef}` from the immutable submitted-snapshot shape — no live catalog/pricing re-resolution, no view secret. `AdminRequestsController::detail()`'s projection (`items`, `contact`, etc.) is the same snapshot shape, so `QuoteProposalPreview` can be fed directly from `RequestEntry` with `services=[]`, matching the "no re-resolution" requirement exactly. **Architecture flag**: `QuoteViewApp`/`QuoteProposalPreview`/`installPrintPortal` all live under the customer-facing `cost-builder` entry (`modules/cost-builder.ts`), a separate build bundle from `admin-station`. A direct cross-bundle import needs an explicit decision (import across the boundary vs. extract `installPrintPortal` + a snapshot-print presentational piece to a shared location) rather than a silent import — flagging for auditor call before implementation, not resolving unilaterally.

**5. UI behavior by status.** Same status-branch pattern `ServiceDrawerFooter.tsx` already uses. After a successful PATCH, refresh via the *existing* mechanism: `DrawerContentProps.onSaved()` refreshes only the originating wall (already documented in `docs/code-map/admin-station-drawer.md`), and `useRequestsCatalogue()` already exposes `refetch` for the list/summary cards. No new refresh plumbing needed — call `onSaved()` after a successful transition and update the drawer's own local copy of `request.status` (or refetch its own `useApi` data) so the footer re-renders without closing the drawer.

**6. Tests/contracts needed.** PHP: extend `RequestLifecycle`/`RequestRepository` unit coverage if a new status-route test file is added (e.g. `admin-requests-status-transition.php`) covering — authorization (non-admin 403), ref-not-found 404, `pending->approved`/`pending->cancelled` success, idempotent same-state repeat, opposite-terminal rejection (`approved->cancelled` and reverse) at 409, no `view_secret_hash`/raw post ID in response. TS: a footer-visibility-by-status contract (pending vs approved vs cancelled action sets), and print-portal reuse coverage analogous to the existing `scripts/quote-view-print-portal-contract.ts` (happy-dom, no Preact) if the portal is reused/extracted.

**7. Files to change.**
- `src/Modules/Admin/Http/AdminRequestsController.php` — add `PATCH .../status` route + `updateRequestStatus()`.
- No change needed to `RequestRepository.php` or `RequestLifecycle.php` — both already sufficient.
- `resources/ts/api/endpoints/admin.ts` — add `updateRequestStatus(ref, status)` (mirrors `updateCategoryStatus`'s `apiClient.patch` shape).
- `resources/ts/admin-station/stations/requests/RequestDrawerHost.tsx` — wire `setFooter`, call `onSaved()`/local refresh after mutation.
- New `resources/ts/admin-station/stations/requests/RequestDrawerFooter.tsx` — status-branched footer (`SupportedActionFooter`-based per point 1).
- New `resources/ts/admin-station/stations/requests/RequestDrawerDialogs.tsx` — confirm dialogs for Approve/Cancel, following `CategoryDrawerDialogs.tsx`'s hand-authored `cz-publish-confirm*` pattern (no shared modal component exists).
- New small controller (hook) owning `confirmDialog`/loading state, matching `useCategoryDrawerController`'s shape.
- Print: either a new admin-side snapshot-print wrapper reusing `QuoteProposalPreview`/`installPrintPortal` across the bundle boundary, or an extraction — **blocked on the point-4 architecture decision**, otherwise no blocker.

No other architecture blocker found. Everything needed for Approve/Cancel already exists at the repository layer; the work is route + footer/dialog wiring + the point-1 footer-shape call and point-4 bundle-boundary call.
