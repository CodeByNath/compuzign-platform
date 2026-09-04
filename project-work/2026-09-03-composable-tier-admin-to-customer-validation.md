# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Upgrade Journey Finalisation implemented on a review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.
- No Upgrade Journey source changes yet approved for `main`.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are separate journeys.

Upgrade starts from an exact selected Tier/Edition, allows only Admin-authorised composable inclusions/quantities, remains tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes one final **Build Your Own** quote result. Standalone Build Your Own remains deferred and must not simply load beside normal Tier cards.

## Accepted finalisation architecture
Claude's fifth revision is accepted for implementation:
- finalised result carries peer authoritative children `composedBase` and `composedUpgrade`, each preserving its own real identity, inclusions, payment streams, headline and term facts;
- `composedBase + composedUpgrade` are the **only canonical source** for `isComposedUpgrade=true`;
- top-level `inclusionItems`, `legPaymentSummaries`, `price`, `billingCycle`, commitment and duration are deterministic compatibility/display projections only;
- client derives that projection through one pure TS helper;
- `RequestSchema.php` must ignore any client-supplied composed projection and rebuild it from the already-sanitised children before persistence;
- base commitment is the customer-facing composed commitment; upgrade commitment remains preserved only under `composedUpgrade`;
- no dedup across base/upgrade: same inclusion may legitimately appear in both;
- inclusions **and payment streams** render under clear Base/Upgrade sections while remaining one Build Your Own quote result and totals count each stream exactly once;
- Tier add-ons are removed by the existing primary-removal cascade during finalisation, never orphaned;
- any un-finalised Upgrade draft hard-blocks Review/Request submission;
- legacy/non-composed carts and Requests remain unchanged.

## Implementation safeguards
1. Fail closed if `isComposedUpgrade=true` but either authoritative child is missing/invalid; never persist a partially composed item.
2. Finalise only when the recorded draft base exactly matches the current primary Tier/Edition.
3. Preserve each child's stream `source` and inclusion identity/quantity exactly; no client-side repricing/re-resolving.
4. PHP and TS projection derivation must have fixture parity; server derivation wins at persistence.
5. Customer/Admin/PDF/public quote/email must show one composed result, grouped Base vs Upgrades, with totals exactly once and no customer-facing raw IDs.
6. Admin-only internal reference may show both Base and Upgrade Platform IDs.
7. No new platform entity, Tier System, Rate Sheet relation, resolver rule, customer-owned Leg, or standalone Build Your Own UX.

## Claude implementation instruction
Implement only this accepted scope from current `main` on a non-production review branch. Add focused contracts for draft/base matching, finalisation, add-on cascade, canonical TS/PHP projection parity, malicious/mismatched top-level projection overwrite, Request round-trip, legacy behavior, hard submission gate, grouped inclusion/stream rendering, and exact-once totals. Run focused contracts, PHP tests, typecheck, build and docs checks.

Record exact branch/SHA, changed files, tests and unresolved risks here; set **AWAITING CHATGPT REVIEW**. **Do not push `main`.**

## Claude implementation report

**Branch:** `review/upgrade-journey-finalisation`, single commit `4e2188f2`, based on `main@aa820596` (current `main` tip). Not pushed to `main`.

**Implements the accepted fifth-revision design exactly**, with two deliberate, narrow choices beyond the letter of the plan, both surfaced here rather than silently made:
1. The composed shape is an extension of the existing `FamilyTierQuoteItem` (new `isComposedUpgrade`/`composedBase`/`composedUpgrade` fields) rather than a new `CartItem` union member — smaller blast radius on every function that already pattern-matches on `CartItem`, and the auditor's own instruction said "prefer... if that is cleaner," not "require."
2. `composableSelection` is never persisted on `composedUpgrade` (matching the existing, already-established rule that this field is client-only re-seed intent, never a Request field) — simpler than carrying it through unused.

**State/transitions** (`utils/quote.ts`): `composableDraftIsStale()`, `hasUnfinalisedUpgradeDraft()`, `deriveComposedProjection()`, revised `finaliseUpgradeQuoteDraft()`; `replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()` extended to drop a stale draft. One real bug caught by the contract test before it shipped: my first `finaliseUpgradeQuoteDraft()` called the extended `removeFamilyTierSystemQuoteItems()` *before* replacing the draft with its finalised form, so that function's own new staleness check saw the primary already gone and pruned the very draft being finalised. Fixed by finalising first, then removing — a finalised line is never stale, so it survives.

