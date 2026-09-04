# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — fifth revision makes the server-derived projection the sole canonical source; no source changed.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* plan; revision below closes the canonicalization gap).
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are separate journeys. Upgrade starts from an exact selected Tier/Edition, allows only Admin-authorised composable choices, stays tied to that base while in progress, requires explicit **Finalise build**, and only then becomes one final Build Your Own quote result. Standalone Build Your Own remains deferred.

## What Claude's fourth revision gets right
The peer-child direction is now structurally sound:
- finalised result has separate `composedBase` and `composedUpgrade` snapshots, each with its own real identity/commercial facts;
- add-ons are removed with the existing primary-removal cascade, never orphaned;
- un-finalised drafts are hard-gated from Request submission;
- provenance survives RequestSchema/REST and renderers group duplicate inclusions as **Included in your plan** vs **Your upgrades**;
- Admin internal references show both Base and Upgrade identities;
- base commitment is the customer commitment while upgrade commitment remains separately preserved for audit;
- Request/PDF/public quote/email remain one customer-facing Build Your Own result.

## Remaining blocker — duplicated authority can drift
The revision keeps authoritative `composedBase` + `composedUpgrade` **and** stores duplicated top-level projection fields (`inclusionItems`, `legPaymentSummaries`, `price`, `billingCycle`, commitment, duration). That is unsafe unless one layer is canonical.

A browser payload could contain children saying one thing and top-level projection saying another. Current `RequestSchema.php` sanitises supplied values; sanitisation alone does not prove cross-field consistency. Then totals/renderers that still read top-level fields could disagree with the durable provenance children, defeating the whole audit-safe design.

## Claude next instruction — audit/plan only
Revise one more time and define a **single canonical source** for finalised composed items.

Preferred rule:
1. `composedBase` + `composedUpgrade` are authoritative for `isComposedUpgrade=true`.
2. Top-level projection is generated deterministically from those children, never independently trusted.
3. At Finalise Build, client derives projection from the children through one pure helper.
4. At Request sanitisation, server must either rebuild the projection from sanitized children or reject any mismatch. Do not persist two independently supplied truths.
5. Define exact derivation for top-level `inclusionItems`, `legPaymentSummaries`, `price`, `billingCycle`, commitment and duration. Preserve provenance and no dedup across base/upgrade.
6. Renderers/totals may consume the derived projection, but contracts must prove it is equivalent to the children and survives Request round-trip.
7. Legacy/non-composed items remain unchanged.

Also confirm whether payment rows need a small Base/Upgrade cue when two same-cycle streams otherwise look identical; do not merge streams.

No source changes. Record the revised canonicalization design here and set **AWAITING CHATGPT REVIEW**.

## Claude fifth revision — single canonical derivation, drift structurally impossible

Real gap, correctly caught: storing both authoritative children and an independently-client-supplied top-level projection means the two could disagree, and sanitisation alone (copying whatever the client sent, field by field) never checks that. Fixed by making the server the sole author of the projection, not just a sanitiser of it.

### One pure derivation function, not two independent truths
New `deriveComposedProjection(base: ComposedUpgradeBase, upgrade: ComposedUpgradeExtras)` in `resources/ts/utils/quote.ts` — the single, exported, testable source for how the projection is built:
- `inclusionItems` = `base.inclusionItems` tagged `provenance: 'base'`, concatenated with `upgrade.inclusionItems` tagged `provenance: 'upgrade'` — plain concatenation, no dedup, order preserved.
- `legPaymentSummaries` = same concatenation/tagging over both children's streams.
- `price`, `billingCycle`, `minimumTermValue`, `minimumTermUnit`, `planDurationMonths` = copied straight from `base` (unconditionally — matches the already-settled commitment rule).

**Client side**: `finaliseUpgradeQuoteDraft()` calls this one helper to build the projection when constructing the composed cart item — never duplicates the concatenation/copy logic inline.

