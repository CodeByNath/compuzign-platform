# Quote Builder

## Purpose

Turns Cost Builder selections into a reviewed customer request, submits it, and exposes the resulting intake records to the admin request station.

## Ownership

The request-flow components own only the open modal, contact draft, review step, and submission status. `RequestRepository` owns persisted requests and `RequestLifecycle` owns their transitions. Quote UI must not become the authority for service pricing after submission.

## Main Entry Points

- [RequestFlowModal.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/RequestFlowModal.tsx) selects the request-flow variant and supplies modal overlay, close behavior, and context. Use it for flow routing or modal presentation.
- [QuoteCartFlow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteCartFlow.tsx) contains contact/review steps, validation, Back/Continue/Submit/Print actions, success/error states, reference generation, and submission. Use it for quote-request workflow and validation.
- [RequestsStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/RequestsStation.tsx) renders request tables, filters/status, detail drawer, proposal preview, and intake acceptance actions. Use it for admin request review.

## UI and State

- [ContactForm.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/ContactForm.tsx) renders company/contact/email/phone/notes fields and inline errors. Use it for customer detail inputs.
- [OrderSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/OrderSummary.tsx) renders selected Services, tier pricing, totals, and review details. Use it for customer-facing quote review.
- [QuoteProposalPreview.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteProposalPreview.tsx) renders printable proposal presentation. Use it for proposal layout and print content.
- [quote.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/quote.ts) normalizes quote items and calculates totals. Use it for shared quote arithmetic.

## Backend and Persistence

- [requests.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/requests.ts) exposes typed request submission. Use it for client payload/response contracts.
- [RequestsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Http/RequestsController.php) registers the public submit route, validates payloads, persists requests, and triggers notifications. Use it for submission behavior.
- [RequestRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Repositories/RequestRepository.php) creates, reads, lists, and updates request posts/meta. Use it for request persistence and projections.
- [RequestSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestSchema.php) sanitizes request/contact/cart data and defines REST argument rules. Use it for validation shape.
- [RequestLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestLifecycle.php) defines allowed request statuses and transitions. Use it for intake lifecycle rules.

## Runtime Flow

Cost Builder opens the modal with a cart snapshot. The flow validates contact data, submits through the public API, stores a request, and lets the admin station accept and manage intake.

## Related Code Maps

[Cost Builder](cost-builder.md) and [Lifecycle](lifecycle-system.md).
