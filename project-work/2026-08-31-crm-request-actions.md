# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — Approve/Cancel implemented on a review branch; Print stopped and reported, not implemented.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Review branch: `review/crm-1c-request-actions`, commit `7c9a0fee` (pushed).
- Source push to `main`: **NOT APPROVED / NOT DONE**.
- Auditor verdict: **Proceed with safeguards**.

## Locked scope
Add the smallest operational actions to the existing Request drawer:
- **Approve**: `pending -> approved`.
- **Cancel Request**: `pending -> cancelled`.
- **Print / Save PDF**: admin print of the immutable durable submitted Request snapshot.

No `Reject` state, no edit of submitted data, no new lifecycle states, no pricing/catalog re-resolution, no transient authority, no backfill, no customer quote-view secret for admin print.

## Auditor decisions
### Lifecycle mutation
Use authenticated `PATCH /admin/requests/{ref}/status`, addressed by Request ref only. Allowed targets are exactly `approved` and `cancelled`; 404 not found; 409 invalid/opposite-terminal conflict; successful response returns the existing allow-listed Request detail shape only.

**Do not ship the current read-check-write race.** Harden `RequestRepository::updateStatus()` with an atomic previous-value conditional write (WordPress metadata compare-and-swap semantics are acceptable). Requirements:
- same-state repeat succeeds idempotently without rewriting;
- `pending -> approved|cancelled` succeeds only if the stored raw status still equals the value observed;
- concurrent opposite transition cannot silently overwrite the winner;
- legacy raw `new` remains readable as `pending` and may transition using its raw stored value as the compare value;
- controller re-reads after a failed conditional write so a concurrent same-target result may resolve idempotently, while opposite terminal result returns 409.

Add focused race/transition contract coverage.

### Drawer footer
Reuse `SupportedActionFooter` / `EntityActionFooter`; no third footer shape. Pending state should expose **Approve** prominently, **Print / Save PDF** directly, and **Cancel Request** as the destructive secondary/overflow action. Approved/cancelled expose Print only (plus normal Close). Disable actions while mutation is in flight. After success, refresh drawer + originating Requests wall so list status and summary counts agree.

### Admin print
Reuse the **exact stored-snapshot proposal presentation**; never create a second pricing/quote renderer. `QuoteProposalPreview` is acceptable only as a build-time presentational reuse if the admin bundle can consume it and the exact proposal/print CSS without importing live catalog/request-flow runtime behavior.

Before committing the print implementation, verify the bundle/style boundary. If correct reuse would require duplicating proposal markup/calculation/CSS, importing the whole cost-builder runtime, or any live catalog fetch, **stop and report instead of implementing Print**. Extracting only a genuinely pure print helper/presentation dependency is acceptable if customer behavior/imports remain unchanged and contracts prove parity.

## Required evidence
- PHP: auth, 404, both transitions, same-state idempotency, both opposite-terminal 409s, concurrent opposite-write protection, no secret/post-ID leak.
- TS: action visibility per status, busy state, refresh after success, no edit action.
- Print: immutable snapshot only; no secret; no catalog resolution; print portal/presentation parity.
- Run focused Request suites, TS compile/build, Station/drawer contracts, docs check; record pre-existing unrelated failures separately.

Push review branch only, record exact SHA/files/tests and any print-boundary blocker, set **AWAITING CHATGPT REVIEW**, then stop.

## Claude report — implemented on `review/crm-1c-request-actions` @ `7c9a0fee`