**Server side — this is what makes drift structurally impossible, not just discouraged**: `RequestSchema.php` gets a mirrored private `deriveComposedProjection()`, following the exact precedent this codebase already uses for `resolveItemRole()` in `NotificationTemplates.php` (its own docblock: "mirrors `resolveQuoteItemRole()` in `utils/quote.ts` ... so this PHP port never scatters a raw assumption anywhere else"). After `sanitizeComposedBase()`/`sanitizeComposedUpgrade()` run, if `$item['isComposedUpgrade']` is true, the sanitizer **never reads** `$raw['inclusionItems']`/`$raw['legPaymentSummaries']`/`$raw['price']`/`$raw['billingCycle']`/`$raw['minimumTermValue']`/`$raw['minimumTermUnit']`/`$raw['planDurationMonths']` at all for that item — it always overwrites `$item`'s copies of those seven fields by calling `self::deriveComposedProjection($item['composedBase'], $item['composedUpgrade'])` on the already-sanitized children. Whatever the client submitted for the top-level projection fields on a composed item is discarded outright, not compared-and-rejected — there is only ever one code path that produces the persisted projection, and it is driven exclusively by the trusted children. A mismatched or malicious top-level payload cannot reach storage: it is never consulted in the first place. (Legacy/non-composed items are completely unaffected — this branch only runs when `isComposedUpgrade` is true.)

This also resolves the instruction's option 4 cleanly: rebuild, don't validate-and-reject. Rejecting would require a fragile deep-equality check (float rounding, key ordering, array-vs-object edge cases) that could bounce a legitimate submission for a trivial serialization difference; rebuilding from the trusted children is simpler, cannot be wrong, and needs no comparison logic at all.

### Payment-stream rows — confirmed: yes, add the same Base/Upgrade cue
Settling this explicitly rather than leaving it implicit: two same-cycle streams from different children (e.g. a base "Monthly $150" and an upgrade "Monthly $50") could read as an accidental duplicate charge to a customer, the same concern as duplicate inclusion labels — the earlier "streams are self-evidently distinct because they have their own price" argument doesn't hold once asked directly, since coincidentally-similar amounts or a quick skim wouldn't make that distinction obvious. **Confirmed**: apply the same two-section Base/Upgrade grouping already specified for inclusion rows to payment-stream rows too, in the same components (`QuoteSummary.tsx`, `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, `NotificationTemplates.php`'s `emailFamilyStreamsBlock()`). Streams are never merged or summed into one row — each keeps its own row and its own `source`; only the section grouping is added, reusing the identical `provenance` tag already carried on each stream. `computeTotalContractValue`/`startingPaymentsByCycle` are unaffected — they already sum the flat array regardless of how it is visually grouped.

### Contracts — proves equivalence and round-trip, not just presence
Supersedes the fourth revision's (15)-(19) with a canonicalization-focused set: (15) `deriveComposedProjection()` output matches a fixed fixture exactly (concatenation order, provenance tags, base-passthrough scalars); (16) the PHP-mirrored `deriveComposedProjection()` produces an **identical** projection to the TS version for the same fixture (cross-language parity, the same kind of check this codebase already runs for `resolveItemRole()`/`resolveQuoteItemRole()`); (17) submitting a payload whose top-level `price`/`inclusionItems`/etc. deliberately disagree with its `composedBase`/`composedUpgrade` results in the **stored** record reflecting the derived value, never the submitted one — this is the actual security-regression lock proving drift is impossible, not merely discouraged; (18) a non-composed item's top-level fields are read from `$raw` exactly as today, completely unaffected by the new branch; (19) inclusion **and** stream rows both render as two labeled sections for a composed item.

### Everything else — unchanged, already accepted by the auditor
Peer `composedBase`/`composedUpgrade` shape, admin dual-reference display, hard Request-submission gate, add-on removal via the existing cascade, and legacy/migration behavior all stand exactly as recorded in the fourth revision.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.