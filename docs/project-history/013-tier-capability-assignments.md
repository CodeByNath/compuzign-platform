# Package Capability Assignments and Tier Instance Migration

## Date

2026-07-25

## Scope

This milestone replaced the Package Station's single global Tier set with independent Tier capability instances and explicit Package Family assignments. It covered canonical storage, migration, instance-scoped administration, optional Family capability UX, Family-scoped public projection, compatibility retirement, invariant tests, and current-state documentation. Operational backup, deployment, and production acceptance remained outside the repository implementation.

## Goal

Allow each Package Family to use its own independently managed Tier system without making the Family own that system, making Tier capability mandatory, or letting Service or Rate Sheet provenance imply ownership. Public consumers had to resolve the correct instance explicitly and fail closed when the relationship was missing or ambiguous, while existing Cost Builder quote and printable/PDF calculations remained intact.

## What Changed

The approved implementation landed in nine ordered phases:

| Phase | Outcome | Commit |
| --- | --- | --- |
| 1 | Canonical Tier Instance schema | `d78e173` |
| 2 | Lossless global Tier lift to deterministic `ti_primary` | `ddb4bbd` |
| 3 | Tier assignment ledger and authority | `c8a24d6` |
| 4 | Instance-scoped Tier mutations and lifecycle guards | `e9a7b29` |
| 5 | Package-owned Tier Instance tool and assignment management | `8aa452c` |
| 6 | Package Family creation re-host and optional-capability flow | `a711eae` |
| 7 | Exact Family workspace assignment resolution | `90f5de0` |
| 8 | Assignment-resolved public Tier projection | `47214b6` |
| 9 | Legacy compatibility retirement and final invariant matrix | `7e90898` |

Follow-on refinements integrated guided Tier setup, theme correctness, customer-pricing guidance, and first-use UX without changing the model (`caefb9e`, `194923d`, `3032ea5`, `687929c`, and `2e6ee7f`).

History 011 and 012 introduced and repaired the earlier Package Family creation composition. Reverts `47fa2e9` and `edb5957` later removed that implementation, while `39d8a3c` restored the lower deck's read lanes. This milestone re-hosted Family creation inside the Package Station peer and changed the earlier automatic completion behaviour: the Family saves independently, then Tier creation and assignment are separate, optional, explicit acts.

The former consumer-on-instance proposal was rejected because a usage relationship is not instance identity or storage ownership. Storing a Family consumer inside an instance would couple otherwise independent peer lifecycles, make neutral/unassigned instances difficult to represent, invite inferred ownership from provenance, and allow either peer's sanitiser to represent the other. One proven relationship did not justify a generic capability activation framework.

## Final Architecture

```text
Service source relationship → Package Family
                              ↕ explicit tier_assignments[] row
                         Tier Instance in tier_instances[]
                              ↓ ready public projection
                         Cost Builder consumer
```

`tier_instances[]` is the canonical collection. Each instance owns its stable `ti_…` identity, title, status, Rate Sheet allow-list, five fixed slots, occupant identities and lifecycle, bin, and popular-Tier state. A legacy top-level Tier set is lifted in memory to `ti_primary` without writing, reminting identities, or inferring an assignment. The first real `saveStation` mutation lifts before atomically pruning the retired top-level `tiers`, `occupant_bin`, `popular_tier`, and `popular_label` keys.

`tier_assignments[]` is the sole Family-to-instance relationship. Each row contains only `assignment_id`, `consumer_type`, `consumer_id`, and `tier_instance_id`. Removing a row preserves both peers. Editing an instance never edits its Family; editing a Family never edits its instance.

Public resolution follows Service source → one active Family → one explicit assignment → one ready instance. Missing, null, inactive, dangling, unready, expired, or ambiguous edges fail closed. There is no fallback to `ti_primary`, another Family's instance, provenance, or legacy pricing.

## Decisions and Invariants

- A Package Family without Tier capability is valid, publishable, operable, and deletable.
- Family and Tier Instance are peers; neither is a child storage envelope of the other.
- Slot identity and `occ_…` occupant identity remain distinct and stable.
- Rate Sheet row identity remains `(rate_sheet_id, item_id)` across projection and calculation.
- All Tier reads and mutations require an explicit `tier-instances/{instance}` route identity.
- All 11 temporary unscoped Tier read, lifecycle, bin, and popular routes were retired; the two Package Manager routes remain.
- Cost Builder remains an ordinary read consumer of the Package-owned public projection. It gained no assignment, Family, pricing, quote, or PDF authority, and established quote/PDF arithmetic was not redesigned.
- KAIROS, APTOS, and OMNIA are runtime validation scenarios, not architectural authorities.

## Validation

The final `tier-capability-invariants.php` matrix ran 13 focused PHP behavioural contracts in isolated processes and verified canonical storage, migration preservation and failure atomicity, independent peers, occupant identity, lifecycle/bin/draft/allow-list guards, optional Families, public fail-closed resolution, schema separation, absence of a generic capability framework, Station Manager neutrality, canonical routes, and legacy-route retirement. The route baseline passed with 64 routes after exactly 11 removals. Package Family, Tier workspace, Tier instance, Rate Sheet, occupant-admin, and Cost Builder isolation contracts passed, as did PHP/TypeScript pricing parity, PHP syntax checks, TypeScript compilation, the production build, documentation checks, and whitespace validation.

## Deferred Work

Production runtime acceptance remains an operational post-deployment activity. KAIROS, APTOS, and an intentionally unassigned OMNIA scenario must verify isolation, edit/settle/reload behaviour, bin and popular independence, optional Family creation/removal, public projection, and hard-refresh persistence against the deployed code. Deployment snapshots and rollback operations remain outside the codebase. A dedicated legacy XLSX Import Station requires its own later approved blueprint; Cost Builder remains the current import host until that separate milestone.

## Related History

[003 — Family-First Workspace (Phase 2)](003-family-first-workspace.md), [011 — Package Tier Workspace Lower Deck and Rate Sheet Row Drawer](011-package-tier-workspace-lower-deck.md), and [012 — Package Tier Workspace Product Repair](012-package-tier-workspace-product-repair.md).
