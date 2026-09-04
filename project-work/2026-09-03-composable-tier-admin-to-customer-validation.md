# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — third revision adds the durable Request-boundary persistence contract; no source changed.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* plan; revision below addresses each finding).
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are separate journeys. Upgrade starts from an exact selected normal Tier/Edition, allows only Admin-authorised composable choices, remains tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes the final Build Your Own quote result. Standalone Build Your Own stays deferred and must not simply load beside normal Tier cards.

## Auditor review of Claude second revision
The provenance-preserving nested direction is materially better: preserve the exact base snapshot separately, keep top-level composed identity tied to the composable occupant, tag base-vs-upgrade rows/streams, and remove Tier add-ons with the existing primary-removal cascade.

However the plan is still unsafe at the durable Request boundary.

### Blocking evidence from current source
`RequestSchema.php` explicitly sanitises `inclusionItems` and `legPaymentSummaries` field-by-field. It currently preserves only existing keys. A proposed `provenance` key on either structure would therefore be **dropped**. The proposed `finalisedUpgradeBase` would also be dropped because it is not in the Request allow-list.

That means the browser cart could contain an unambiguous composed snapshot, but the durable Request/PDF/email snapshot would lose the very provenance/base structure introduced to make finalisation safe. Saying "no backend change" therefore contradicts the requirement that finalised Build Your Own remain truthful and auditable after submission.

Second issue: `ServiceInclusion` is declared upstream in API types, not in `components/cost-builder/types.ts`; the affected-file plan must identify the actual type owner before implementation.

## Claude next instruction — audit/plan only
Revise the design once more and settle the **durable snapshot contract** before editing source:
1. Persist enough finalised-composition structure through `RequestSchema.php` so Admin Request, proposal/PDF, public quote and email cannot lose base-vs-upgrade provenance.
2. Decide whether the durable shape should preserve `finalisedUpgradeBase` plus tagged rows/streams, or another bounded equivalent. Do not rely on client-only fields that disappear at submission.
3. Define renderer behavior: one customer-facing Build Your Own result, while retaining internal provenance and avoiding duplicate/double-counted inclusions/streams.
4. Resolve commitment ownership explicitly. Do not leave "base governs unless product decides otherwise" as an implementation default. State what the final snapshot displays/stores when base and upgrade commitments differ, or flag it for Nath before implementation.
5. Correct the exact affected-file list, including the true `ServiceInclusion`/`LegPaymentSummary` type owners and required Request/backend consumers.
6. Keep the hard Request gate for any un-finalised Upgrade draft.
7. Keep existing primary-removal add-on cascade; never orphan Tier add-ons.
8. Define legacy behavior and focused contracts across browser cart → Request sanitizer → stored snapshot → PDF/email/public quote.

No source changes. Record the revised plan here and set **AWAITING CHATGPT REVIEW**.

## Claude third revision — durable snapshot contract through the Request boundary

Confirmed against source before revising: the auditor is right, and I conflated two different cases in the prior round. `upgradeDraftBase` (an un-finalised draft) *should* never persist — a draft is blocked from submission entirely by the hard gate, so it never reaches `RequestSchema.php` at all. But `finalisedUpgradeBase`/`provenance` describe an *already-finalised* result that the customer is actively submitting — saying "no backend change, safe by construction" for that case was wrong: it means the very structure that makes finalisation safe would be silently stripped at the one moment it needs to survive (submission), leaving the stored Request/PDF/email snapshot exactly as ambiguous as the flat-concatenation design the auditor already rejected. Corrected below, with the exact mechanism (not "no change needed").

### 1–2. Durable persistence mechanism (`RequestSchema.php`, confirmed against current source)
Three concrete additions to the existing, unchanged sanitizer pattern — no new mechanism invented, just extending the allow-lists that already exist:
- `sanitizeInclusionItems()` (private, ~line 226): add one line copying `provenance`, validated against a closed enum — `if (in_array($entry['provenance'] ?? null, ['base', 'upgrade'], true)) { $item['provenance'] = $entry['provenance']; }` — same defensive-whitelist posture as every other field in this function.
- `sanitizeLegPaymentSummaries()` (private, ~line 278): identical one-line addition to its own `$summaries[]` entry.
- New `sanitizeFinalisedUpgradeBase($raw): ?array` (private), mirroring exactly the existing per-field allow-list style already used for the family_tier item's own top-level fields (~line 143 onward): copies `tierOccupantId`/`tierPlatformId`/`tierEditionPlatformId`/`tierId`/`tierTitle`/`tierEditionTitle` via `sanitize_text_field`, `minimumTermValue` via `floatval`, `minimumTermUnit`/`price`/`billingCycle` the same way the top-level fields already are, and recurses into the *existing* `sanitizeInclusionItems()`/`sanitizeLegPaymentSummaries()` for its own nested `inclusionItems`/`legPaymentSummaries` — reusing the same two functions, not duplicating their logic.
- In `sanitizeItems()`'s family_tier branch: `if ($item['isComposable']) { $item['finalisedUpgradeBase'] = self::sanitizeFinalisedUpgradeBase($raw['finalisedUpgradeBase'] ?? null); }` — `null` for every non-composable line and every composable line that isn't a finalised composition (a standalone Build Your Own item simply has no `finalisedUpgradeBase` to sanitise, same as today).
- `restArgs()`'s REST args JSON-schema (~line 400) also needs `provenance` added to `inclusionItems.items.properties` and `legPaymentSummaries.items.properties`, plus a new `finalisedUpgradeBase` property with its own nested object schema mirroring the family_tier `properties` block — otherwise WP's REST arg validation could strip the field before `sanitizeItems()` ever sees it, independent of the sanitizer itself. This is a third, distinct layer from the sanitizer function — both must change together.

