# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW`
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B candidate ready for independent audit on review branch (not pushed to main).
- Phase 8I remains the accepted cart/review/proposal reference; not reopened.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry** unchanged.

`resolved customer selection -> FamilyTierQuoteItem snapshot -> server validation/sanitisation -> 7-day transient snapshot -> email`

Never re-resolve Rate Sheets, Tiers, Editions, Commercial Legs, Bundles, quantities or pricing during submission/email. Email represents the submitted snapshot.

## Phase 8J-A — Accepted
Candidate `f152134eac87c0cf84414ac6217794e7a4ca0102` preserves/sanitises `tierEditionTitle`, recursive `inclusionItems`, and all eight Leg payment-summary fields through `RequestSchema`, with focused contract coverage.

Independent post-push audit confirmed:
- `main` is exactly `f152134eac87c0cf84414ac6217794e7a4ca0102`, one commit ahead of prior production `6736d45d` and zero behind;
- exact three-file reviewed diff only;
- GitHub Actions **Deploy to Hostinger #913** has `head_sha=f152134e...`, completed successfully.

No live UI validation is required for 8J-A because it intentionally changed only the server snapshot boundary and no customer rendering.

## Phase 8J-B — Claude Implementation Only
Make the **existing admin/customer quote email renderer consume the preserved Family snapshot** so its commercial/customer representation matches the accepted Phase 8I quote surfaces.

1. Audit current `NotificationTemplates.php` against `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, and their shared commercial-summary utilities before editing. Reuse their established semantics; do not invent parallel pricing rules.
2. For Family quote lines, render human Family/Tier/Edition labels and **do not expose raw CZ Platform IDs in the customer email**.
3. Render snapshotted `legPaymentSummaries` as separate payment streams/cycles; do not collapse them back to headline `price`/`billingCycle`.
4. Render structured `inclusionItems` with ordinary quantities and Bundle parent/children quantities using the accepted Phase 8I vocabulary/presentation semantics.
5. Email summary semantics must match the accepted proposal: finite per-item Total where applicable, quote Contract Value/Ongoing and Initial Payment, with Family add-ons excluded from primary TCV exactly as the existing accepted shared calculation does.
6. Preserve backward compatibility: legacy/non-Family lines and older Family snapshots lacking the new fields must still render safely using existing fallback behavior.
7. **Admin operational identity is a separate concern:** customer email must hide raw IDs; do not remove admin-email IDs unless current source architecture proves admin/customer share an inseparable renderer. If shared, report the conflict before broadening customer-driven changes into admin representation.
8. Do not change RequestSchema, resolver/pricing arithmetic, quote snapshot construction, transient lifecycle/key, quote-ref generation, controller submission flow, browser cart/review/PDF UI, or Rate Sheet/catalog state.
9. Add focused contracts for representative KAIROS primary + add-on + OMNIA Edition/multi-stream email semantics, Bundle/quantity rendering, customer-ID suppression, legacy fallback, and summary parity. No live email send is required on the review branch.
10. Run focused/relevant contracts, type/build/docs checks as repository rules require; commit/push to a **non-production review branch**, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, and stop. **Do not push to main.**

## Claude Report — 8J-B

Branch: `phase-8j-b-quote-email-parity` (from `main@f152134e`), pushed to
`origin/phase-8j-b-quote-email-parity`. Not pushed to `main`.

Commit: `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`.

**Audit finding (item 7):** `emailServiceRows()`/`calcTotals()` were the
literal single renderer for BOTH admin and customer emails — the pre-8J-B
code already put raw Family CZ Platform IDs in the customer email too, not
only admin. Resolution: split Family rendering into a dedicated path
parameterised by `$includeInternalIds` (admin=true, customer=false); every
other rendering/summary rule stays identical for both audiences. Reporting
this here per item 7 rather than resolving it silently.

Files changed:
- `NotificationTemplates.php` — new private helpers ported 1:1 from
  `quote.ts`/`PricingTiers.tsx`: `classifyQuoteItems`, `chargeTypeLabel`,
  `computeTotalContractValue`, `startingPaymentsByCycle`,
  `familyDisplayInclusions` (features[] fallback), `emailInclusionItemsList`,
  `emailFamilyStreamsBlock`, `emailFamilyRow(s)`,
  `familyContractValueBlock`, `familyInitialPaymentRow`,
  `buildQuoteSections` (assembles rows in main→familyMain→bundle→
  tierAddon→familyAddon order, matching `OrderSummary.tsx`). Family items
  removed from `emailServiceRows()` (dead branch deleted, function now
  legacy/non-Family only). `buildAdminHtmlEmail`/`buildCustomerHtmlEmail`
  call `buildQuoteSections()` with `$includeInternalIds` true/false.
- `tests/notification-templates-family-quote-parity.php` (new) — KAIROS
  primary (multi-stream, one open-ended → Ongoing, not fabricated finite
  TCV) + Bundle/quantity inclusions + OMNIA add-on (own finite Total,
  excluded from combined TCV/Initial Payment) + legacy non-Family item
  (still counted in general totals) + a pre-Phase-5/8G Family item with the
  new keys entirely absent (fallback safety). Asserts every admin-visible
  Platform ID is absent from the customer email.
- `tests/package-family-notification.php` — updated: now exercises the two
  public builders (Family rendering moved off `emailServiceRows()`), keeps
  its original no-`serviceId`-dependency assertion, adds the same ID-
  suppression check.
- `docs/code-map/quote-builder.md` — added `NotificationTemplates.php`
  entry, corrected the stale "notification email renders IDs" line, added
  new tests to Validation.

No changes to `RequestSchema`, resolver/pricing arithmetic, quote snapshot
construction, transient lifecycle/key, quote-ref generation, controller
submission flow, or browser cart/review/PDF UI.

Tests/checks run (all passed): the 2 new/updated PHP tests above, plus
`request-schema-is-addon.php`/`request-schema-minimum-term.php`/
`request-schema-family-quote-snapshot.php`; `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:request-flow-family-tier-parity`; full sweep of all 50
`npm run contract:*` scripts; `npx tsc --noEmit`; `npm run build`;
`npm run docs:check`. No live email send performed (per item 9).

Unresolved: none for 8J-B's scope. 8J-C (cross-boundary parity/live
validation) remains unauthorized.

## Phase 8J-C — Not Authorized
Cross-boundary parity/live validation follows only after 8J-B source review and production approval.
