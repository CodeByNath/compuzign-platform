# CRM Request Station plan

## Status
- **AWAITING CLAUDE RESPONSE** — planning correction only; no source changes.
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Source audit accepted
Claude correctly found:
- Public `/requests/submit` currently writes only the 7-day `cz_quote_<ref>` transient and emails.
- `RequestRepository::create()` is called only by admin `/admin/requests/{ref}/accept`.
- Existing durable lifecycle is inert `new/reviewing/quoted/closed`; no real transition path exists.
- Admin Request UI is removed but backend routes remain.
- `request`/`CZR` is not yet registered with Platform Identifier Station.

## Auditor correction — durable boundary
Do **not** keep Pending as a transient-only virtual state and mint the durable Request only on Approve/Cancel. That leaves an undecided CRM request ephemeral and able to disappear after seven days, which defeats the first durable CRM Request phase and delays its stable `CZR` identity until after triage.

CRM-1A should instead make a **validated customer submission create the authoritative durable Request immediately**:
1. `/requests/submit` validates/sanitizes as today.
2. Create/find the durable `cz_request` by `quote_ref`, with lifecycle **Pending** and new `CZR` Platform ID.
3. Persist the immutable submitted CRM snapshot from the validated payload **before** adding the quote-view secret hash; `view_secret_hash` stays transient/security plumbing, not CRM business data.
4. Then create the existing 7-day secure quote-view transient and send emails exactly as today.
5. Retry with the same `quote_ref` must be idempotent and must not mint a second Request/CZR.

The 7-day transient remains only the secure customer quote-view store. It is no longer the CRM queue authority.

## Lifecycle decision
Use one lifecycle field with exactly these CRM-1 states:
- `pending` -> `approved`
- `pending` -> `cancelled`
- repeated same action = idempotent success
- opposite terminal transition = reject, preferably 409

Do not retain a parallel `is_accepted` lifecycle. Future sales stages may extend this same lifecycle later only by a separate reviewed phase.

## Identity
Register entity `request` with prefix `CZR` through `PlatformIdentifierPolicy` and the existing reserve/bind pattern. Mint for **new durable submissions only**; no backfill.

## Revised sequencing
- **CRM-1A:** submission-time durable Request + `CZR` + Pending/Approved/Cancelled contract. Retire admin `/accept` semantics in favor of later Approve; no UI yet.
- **CRM-1B:** Admin Station read-only list/detail sourced from durable `RequestRepository`, not transient enumeration. Reuse existing Station list/drawer patterns.
- **CRM-1C:** authenticated Approve/Cancel mutations and filters/sort.
- **CRM-1D:** contact/first-email action with minimal send audit metadata.

## Claude next action
Re-audit this corrected durable boundary against the actual Platform Identifier wiring and current Request controller/module construction. Report a **CRM-1A implementation plan only**: exact files, creation/rollback/idempotency order, route behavior, tests/contracts, and Code Map impact. Do not edit source. Set **AWAITING CHATGPT REVIEW** and stop.
