# Family-First Workspace (Phase 2)

## Date

2026-07-14

## Scope

Admin frontend only, within the relations folder and its host: the Station Manager workspace gained Package Category Group scoping. No ownership, coordinator, repository, schema, persistence, endpoint, or response-shape changes occurred.

## Goal

Make Package Category Groups (KAIROS, APTOS, OMNIA, …) the orienting scope of the Package Manager workspace, following the [Phase 1 workstation re-hosting](002-package-manager-workstation.md). Users select a commercial family once and every workspace surface — connected Services, source relationships, Rate Sheet — filters to it, while unassigned sources remain fully visible and reachable.

## What Changed

- **Family Card strip.** New `resources/ts/components/admin/relations/PackageCategoryGroupCards.tsx`, rendered by `DynamicStationManager` above the workspace nav (marker `SECTION: FAMILY_SCOPE`). Each group card shows name, optional description, the saved read model's `dependents` metrics (connected Services, Rate Sheet rows, Tier selections), the shared status pill, and a lifecycle split action. The strip consumes the manager's existing group-registry state — it performs no fetch of its own.
- **Workspace scope.** `selectedCategoryGroupId` (`'all' | 'unassigned' | group_id`) lives in `DynamicStationManager`. **All Groups** and **Ungrouped** are first-class scope cards with connected-Service counts derived from the draft-preferred package sources.
- **Details.** `PackageServicesTable`'s existing Category Group dropdown became optionally controlled; the workspace passes the scope in and the dropdown writes it back, keeping cards and table bidirectionally in sync through the table's single pre-existing filter.
- **Connections.** Relationship rows are scoped by resolving each row's supplying Service through `assignmentByServiceId`, now exported from `PackageRateSheetFilters.tsx` instead of being reimplemented. The provider projection row gained one optional additive field, `sourceServiceId` (read-model provenance only, frontend contract in `relations/types.ts`). The Attention filter already existed in the provider projection and required no change.
- **Rate Sheet.** The workspace scope seeds the existing `RateSheetFilterState.categoryGroup`; the Rate Sheet's own dropdown can still refine locally. No second filter implementation.
- **Lifecycle reuse.** `PackageCategoryGroupsSection.tsx` now exports the single source of group lifecycle behavior — `currentGroupLifecycleOperations` (the draft/status/settled-overview visibility rules), `groupStatusPill`, `dependentsSummary`, and `PackageCategoryGroupConfirmDialog` — and its own split menu and trash confirmation were refactored to consume those same exports. The card strip uses them too, so the two surfaces cannot diverge. Card "Edit" hands off to the existing lifecycle station in Services → Connections; no new editors exist.
- **Fallback.** When the scoped group leaves the current registry (archived, trashed, or deleted), the workspace automatically falls back to All Groups.

## Final Architecture

The Station Manager workspace is now family-first in both hosts (workstation page and preserved drawer entry). Scope is presentation state inside `DynamicStationManager`; it flows exclusively through pre-existing filter mechanisms. Group lifecycle rules live in one exported implementation. Package, Service, Tier, and Promotion ownership, the coordinator, `PackageRepository`, PHP schemas, and all REST contracts are exactly as they were after Phase 1.

## Decisions and Invariants

- One Package Category Groups fetch feeds the strip: the manager's existing registry state. (The lifecycle station's own scoped current/archived/trash loading predates this milestone and is unchanged.)
- No duplicated filtering logic: Details uses the table's own filter, Connections and Rate Sheet share `assignmentByServiceId`, and the Rate Sheet keeps its `RateSheetFilterState`.
- No duplicated lifecycle implementation: visibility rules, status derivation, dependents summary, and destructive-action confirmation are single exported implementations shared by strip and section.
- No new editors: group create/edit remains in the existing lifecycle station; Service/Tier/Promotion editing remains in the existing drawers.
- `sourceServiceId` on the relations projection row is read-model provenance only and must never be persisted on rows.
- Card metrics are saved-state counts from `dependents`, not working-draft figures.
- All Groups and Ungrouped remain first-class scopes; a mandatory family selection must never hide unassigned sources.

## Validation

`tsc --noEmit` clean; `vite build` clean (tracked `dist/` regenerated). Contracts pass: manager-coordinator, package-relation-provider, active-package-read-only, and tier-pricing-parity. `git diff --check` clean. Scope wiring and fetch-count invariants were verified by source inspection; the WordPress runtime is hosted remotely, so local validation is static by project convention.

## Deferred Work

Deferred to later phases of the approved roadmap, identified only: tab and section consolidation (including Commercial Group placement), navigation cleanup and retirement of the nested Station Manager drawer entry, and Price Settings.

## Related History

[Package Manager Top-Level Workstation (Phase 1)](002-package-manager-workstation.md) — the page host this workspace scope builds on. [Package Category Groups v1](PackageCategoryGroups-v1.md) — the group station, dependents guards, and assignment model reused here.
