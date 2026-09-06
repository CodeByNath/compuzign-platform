# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — architecture audit correction required; source changes NOT approved**
- Auditor verdict: **Stop — architectural risk** on the proposed implementation slice, not on CZTU/CZTEU themselves.
- Production remains `main@28f716b1bde85717787418e29efbbf8dce978d3c`.
- Previous cart/quote/PDF/email/View-Print/order flow is accepted live and must stay closed.

## What passed
Reading A is the correct direction: CZTU/CZTEU are durable catalog/composition identity, copied into quote/Request snapshots; they are not minted per customer purchase. Platform Identifier Station remains generic; pricing remains PackageManagerSchema; Request remains copy-only.

## Blocking contradiction in Claude's audit
Claude correctly found that today's `composable_occupant` is one Tier-Instance-owned source occupant and **does not identify which base Tier/Edition it upgrades**. Current `settleComposableOccupant()` only settles that single source occupant and today reserves its own CZT/CZTL identities. It has no base occupant/Edition argument or stored base-composition record.

Therefore the proposed Phase 1 cannot both:
1. mint a catalog-level CZTU at `settleComposableOccupant()`, **and**
2. define CZTU by `(tier_instance_id, base occupant, upgradeId)`.

Capturing the base only later from a sibling cart item does not solve catalog identity; that would make the composition exist first at customer time while claiming it was already minted at catalog settle time.

## Required corrected audit
Before implementation, identify the **native Package-domain Upgrade composition record** that owns the relationship:
- Tier Upgrade = source composable occupant + exact base Tier occupant (`CZT`) + own stable native upgrade id + `CZTU`.
- Edition Upgrade = same plus exact base Edition (`CZTE`) + own stable native upgrade id + `CZTEU`.

The source composable occupant keeps its existing CZT/CZTE/Leg identities; CZTU/CZTEU are additional higher-order composition identities and never replace them.

Claude must determine, from current Package/Tier lifecycle architecture:
1. Where that composition record should live and its exact stored shape. No array index/label/sentinel as durable identity.
2. What **real mutation/settle action** creates/activates it and therefore may reserve/bind CZTU/CZTEU. Do not claim `settleComposableOccupant()` unless the base relationship is actually present there.
3. Whether existing Admin/customer-policy data already expresses the base relationship. If not, say explicitly that a minimal Package-domain composition declaration must be introduced before identity minting; do not fabricate it from cart coexistence.
4. How quote creation selects an already-existing CZTU/CZTEU and snapshots base CZT/CZTE + source composable identity + Upgrade identity + Legs/Rate Sheet identities.
5. Legacy behavior when no Upgrade composition declaration exists: current composable flow must continue unchanged until intentionally migrated/configured; no read-time mint/backfill.
6. Correct Platform Identifier adapters/native refs/migration Station coverage for this actual record.
7. Give one smallest implementation phase. **Do not implement yet.**

## Branch hygiene
Claude verified both remaining review branches are completed/superseded. Nath may delete them because Claude's environment blocks deletion:
`review/composable-tier-customer-ux` and `review/quote-email-billed-item-separators`.
The latter contains an unrelated old test-only DI fix not on main; do not merge its stale branch. If that test is later worth fixing, open a separate current-main work item.

After the corrected ownership audit, set **AWAITING CHATGPT REVIEW**. No source push.