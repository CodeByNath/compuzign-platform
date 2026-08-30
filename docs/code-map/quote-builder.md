# Quote Builder

## Purpose

Turns Cost Builder selections into a reviewed customer request, submits it, and exposes intake records to the admin Requests surface.

## Ownership

The request-flow components own only the open modal, contact draft, review step, and submission status. `RequestRepository` owns persisted requests, `RequestLifecycle` their transitions. Quote UI must not become the pricing authority after submission.

CRM-1A: `/requests/submit` creates the durable `cz_request` (`pending`, new `CZR`) before any transient/email; the 7-day transient is view storage only. A same-ref retry reuses an identical stored payload, else `409`; identity failure fails closed. See [Platform Identifier Station](platform-identifier-station.md) for the reserve/assign/rollback shape.

## Main Entry Points

- [RequestFlowModal.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/RequestFlowModal.tsx) selects the request-flow variant and supplies modal overlay, close behavior, and context.
- [QuoteCartFlow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteCartFlow.tsx) contains contact/review steps, validation, Back/Continue/Submit/Print actions, success/error states, reference generation, and submission.
- The admin request-review surface was hosted in the retired Command Centre and removed; it is to be rebuilt in the Admin Station (CRM-1B/1C/1D). The redundant `/accept` bridge and its unused frontend caller were removed in CRM-1A.

## UI and State

- [ContactForm.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/ContactForm.tsx) renders company/contact/email/phone/notes fields and inline errors.
- [OrderSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/OrderSummary.tsx) renders selected Services, tier pricing, totals, and review details.
- [QuoteProposalPreview.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteProposalPreview.tsx) renders the printable proposal — also reused verbatim by the secure quote-view page.
- [quote.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/quote.ts) normalizes quote items, calculates totals, and owns `classifyQuoteItems` — the shared split into normal-Tier/promotion, legacy bundle, and Tier add-on lines both files render from; see [Tier Add-on Selection](tier-addon.md). It also owns the additive `family_tier` branch: legacy lines stay Service-keyed; Family lines use their `CZPG`/`CZTG` scope and `CZT`/`CZTA` identifier, native IDs alongside.

## Backend and Persistence

- [requests.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/requests.ts) exposes typed submission and client payload/response contracts.
- [RequestsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Http/RequestsController.php) registers the public submit route and the secure `/requests/quote/{ref}` read route — gated by an `X-Quote-View-Secret` header, never a query param or REST `args` entry (no framework rejection to diverge from the boundary's own failure path).
- [QuoteViewSecret.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/QuoteViewSecret.php) generates the view secret and verifies it in constant time (`hash_equals`) against its stored one-way hash; never persists the raw secret.
- [QuoteViewAccess.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/QuoteViewAccess.php) is the pure read-boundary resolver — every failure returns one identical non-disclosing outcome; the quote is an explicit allow-list, never the raw payload.
- [RequestsModule.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/RequestsModule.php) owns `QUOTE_VIEW_PATH`/`quoteViewUrl()` and intercepts that fixed path via `template_redirect` (a shortcode alone needed a manually-authored Page), sharing the existing `compuzign-cost-builder` JS/CSS handles rather than a new build entry.
- [QuoteViewApp.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/quote-view/QuoteViewApp.tsx) is the standalone secure quote-reload page: `?ref=` query param, bearer secret from the URL fragment only (never stored/stripped), `getQuoteView()`, reuses `QuoteProposalPreview` and the `#cz-print-root` print portal, one generic failure message. Reached via the customer email's link.
- [RequestRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Repositories/RequestRepository.php) creates, reads, lists, and updates request posts/meta; owns the `cz_platform_id` claim and the lock converging concurrent same-ref submissions on one record.
- [RequestSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestSchema.php) sanitizes request/contact/cart data and defines REST argument rules: `minimumTermValue`/`minimumTermUnit`; the Family snapshot fields (`tierEditionTitle`, `legPaymentSummaries`, `inclusionItems`); and `serviceDescription`/`bundleDescription` — a legacy Service/Bundle's live-catalog description, captured once at submission (`QuoteCartFlow.tsx`'s `withSubmissionDescriptions()`) for the reload page.
- `family_tier` snapshots require native and Platform IDs for Family, assigned Tier Instance, and occupant offer, plus `CZTE` for a selected Edition — never a fake `serviceId`.
- [NotificationTemplates.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Notifications/NotificationTemplates.php) builds the admin/customer HTML emails from the stored snapshot, mirroring `quote.ts`/`PricingTiers.tsx` semantics. Diverges on raw CZ Platform ID visibility (admin only) and the customer-only "View / Print Quote" link, built from `RequestsModule::quoteViewUrl()` plus the raw secret as a fragment — never persisted, never in the REST response.
- [RequestLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestLifecycle.php) defines the CRM-1 lifecycle — `pending -> approved`/`cancelled`, idempotent repeats, rejected reversals — plus a read-only `normalizeLegacy()` map from a pre-CRM-1A `new` record to `pending`, storage untouched until the next write.

## Runtime Flow

Cost Builder opens the modal with a cart snapshot. The flow validates contact data and submits through the public API, which creates the durable, identified CRM Request before the quote-view transient and notifications. Durable records remain available for the Admin Station surface (CRM-1B/1C/1D).

## Validation

From the plugin root: `php tests/request-schema-is-addon.php`, `php tests/request-schema-minimum-term.php`, `php tests/request-schema-family-quote-snapshot.php`, `php tests/request-schema-legacy-snapshot-description.php`, `php tests/request-durable-submission.php`, `php tests/package-family-notification.php`, `php tests/notification-templates-family-quote-parity.php`, `php tests/quote-view-access-boundary.php`, `php tests/quote-view-http-boundary.php`, `php tests/quote-view-entrypoint.php`, `php tests/quote-view-email-link.php`, `npm run contract:quote-view`, `npm run contract:quote-view-print-portal`, `npm run contract:quote-view-legacy-description`, `npm run contract:quote-cart-addon`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npm run contract:request-flow-family-tier-parity`, `npm run contract:platform-identity-schema`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Cost Builder](cost-builder.md), [Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md), and [Lifecycle](lifecycle-system.md).