**Persistence** (`RequestSchema.php`): `sanitizeComposedBase()`/`sanitizeComposedUpgrade()` (fail-closed on a missing/invalid child — the whole item is dropped, never persisted partially) and a PHP-mirrored `deriveComposedProjection()` that the sanitizer always calls for a composed item — the client's own top-level `inclusionItems`/`legPaymentSummaries`/`price`/etc. are never read at all for that item, only the two already-sanitised children. `restArgs()` extended to accept the new shape.

**Rendering:** `QuoteSummary.tsx`, `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, `NotificationTemplates.php` group a composed item's inclusions into "Included in your plan"/"Your upgrades" and label Plan/Upgrade stream rows; the admin-only internal-reference line shows both `composedBase`/`composedUpgrade` Platform IDs instead of one ambiguous top-level ID.

**Files changed (27):** `resources/ts/api/types/cost-builder.ts`, `resources/ts/utils/paymentSummary.ts`, `resources/ts/components/cost-builder/types.ts`, `resources/ts/utils/quote.ts`, `resources/ts/components/package-builder/ComposableOfferBrowser.tsx`, `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, `resources/ts/components/package-builder/PackageBuilderApp.tsx`, `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/request-flow/QuoteCartFlow.tsx`, `resources/ts/components/request-flow/OrderSummary.tsx`, `resources/ts/components/request-flow/QuoteProposalPreview.tsx`, `src/Modules/Requests/Support/RequestSchema.php`, `src/Modules/Requests/Notifications/NotificationTemplates.php`, `resources/css/modules/cost-builder.css`, rebuilt `dist/`, `package.json`, both Code Maps, plus new `scripts/upgrade-quote-draft-contract.ts`, `tests/request-schema-composed-upgrade.php`, `tests/notification-templates-composed-upgrade.php`.

**Tests, all passing on this branch:** `npm run contract:upgrade-quote-draft` (new — draft/base matching including the finalisation-ordering bug above, add-on cascade, `deriveComposedProjection()` concatenation/tagging/no-dedup, legacy-item non-interference), `php tests/request-schema-composed-upgrade.php` (new — **includes the actual security-regression lock**: a payload whose top-level `price`/`billingCycle`/`inclusionItems`/`minimumTermValue` deliberately disagree with its own `composedBase`/`composedUpgrade` is persisted using the derived values, never the submitted ones; plus both fail-closed cases and normal-item non-interference), `php tests/notification-templates-composed-upgrade.php` (new — dual admin reference, inclusion grouping, stream provenance cue, shared-`item_id` non-dedup, normal-item non-interference), all pre-existing `tests/request-schema-*.php` and `tests/notification-templates-*.php`/`package-family-notification.php`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass. Full repo `php tests/*.php` sweep run for regressions: 5 pre-existing unrelated failures confirmed identical on a clean `main` stash (WP-runtime-dependent tests that don't run under bare `php` CLI, and one route-baseline fixture drift) — none touch anything this branch changed.

**Unresolved risks / explicitly deferred, not silently dropped:**
- No live browser verification — the "Finalise build" button, its disabled/hint state, and the grouped-section rendering were checked by contract/unit tests and `tsc`/`build` only, never rendered in an actual browser (this repo has no WordPress/browser harness, same limitation noted on every prior UI-fix round in this file).
- The base-vs-upgrade minimum-term conflict (does a longer upgrade-side commitment ever need to override the base's?) is intentionally not resolved — `composedBase` governs unconditionally per the accepted third/fourth revision, `composedUpgrade`'s own term stays preserved for audit only.
- The Finalise action's exact confirmation copy for "this removes your add-ons" is a placeholder hint string, not a designed confirmation dialog — flagged in the fourth revision as a UX decision for the later refinement pass, not decided here.
- Standalone Build Your Own UX remains untouched, as instructed.

## Work journey
Upgrade implementation/review/deploy/live validation → close remaining representation checks → final customer UI/UX refinement → later standalone Build Your Own journey.