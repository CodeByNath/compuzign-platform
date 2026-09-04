# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — revise Upgrade Journey Finalisation persistence contract; no source changes.**
- Auditor verdict: **Stop — architectural risk.**
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

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.