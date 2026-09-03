# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Request/PDF/email implementation pushed to review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Accepted production: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`; Deploy #937 succeeded (unchanged — this phase never pushed to `main`).
- Review branch: `review/composable-request-pdf-email` @ `f9035e82cda9ce7a0f1a65e36d761f8524aa058c`, branched from the accepted `main@84ebbb28`.

## Accepted chain
Admin/customer configurator and aggregate composable quote/cart line are accepted live. Do not reopen them without hard evidence. Overall work remains open; final UI/UX refinement follows representation-chain acceptance.

## Audit decision — Request / PDF / email
Claude’s main finding is confirmed independently: `RequestSchema.php` uses an explicit `family_tier` allow-list and currently drops the composable discriminator; downstream proposal/email logic still assumes binary primary/Add-on. Persisting the discriminator without fixing those readers would misclassify Build Your Own as primary.

### Implement now
1. Persist optional **`isComposable`** through the Request REST schema/sanitizer, `RequestLine`, and Request→cart reconstruction. Absent must remain false for legacy Requests.
2. **Do not persist `composableSelection` in Request.** It is browser edit/reseed intent. A submitted Request is an immutable terminal snapshot; selected inclusion names/quantities already live in `inclusionItems`, and commercial streams in `legPaymentSummaries`.
3. Use one centralized/request-side `primary | addon | composable` classification convention (composable first, then Add-on, else primary). Guard impossible Add-on+composable state; do not scatter raw `!isAddon` assumptions.
4. Admin Request/proposal/print/PDF/customer email must show the aggregate composable line distinctly as **Build Your Own**, never primary/Add-on and never raw Platform IDs.
5. Reuse stored `inclusionItems` for selected inclusion/quantity display and stored `legPaymentSummaries` for payment streams/TCV. Include composable **exactly once** in combined totals.
6. Never re-resolve an old Request against current Rate Sheet, occupant, policy or resolver state.
7. Preserve existing primary/Add-on Request behavior when `isComposable` is absent.
8. Keep the unrelated pre-existing `planDurationMonths` Request-persistence gap **deferred**; do not fold it into this phase.
9. No pricing/resolver/Rate Sheet/entity/identity changes and no occurrence-month math change.

## Required verification
At minimum cover:
- primary + composable same Family/Tier System reconstruct with distinct roles/keys;
- composable-only Request;
- primary + composable + Add-on representation;
- stored inclusion quantities and per-Leg streams survive Request round-trip;
- proposal/PDF totals include composable once;
- customer email identifies Build Your Own and uses stored snapshot values;
- legacy Request fixture with no `isComposable` remains unchanged;
- impossible Add-on+composable input is handled deterministically/rejected at the appropriate write boundary.

Do not rely on “no PHPUnit” as a reason to leave PHP untested. Inspect the repository’s existing PHP/CLI request-schema regression scripts and extend/reuse the applicable convention if present; otherwise add the smallest executable regression harness consistent with repository practice. Frontend contracts should directly exercise Request→cart role/key reconstruction and proposal totals.

Run focused tests/contracts, typecheck, build and docs checks. Push the exact implementation to a **non-production review branch**, record changed files/SHA/test evidence here, set **AWAITING CHATGPT REVIEW**, and do not push `main`.

## Implementation report — Request / PDF / email (review branch, no `main` push)

Branch: `review/composable-request-pdf-email` @ `f9035e82cda9ce7a0f1a65e36d761f8524aa058c`, branched directly from the accepted `main@84ebbb28` (no other commits in between). `main`/`origin/main` untouched — verified via `git status`/`git log` after the push.

