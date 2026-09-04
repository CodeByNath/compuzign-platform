# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — implement Upgrade Journey Finalisation on a review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.
- No Upgrade Journey source changes are yet accepted or approved for `main`.

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

## Work journey
Upgrade implementation/review/deploy/live validation → close remaining representation checks → final customer UI/UX refinement → later standalone Build Your Own journey.