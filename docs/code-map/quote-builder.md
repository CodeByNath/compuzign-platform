# Quote Builder

## Purpose

Turns Cost Builder selections into a reviewed customer request, submits it, and exposes the resulting intake records to the admin request station.

## Ownership

The request-flow components own only the open modal, contact draft, review step, and submission status. `RequestRepository` owns persisted requests and `RequestLifecycle` owns their transitions. Quote UI must not become the authority for service pricing after submission.

## Main Entry Points

- [RequestFlowModal.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/RequestFlowModal.tsx) selects the request-flow variant and supplies modal overlay, close behavior, and context. Use it for flow routing or modal presentation.
- [QuoteCartFlow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteCartFlow.tsx) contains contact/review steps, validation, Back/Continue/Submit/Print actions, success/error states, reference generation, and submission. Use it for quote-request workflow and validation.
- The admin request-review surface (tables, filters, detail drawer, proposal preview, intake acceptance) was hosted in the retired Command Centre and has been removed. The intake backend below is unchanged; the review surface is to be rebuilt in the Admin Station.

## UI and State

- [ContactForm.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/ContactForm.tsx) renders company/contact/email/phone/notes fields and inline errors. Use it for customer detail inputs.
- [OrderSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/OrderSummary.tsx) renders selected Services, tier pricing, totals, and review details. Use it for customer-facing quote review.
- [QuoteProposalPreview.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteProposalPreview.tsx) renders printable proposal presentation. Use it for proposal layout and print content.
- [quote.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/quote.ts) normalizes quote items, calculates totals, and owns `classifyQuoteItems` — the one shared split into normal-Tier/promotion, legacy bundle, and Tier add-on lines both files render from; see [Tier Add-on Selection](tier-addon.md). Use it for shared quote arithmetic and classification.
- It also owns the additive `family_tier` key/mutation branch. Legacy lines
  remain Service-keyed; Family lines use their `CZPG` + `CZTG` commercial
  scope and `CZT`/`CZTA` offer identifier while retaining native IDs alongside.

## Backend and Persistence

- [requests.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/requests.ts) exposes typed request submission. Use it for client payload/response contracts.
- [RequestsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Http/RequestsController.php) registers the public submit route, persists requests, triggers notifications, and (Phase 8J-C1) the secure `/requests/quote/{ref}` read route — gated by an `X-Quote-View-Secret` header, never a query param or REST `args` entry (no framework rejection to diverge from the boundary's own failure path).
- [QuoteViewSecret.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/QuoteViewSecret.php) generates the view secret at submission time and verifies it in constant time (`hash_equals`) against its stored one-way hash; never persists the raw secret.
- [QuoteViewAccess.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/QuoteViewAccess.php) is the pure read-boundary resolver — every failure (malformed ref, no/wrong secret, missing/expired quote, no stored hash) returns one identical non-disclosing outcome; the returned quote is an explicit allow-list, never the raw payload. Reference alone is never sufficient. No customer page/email link consumes this yet.
- [RequestRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Repositories/RequestRepository.php) creates, reads, lists, and updates request posts/meta. Use it for request persistence and projections.
- [RequestSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestSchema.php) sanitizes request/contact/cart data and defines REST argument rules, including the structured `minimumTermValue`/`minimumTermUnit` a Tier Edition's own commitment carries, and the Phase 8J-A Family snapshot fields (`tierEditionTitle`, `legPaymentSummaries`, `inclusionItems`). Use it for validation shape.
- `family_tier` snapshots require native and Platform IDs for Family, assigned
  Tier Instance, and occupant offer; selected Editions additionally preserve
  `CZTE`. They never receive a fake `serviceId`. Order Summary and printable
  proposal render these stored business identifiers without a live Service
  lookup.
- [NotificationTemplates.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Notifications/NotificationTemplates.php) builds the admin and customer HTML emails from the same stored snapshot — classification, per-Leg stream rendering, structured inclusions, and combined Contract Value/Ongoing + Initial Payment mirror `quote.ts`'s/`PricingTiers.tsx`'s accepted semantics (Phase 8J-B). The two emails intentionally diverge only on raw CZ Platform ID visibility: the admin email keeps them for operational identity, the customer email never receives them.
- [RequestLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestLifecycle.php) defines allowed request statuses and transitions. Use it for intake lifecycle rules.

## Runtime Flow

Cost Builder opens the modal with a cart snapshot. The flow validates contact data, submits through the public API, and stores a request. The stored intake records remain available through the backend for a future Admin Station review surface.

## Validation

From the plugin root: `php tests/request-schema-is-addon.php`, `php tests/request-schema-minimum-term.php`, `php tests/request-schema-family-quote-snapshot.php`, `php tests/package-family-notification.php`, `php tests/notification-templates-family-quote-parity.php`, `php tests/quote-view-access-boundary.php`, `php tests/quote-view-http-boundary.php`, `npm run contract:quote-cart-addon`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npm run contract:request-flow-family-tier-parity`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Cost Builder](cost-builder.md), [Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md), and [Lifecycle](lifecycle-system.md).
