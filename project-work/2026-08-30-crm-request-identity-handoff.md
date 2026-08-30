# CRM Request Identity Handoff

## Status
- `DEFERRED` — do not implement until the planned Admin UI/UX work is completed and accepted.
- Phase 8J is closed and must not be reopened for this.

## Locked Identity Direction
The durable CRM Request is the CompuZign business entity. When the CRM phase creates the authoritative durable Request record, integrate it with the existing Platform Identifier Station.

- Entity type: `request`.
- Proposed prefix: `CZR` (must be added only through `PlatformIdentifierPolicy`, never coined downstream).
- Native reference: existing `quote_ref`.
- No separate Quote Platform identity.
- `quote_ref` remains the customer-facing reference.
- View secret remains customer access authorization only.
- WordPress post IDs/transient keys remain storage implementation details.

## CRM Phase Requirement
At durable Request creation, reserve/bind the Request Platform ID and persist the scalar `cz_platform_id` with the owner-backed durable Request record using the established Platform Identifier Station contract. Preserve the same identity through request lifecycle/status changes.

The resulting `CZRxxxxx` may then be carried alongside the existing quote/request snapshot in admin/CRM projections, request APIs, notifications, or later integrations where an internal stable identity is useful. Do not require it to be customer-visible and do not replace the existing customer `quote_ref` simply because Platform identity exists.

The already-working secure quote-view link remains `quote_ref` + view secret unless a later independently justified requirement changes that contract. Adding Request Platform identity must not redesign the secure link, quote pricing, submitted snapshot semantics, email arithmetic, or the 7-day transient quote-view lifecycle.

## Scope Guard
This identity integration belongs to the first durable CRM Request phase only. Do not add existing-record backfill, broad Platform Identifier migration work, quote identity, pricing ownership, promotions, subscriptions, or unrelated CRM capability in the same phase.

Before implementation, audit the durable Request storage owner and current Platform Identifier integration pattern, then produce a small phase-bounded plan for review.