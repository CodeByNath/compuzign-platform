# Workspace Tab and Section Consolidation (Phase 3)

## Date

2026-07-14

## Scope

Admin frontend only, within the relations folder: the Package Manager workspace's tab and section layout was consolidated. No provider, schema, repository, REST, persistence, pricing, navigation, or ownership changes occurred.

## Goal

Reduce the Package Manager workspace to a composition that matches how the surface is actually used, following the [family-first workspace (Phase 2)](003-family-first-workspace.md). Empty placeholder tabs are gone, related concerns are grouped, and the same layout serves both hosts (workstation page and legacy drawer entry).

## What Changed

- **Final composition.** The package workspace now has exactly three sub-tabs: **Details**, **Connections**, and **Settings**.
- **Connections.** The relationship table (source relationships with their Attention state) was promoted from its previous placement to the Connections tab as its primary content.
- **Settings.** The Commercial Groups section (Package Category Groups lifecycle section) moved into Settings. The Rate Sheet also lives in Settings, retained with unchanged ownership, provenance (`sourceServiceId` read-model semantics), filtering (`RateSheetFilterState` seeded by workspace scope), validation, and save path.
- **Removed tabs.** The empty Service and Promotion sub-tabs of the package workspace were removed; they carried no content and duplicated destinations that exist elsewhere.
- **Valid-tab handling.** Tab membership per workspace is declared once in `WORKSPACE_SUB_TABS` inside `DynamicStationManager.tsx`; when the active sub-tab is not valid for the active workspace, the manager falls back to Details dynamically, and the sub-tab strip renders only when a workspace has more than one tab.
- **Editor extraction.** The Rate Sheet editing surface was extracted into `resources/ts/components/admin/relations/PackageRateSheetEditor.tsx`. The extraction is structural only: the editor continues to consume the same coordinator draft, controls, and filter exports as before.
- **Unchanged foundations.** Coordinator state, provider projections, lifecycle controls (the shared exports from `PackageCategoryGroupsSection.tsx`), and all authority boundaries are exactly as they were after Phase 2. The Attention filter is preserved through the existing provider projection with no duplicated logic.

## Final Architecture

`DynamicStationManager.tsx` composes the package workspace as Details / Connections / Settings, with tab validity governed solely by `WORKSPACE_SUB_TABS`. Details carries the connected-Services table and family scope; Connections carries the relationship table; Settings carries Commercial Groups and the Rate Sheet, the latter rendered through `PackageRateSheetEditor.tsx`. Both hosts — the top-level Package Manager workstation and the preserved nested drawer entry — receive this same consolidated layout, confirmed by inspection of the shared manager component that both hosts render.

## Decisions and Invariants

- No provider, schema, repository, REST, persistence, pricing, navigation, or ownership changes are part of this milestone.
- Relocated components (relationship table, Commercial Groups, Rate Sheet) continue to use the same coordinator draft and controls they used before relocation; moving a section never forks its state.
- `PackageRateSheetEditor.tsx` is a structural extraction only — no behavioral, validation, or save-path changes ride along with it.
- Tab membership is declared only in `WORKSPACE_SUB_TABS`; invalid active tabs resolve to Details rather than erroring or persisting stale selection.
- The Attention filter remains a single implementation in the provider projection; no surface reimplements it.
- Package Manager remains the single authority for package configuration; the Services → Package Manager → Rate Sheet → Tiers → Cost Builder → Quote Builder chain is unchanged.

## Validation

`tsc --noEmit` clean; `vite build` clean (tracked `dist/` regenerated). Contracts pass: manager-coordinator, package-relation-provider, active-package-read-only, and tier-pricing-parity. `git diff --check` clean. Host parity (workstation and legacy drawer receiving the identical consolidated layout) was verified by source inspection of the shared `DynamicStationManager` composition; the WordPress runtime is hosted remotely, so local validation is static by project convention.

## Deferred Work

- Phase 4 navigation cleanup.
- Optional Phase 5 Price Settings.

## Related History

[Family-First Workspace (Phase 2)](003-family-first-workspace.md) — the scoped workspace this composition consolidates. [Package Manager Top-Level Workstation (Phase 1)](002-package-manager-workstation.md) — the workstation host that shares this layout with the legacy drawer entry.
