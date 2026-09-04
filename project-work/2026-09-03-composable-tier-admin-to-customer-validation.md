# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — revise composed Upgrade snapshot consistency before implementation.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.
- No Upgrade Journey source changes approved.

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

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.