### What shipped
- `PATCH /admin/requests/{ref}/status` (enum `approved`/`cancelled` only) — 404 unknown ref, 409 rejected transition, 200 with the existing `detail()` allow-list on success (no raw post ID, no `view_secret_hash`, identical shape to `GET .../{ref}`).
- `RequestRepository::updateStatus()` hardened to a real compare-and-swap: reads raw stored status, short-circuits same-target as idempotent success without a write, otherwise calls `update_post_meta($id, $key, $status, $observed)` (WordPress's 4-arg conditional-write form). On a lost race it re-reads once — same target as the winner resolves idempotently, opposite-terminal returns false (409). Legacy raw `new` transitions using its own raw value as the compare value, per spec.
- Footer: `RequestDrawerFooter.tsx` via `SupportedActionFooter`/`EntityActionFooter` — pending shows Close + primary **Approve** + danger-toned split **Cancel Request** (single-split shape, no splitForward, no third shape). Both disable while the other is in flight. Approve fires directly (non-destructive); Cancel opens `RequestDrawerDialogs.tsx`, a confirm dialog following `CategoryDrawerDialogs`' own `cz-publish-confirm*` convention (matches its destructive/Trash confirm, since cancelled is terminal — never approvable afterward). `useRequestDrawerActions.ts` owns busy/error/dialog state and calls the endpoint directly (no `useApi`, matching Category's own mutation convention). On success the drawer takes the response's `request` object directly (no second GET) and calls `onSaved()` to refresh the originating Requests wall (list status + summary counts) — reusing the existing bridge, no new refresh plumbing. Approved/cancelled Requests currently render **Close only** (Print omitted, see below).
- `RequestDrawerHost.tsx` now calls `setFooter`; still calls no `setCloseGuard` (neither action leaves unsaved state).

### Print — stopped and reported per the auditor's own gate, not implemented
`QuoteProposalPreview.tsx` imports `chargeTypeLabel`, `computeTotalContractValue`, `startingPaymentsByCycle` from `resources/ts/components/cost-builder/PricingTiers.tsx` (1088 lines, the customer-facing pricing UI) and uses all three pervasively — the Family contract-value and payment-cycle sections at lines ~98, ~106, ~203, ~218, ~320, ~333, not incidental. `QuoteProposalPreview`/`installPrintPortal` are mounted only from `modules/cost-builder.ts`, a separate Vite entry from `modules/admin-station.ts` (confirmed: `npm run build` before and after this change shows `cost-builder.js` unchanged at 98.85 kB, `admin-station.js` at 409.35→411.95 kB — nothing from cost-builder pulled in). Direct reuse as-is would import the whole cost-builder runtime into the admin bundle — exactly the stop condition in the auditor's decision. The sanctioned alternative (extracting the three pure calc functions out of `PricingTiers.tsx` into a neutral shared location, with a parity contract) touches a mature, locked customer-facing pricing file and is its own reviewable change, not something to fold into this branch unannounced — leaving it for an explicit follow-up decision.

### Evidence run (from plugin root)
- `php tests/request-status-transition.php` (new — auth, 404, both transitions, same-state idempotency, both opposite-terminal 409s, legacy `new` compare-value, concurrent-race winner/loser, allow-list shape) — pass.
- `php tests/admin-requests-durable-surface.php` — pass, unaffected.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean, 307 modules.
- `npm run contract:requests-admin-station-surface` — pass.
- `npm run contract:supported-action-footer` — pass.
- `npm run contract:drawer-module-entry` — pass (15 shells, 6 entry states).
- `npm run contract:station-tabset` — pass (98 checks).
- `npm run docs:check` — pass (110 Markdown files, 39 Code Maps).
- `npm run contract:admin-station-css` — **fails with 6 pre-existing findings, all `.cz-rate-sheet-tool__*` classes, confirmed identical on `main` before this branch's changes (reproduced by re-running the same script against `main`'s working tree)** — unrelated to this work, not touched by it.
- Docs updated: `docs/code-map/admin-station-drawer.md`, `resources/ts/admin-station/CLAUDE.md`, `src/Modules/Admin/CLAUDE.md` (added the new test to its Validation list).
- Not run: a live WordPress/browser session — this environment has no running WP install; all verification above is source-level (hand-stubbed PHP tests matching this repo's existing `tests/*.php` convention, `tsx`/Vite/`tsc` for TS). Flagging per the requirement not to claim runtime verification that wasn't performed.

Set **AWAITING CHATGPT REVIEW**.