**`RequestRepository.php` confirmed to need no change**: `create()` calls `update_post_meta($postId, self::META_DATA, $payload)` — a generic, schema-agnostic blob store with no per-field allow-list of its own. Once `RequestSchema.php`'s sanitizer includes the new fields in `$item`, they persist through unchanged storage code automatically.

### 3. Renderer behavior — one result, provenance retained, no double-count
No renderer code changes needed, now or later — this part of the prior revision was correct and stands: `QuoteProposalPreview.tsx`/`NotificationTemplates.php`/Admin Request/public quote view already iterate `inclusionItems`/`legPaymentSummaries` generically per item, rendering whatever keys exist; an extra `provenance` key on an existing entry, or an unread `finalisedUpgradeBase` sibling field, is inert to code that never looks at either. The customer/Admin sees exactly one Build Your Own line, exactly once, with its already-defined top-level `price`/`billingCycle`/`inclusionItems`/`legPaymentSummaries` (per the second revision's ownership rules) — provenance is preserved in the stored data for truthfulness/audit, not because any current renderer reads it yet.

### 4. Commitment ownership — resolved, not deferred
Removing the "base governs unless product decides otherwise" hedge per instruction: the **base's** `minimumTermValue`/`minimumTermUnit` govern the composed item's top-level commitment fields, unconditionally. Rationale, not a default: a minimum-term commitment in this platform is a property of a Tier **Edition** (the base is always a real selected Edition/Tier; the composable occupant's own `minimum_term_value` — see `buildComposableFamilyTierQuoteItem()` — exists to give a *standalone* Build Your Own selection some commitment when there is no base Edition at all to supply one). Once a base Edition exists, it is the authoritative commitment source in every other part of this architecture (Tier Editions carry "their own commitment," per existing docs); the composable occupant's own term value is preserved read-only inside `finalisedUpgradeBase.minimumTermValue`/`minimumTermUnit` for audit, but never displayed or compared as competing with the base's. If the two ever need to be reconciled into a single longer-of-the-two figure, that is a distinct, separate product decision to raise with Nath explicitly when it becomes concrete — not a blocking ambiguity in this plan, since the plan itself no longer needs to choose between two live values at render time.

### 5. Corrected affected-file list, with true type owners
- **Type owner correction**: confirmed by direct read, not assumed — `ServiceInclusion` is declared in `resources/ts/api/types/cost-builder.ts`; `LegPaymentSummary` is declared separately again, in `resources/ts/utils/paymentSummary.ts` (neither is in `components/cost-builder/types.ts`, which only imports/re-uses both). `provenance?: 'base' | 'upgrade'` is added in each type's own owning file.
- `resources/ts/api/types/cost-builder.ts` — `provenance?` on `ServiceInclusion`.
- `resources/ts/utils/paymentSummary.ts` — `provenance?` on `LegPaymentSummary`.
- `resources/ts/components/cost-builder/types.ts` — `FinalisedUpgradeBase` (referencing both corrected imports above), `finalisedUpgradeBase?` on `FamilyTierQuoteItem`, `upgradeDraftBase?`.
- `resources/ts/utils/quote.ts` — `composableDraftIsStale()`, `hasUnfinalisedUpgradeDraft()`, revised `finaliseUpgradeQuoteDraft()` (tags provenance, builds `finalisedUpgradeBase`, calls existing `removeFamilyTierSystemQuoteItems()`), extended `replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()`.
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — stamp `upgradeDraftBase`; add "Finalise build" action + its add-on-removal confirmation copy.
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — pass the primary's exact resolved item down alongside `context`.
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — wire `finaliseComposable`.
- `resources/ts/components/cost-builder/QuoteSummary.tsx` — gate the CTA on `hasUnfinalisedUpgradeDraft()`.
- `resources/ts/components/request-flow/QuoteCartFlow.tsx` — add the same predicate to `canSubmit`.
- **`src/Modules/Requests/Support/RequestSchema.php` — now correctly listed as changed**: `sanitizeFinalisedUpgradeBase()` (new), `sanitizeInclusionItems()`/`sanitizeLegPaymentSummaries()`/`sanitizeItems()`/`restArgs()` (extended, per section 1–2 above).
- **No change, confirmed**: `RequestRepository.php` (generic blob store), `NotificationTemplates.php`, `QuoteProposalPreview.tsx`, `RequestLifecycle.php`, `OrderSummary.tsx`, `composableCoexistsWithPrimary()`, any Tier/Package/Rate Sheet backend surface.

### 6–7. Unchanged from prior revisions, still correct
Hard Request-submission gate (`hasUnfinalisedUpgradeDraft()` wired into both `QuoteSummary.tsx`'s CTA and `QuoteCartFlow.tsx`'s `canSubmit`) and the add-on removal via the existing unchanged `removeFamilyTierSystemQuoteItems()` cascade both stand as previously recorded.

### 8. Legacy behavior and contracts, extended end-to-end
Legacy/existing carts and every historical Request predate `upgradeDraftBase`/`finalisedUpgradeBase`/`provenance` and simply omit them at every layer (browser cart, REST payload, sanitized snapshot, PDF/email) — no migration in either direction. Proposed `contract:upgrade-quote-draft` additions beyond the prior revision's list: (15) a PHP-side contract (`tests/request-schema-finalised-upgrade-base.php`, matching this codebase's existing `php tests/request-schema-*.php` convention) asserting a submitted finalised item's `finalisedUpgradeBase` and each row's `provenance` survive `RequestSchema::sanitizeItems()` byte-for-byte, while an unfinalised item's `upgradeDraftBase` is dropped; (16) the same contract asserts `restArgs()`'s schema does not reject a payload containing these new fields.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.