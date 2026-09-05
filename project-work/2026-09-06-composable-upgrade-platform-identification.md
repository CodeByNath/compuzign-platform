# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — architecture audit only; source changes NOT approved**
- Auditor verdict: **Proceed with safeguards**
- Production baseline: `main@28f716b1bde85717787418e29efbbf8dce978d3c`.
- Previous cart/quote/PDF/email/View-Print/order flow is accepted live and must not be reopened without hard evidence.

## Locked identity law
Upgrade identity is additive, never substitutive.
- Tier-derived Upgrade must preserve base Tier occupant `CZT` and gain its own permanent `CZTUxxxxx`.
- Edition-derived Upgrade must preserve base Tier occupant `CZT` + exact Edition `CZTE` and gain its own permanent `CZTEUxxxxx`.
- Existing Tier Group/Instance, Commercial Leg and Rate Sheet row/option identities remain intact internally.
- `CZTU/CZTEU` must never replace, copy, flatten, or masquerade as any composing identity.
- Future `CZTC/CZTEC` Custom/New Build is out of scope.

Canonical architecture skill requires ownership audit first. Current `PlatformIdentifierPolicy` has no CZTU/CZTEU families. Current composable quote path still uses `FamilyTierQuoteItem` + `isComposable` + customer sentinel and explicitly has no higher-order Upgrade Platform ID.

## Claude task — audit before implementation
Read current `main`, root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, and `skills/compuzign-platform-architecture` references. Report in this same file:
1. **Ownership table** for CZTU/CZTEU: identity infra, native lifecycle/mutation owner, persistence, projection, pricing, presentation.
2. **Exact native reference shape** for Tier Upgrade and Edition Upgrade. It must be stable and not index/label/sort based.
3. **Mint boundary**: identify the existing mutation/settle boundary where the permanent Upgrade identity can be reserved/bound. Do not mint during preview/read/projection.
4. **Lifecycle**: when an Upgrade is created, changed, replaced, submitted, reopened, archived/cancelled; whether identity survives quote→Request→future Order. Explain why the proposed owner is correct.
5. **Composition snapshot**: prove stored Upgrade can independently answer Tier Group/Instance, base CZT, exact CZTE when applicable, CZTU/CZTEU, Legs and Rate Sheet rows/options without exposing internal IDs to customer-safe projections.
6. **Platform Identifier wiring** needed: Policy constants/prefixes, adapter factory/native reference helper, migration/repair Station coverage, collision/claim/persist/project path. No second identity engine or custom backfill.
7. **Compatibility**: existing normal Tier/Add-on/composable cart, TCV, PDF/email/View-Print, Request/order reconstruction, idempotency and legacy quote behavior must remain unchanged.
8. Recommend one phase-bounded implementation slice and tests. Do not implement yet.

## Branch hygiene
Nath confirms email/cart/PDF/prints/orders are passed. Audit remaining remote review branches and clean completed/superseded ones:
- `review/composable-tier-customer-ux` belongs to a CLOSED Phase 2B1 and contains test-only validation not approved/needed for production; delete local+remote once verified no unresolved work remains.
- `review/quote-email-billed-item-separators` is old/diverged and its live customer email concern is now superseded by the accepted production flow; verify its unique commits are not required by current `main`, then delete local+remote rather than merging stale code.
Preserve only `main`, `Project-work-instructions`, and any branch proven to contain unresolved work.

After audit + branch cleanup, set **AWAITING CHATGPT REVIEW**. No source implementation or `main` push in this round.