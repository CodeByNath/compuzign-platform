# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — implement on a review branch only.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Source push: **NOT APPROVED**.
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