# CRM Request summary cards

## Status
- **READY FOR CLAUDE — inspect/report only; no source edits yet.**
- Production base: `main@fe5725db3d0be4d8e020504568979797db493010`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## User direction
Add a very small display-only number-card strip to the Requests Admin Station above the CRM Request list.

The visual reference is the **Service Station Home lower deck / Service Catalogue small detail-card style already in the repository**. Do not invent a new card family. Reuse that established component/style language as closely as the existing architecture allows.

These cards are numbers only — **not filters, buttons, links, or lifecycle actions**.

Proposed counts:
- **All Requests** — all durable Requests.
- **New Today** — durable Requests whose stored submitted timestamp falls on the current local/site day. This is a derived display metric only; do not resurrect legacy lifecycle status `new`.
- **Pending** — lifecycle `pending`.
- **Approved** — lifecycle `approved`.

Do **not** add `Expires Soon` in this phase. Durable CRM Requests do not expire; the 7-day secure quote-view transient is security/view plumbing and must not become CRM list authority.

## Locked boundaries
- CRM-1A/1B architecture stays closed.
- `RequestRepository` remains the durable CRM authority.
- No mutation, lifecycle transitions, filtering behavior, pricing/re-resolution, backfill, transient scanning, or customer-flow changes.
- No new generic dashboard/card system.

## Claude action — plan/source check only
Before editing, inspect the exact Service Station Home lower-deck card implementation and the current Requests surface. Report in this file:
1. exact existing component/classes/source that provide the Service lower-deck card style;
2. whether they can be reused directly or should be mirrored through the same shared primitive/style family;
3. the smallest data projection needed for the four counts, including how `New Today` should respect WordPress/site time rather than browser-local drift;
4. exact files you would change and focused tests/contracts;
5. any conflict with the locked read-only CRM-1B architecture.

Do not modify product source yet. Set **AWAITING CHATGPT REVIEW** and stop.