### Implemented, matching the approval's 9 points
1. `isComposable` persists: `RequestSchema.php::sanitizeItems()` (family_tier branch), `RequestLine` (`admin.ts`), `requestLineToCartItem.ts::toCartItem()`. Absent defaults false everywhere.
2. `composableSelection` is NOT persisted anywhere in the Request pipeline — confirmed by a dedicated test assertion (`request-schema-composable.php`).
3. Centralized role convention: PHP gained `NotificationTemplates::resolveItemRole()`, mirroring `resolveQuoteItemRole()` in `utils/quote.ts` verbatim (composable checked first, then Add-on, else primary) — no scattered `!isAddon` checks added.
4. "Build Your Own" shown distinctly: `QuoteProposalPreview.tsx` gets a "Build Your Own" eyebrow (parallel to primary's "Package Family"); `NotificationTemplates.php` email gets a "Build Your Own" badge (parallel to the existing "add-on" pill). Never raw IDs, never labeled primary/Add-on.
5. `inclusionItems`/`legPaymentSummaries` reused unchanged through the same existing render helpers (`FamilyInclusionsList`, `emailFamilyStreamsBlock`, `emailInclusionItemsList`) — no new commercial-data plumbing. Composable folds into the combined Total Contract Value/Initial Payment exactly once, both in `QuoteProposalPreview.tsx` (mirrors `OrderSummary.tsx`'s `familyCommercialItems` precedent) and in `NotificationTemplates.php::buildQuoteSections()`.
6. No re-resolution against live Rate Sheet/occupant/policy/resolver state anywhere touched — every field is read from the stored snapshot only, same as the existing primary/Add-on paths.
7. Legacy primary/Add-on Request behavior is byte-unchanged when `isComposable` is absent — proven by fixtures with no `isComposable` key in both new tests, and every pre-existing PHP/TS test in this area still passes unmodified.
8. `planDurationMonths` gap left untouched, as directed.
9. No pricing/resolver/Rate Sheet/entity/identity changes anywhere in the diff.

### Impossible-state guard (write boundary)
`RequestSchema::sanitizeItems()` now forces `isAddon: false` whenever `isComposable` is true, regardless of what the raw payload claims — a stored line can never represent both roles. Covered by `request-schema-composable.php`'s dual-true-payload fixture.

### Exact files changed (16)
- `src/Modules/Requests/Support/RequestSchema.php` — persist `isComposable` + write-boundary guard; `restArgs()` schema entry.
- `src/Modules/Requests/Notifications/NotificationTemplates.php` — `resolveItemRole()`; `classifyQuoteItems()` fourth bucket; `emailFamilyRow()`/`emailFamilyRows()` role-based badge; `buildQuoteSections()` composable row + combined-totals merge.
- `resources/ts/api/types/admin.ts` — `RequestLine.isComposable?: boolean`.
- `resources/ts/admin-station/stations/requests/requestLineToCartItem.ts` — reconstructs `isComposable`.
- `resources/ts/components/request-flow/QuoteProposalPreview.tsx` — composable render block + combined totals.
- `scripts/request-flow-family-tier-parity-contract.ts`, `scripts/quote-inclusion-quantity-parity-contract.ts`, `scripts/package-builder-bundle-inclusion-parity-contract.ts` — occurrence counts updated (`QuoteProposalPreview.tsx` now at parity with `OrderSummary.tsx`'s 3 usages).
- `package.json` — new `contract:composable-request-line` script.
- `docs/code-map/tier-composable-occupant-quote-cart.md` — Phase boundary section replaced with what actually shipped.
- New: `tests/request-schema-composable.php`, `tests/notification-templates-composable-quote-parity.php`, `scripts/composable-request-line-contract.ts`.
- `dist/js/*` — rebuilt output (this repo commits `dist/`, matching prior phases).

### Verification performed (matching the "Required verification" list)
- **Primary + composable, same Family/Tier System, distinct roles/keys**: `composable-request-line-contract.ts` proves `quoteItemKey()` differs (`:primary` vs `:composable`) and `classifyQuoteItems()` never merges them — this directly reproduces and fixes the audit's duplicate-key finding. `notification-templates-composable-quote-parity.php`'s coexistence fixture proves the email renders two distinct badged rows.
- **Composable-only Request**: covered in both the PHP email test and implicitly by the TS reconstruction contract (single-item fixture).
- **Primary + composable + Add-on**: `notification-templates-composable-quote-parity.php`'s three-way fixture — all three badges present, each correctly labeled.
- **Inclusion quantities + per-Leg streams survive round-trip**: existing `request-schema-family-quote-snapshot.php` untouched (still passes); composable path reuses the identical `sanitizeInclusionItems()`/`sanitizeLegPaymentSummaries()` functions, exercised by the new PHP email test's Bundle/quantity fixture.
- **Proposal/PDF totals include composable once**: `notification-templates-composable-quote-parity.php`'s coexistence fixture asserts the exact combined dollar figure ($12,680.00 = primary's 10,880 + composable's 1,800) — not double-counted, not primary-only.
- **Customer email identifies Build Your Own from stored snapshot**: asserted directly (badge text + inclusion labels present, all from stored fields).
- **Legacy Request with no `isComposable` unchanged**: dedicated fixture in both new tests + every pre-existing test in this area re-run and still passing.
- **Impossible Add-on+composable input handled deterministically**: `request-schema-composable.php`'s dual-true-payload fixture proves the sanitiser forces `isAddon: false` at the write boundary.

### Test convention used
This repo has no PHPUnit; it has a `tests/*.php` convention (plain assertion scripts run via `php tests/<name>.php`, composer-autoloaded) already covering `RequestSchema`/`NotificationTemplates` — confirmed by inspection (`tests/request-schema-is-addon.php`, `tests/notification-templates-family-quote-parity.php`, etc.) and reused directly, correcting the audit's earlier "no PHPUnit setup found" statement, which had only searched for `phpunit*`/`*Test.php` and missed this existing `tests/` directory.

### Full validation run (all green)
`npx tsc --noEmit`, `npm run build`, `node scripts/docs-check.mjs` (Code Map trimmed back under the 600-word limit), every PHP test in `tests/` touching `RequestSchema`/`NotificationTemplates`/durable submission/quote-view (14 files, all passing — 2 pre-existing unrelated failures in `quote-view-email-link.php`/`quote-view-http-boundary.php` traced to `RequestsController::__construct()`'s signature, confirmed via `git diff --stat` to be outside every file this phase touched), `contract:composable-quote-cart`, `contract:composable-request-line` (new), the three updated occurrence-count contracts, `contract:requests-admin-station-surface`, `contract:package-family-request-flow`, `contract:quote-view`, `contract:quote-view-print-portal`, `contract:request-print-isolation`, `contract:payment-summary-extraction-parity`, `regression:composable-quote-cart-loop`.

Set **AWAITING CHATGPT REVIEW**. `main` untouched — will only push there after separate explicit approval, per standing workflow.