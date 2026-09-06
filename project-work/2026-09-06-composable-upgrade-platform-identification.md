# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — Phase 1 catalog identity implementation approved**
- Auditor verdict: **Proceed with safeguards**.
- Production baseline: `main@28f716b1bde85717787418e29efbbf8dce978d3c`.
- Previous cart/quote/PDF/email/View-Print/order flow remains closed and must not change.

## Locked architecture
Nath's Bundle analogy is the governing precedent.

A Bundle participates in the ordinary Rate Sheet pipeline with ordinary row identity (`item_id` + CZPRCI) while separately retaining Bundle identity (`bundle_id` + CZPRCB). The identities coexist; Bundle identity says what the commercial thing is, while Rate Sheet identity keeps it in the Rate Sheet ecosystem. Neither replaces the other and the Bundle does not become a child of the row.

Upgrade follows the same dual-identity rule:
- existing composable Tier participant keeps its normal Tier ecosystem identity/routing (`CZT`/`CZTA` + CZTL);
- a composable Edition keeps `CZTE` + CZTEL;
- the same participant may additionally carry `CZTU` / `CZTEU` declaring Upgrade capability/type;
- CZTU/CZTEU are **not** children of a selected base Tier/Edition;
- no base occupant/Edition belongs in the catalog native reference;
- customer base-plan association is later quote/transaction context only.

Native identity scope accepted:
- CZTU uses the composable occupant's own stable native tuple `(tier_instance_id, occupant_id)` under a distinct Platform Identifier entity type;
- CZTEU uses `(tier_instance_id, occupant_id, edition_id)` under its distinct entity type.
Using the same native tuple under different entity types is intentional dual identity, not substitution.

## Phase 1 — implement catalog side only
Implement CZTU + CZTEU together, reusing existing Package/Platform-Identifier machinery.

Required:
1. Add `TIER_UPGRADE -> CZTU` and `TIER_EDITION_UPGRADE -> CZTEU` to `PlatformIdentifierPolicy`; prove prefix disambiguation/collision safety.
2. Add Package-owned scalar storage/read/claim/exists/enumerate/project support for the additional Upgrade IDs on the existing composable occupant/Edition records. Preserve every existing CZT/CZTA/CZTE/CZTL/CZTEL value.
3. Reuse existing occupant/Edition native-reference tuple shapes; do not introduce base-qualified Upgrade references, `upgrade_pairings[]`, positional identity, or a second identity engine.
4. Add adapters and Temporary Migration Station coverage through the existing generic mechanisms; no read-time mint/backfill.
5. Add an explicit admin-owned declaration on the composable occupant that authorizes Upgrade identity minting. It is a capability/type declaration, **not an exclusive role**: the same composable ecosystem participant may later carry another independent type identity (for example future Custom/New-Build work). Do not make this flag change pricing, customer eligibility, routing, or presentation.
6. Mint/bind CZTU only through the existing real composable-occupant settle mutation; mint/bind CZTEU only through the existing Edition activation/settle boundary. Preserve reserve -> persist -> bind and reconciliation/idempotency behavior.
7. Reject client-supplied Platform IDs through the existing mutation guard.
8. No quote/Request/cart/UI/customer consumption in this phase.

## Acceptance tests
- declaration false/absent -> no CZTU/CZTEU minted and legacy behavior unchanged;
- declaration true -> CZTU minted once; repeat settle reconciles same ID;
- activated composable Edition -> CZTEU minted once; repeat lifecycle action keeps same ID;
- ecosystem IDs remain unchanged alongside Upgrade IDs;
- native-reference/entity-type separation permits same tuple for CZT+C ZTU and CZTE+CZTEU without registry collision;
- migration/assignment enumerates only eligible existing declared records and never mints on read;
- no customer output or pricing/resolver/snapshot behavior changes.

Use one clean review branch from current `main`. Report exact changed files, focused tests, candidate SHA/tree, and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before independent review.