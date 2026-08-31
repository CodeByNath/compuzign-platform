# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — source inspection + implementation plan only.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
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
