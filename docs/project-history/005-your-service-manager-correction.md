# Your Service Manager — Dashboard and Drawer Architecture Correction

## Date

2026-07-15

## Scope

Admin frontend composition for Service Catalog, Package Manager, relation-provider workspaces, and action drawers. The correction changed no PHP schema, REST contract, persistence authority, or downstream Cost Builder/Quote Builder behavior.

## Goal

Correct the Phase 1–3 surface placement so the Service Catalog becomes the primary family-first operational dashboard, while Packages remains a separate presentation surface. The intended interaction follows a Rippling-style pattern: the dashboard is the reading surface, selecting one record opens one first-level drawer, and closing returns to the still-mounted dashboard state. A full manager must never open inside another drawer.

## What Changed

- `ServiceCatalogWorkstation` became **Your Service Manager**. It resolves the existing compatibility host and renders Package Category Group family cards plus Details, Connections, and Settings through the existing Package-provider coordinator.
- Details now presents **Your Services** with Package Category Group, Service Category, and status filters. Service View/Edit actions open the canonical Service drawer; Edit starts in the Service Overview editor.
- Connections reuses the provider relationship projection for Features, Common Questions, Attention, state, derived availability, and source health. Each row opens a focused Connection drawer.
- Settings reuses the existing Commercial Group and Rate Sheet projections. Commercial Group membership and individual Rate Sheet rows now use focused drawers; Price Settings is an explicit audit-only drawer because no persistence schema exists.
- Category Group create/edit actions use focused first-level drawers and the existing Category Group lifecycle endpoints.
- Manager-owned drawer edits patch the mounted Package provider draft. The page-level Save remains the single atomic `savePackageStationManager` commit; a drawer cannot silently persist unrelated manager changes.
- The Service drawer's **Open Station Manager** action, `StationManagerStep`, and its nested portal overlay were removed.
- Drawer builders were split by ownership: canonical Service actions live in `serviceDrawerConfig.ts`, focused manager actions in `serviceManagerDrawers.tsx`, and Tier/Promotion actions in `packageManagerDrawers.ts`.
- `PackageManagerWorkstation`, labelled **Packages**, now renders only supported Package Tier cards and Promotions. Service supply, family assignment, connections, Commercial Groups, and Rate Sheet configuration cannot render there.

## Final Architecture

`AdminShell` owns one `ActionShell`. `ServiceCatalogWorkstation` stays mounted behind it and adapts manager dirty-state, footer, and guarded navigation through `usePageManagerShell`. `DynamicStationManager` requires one of two explicit compositions:

- `service-catalog`: family cards; Services; source connections; Commercial Groups; Rate Sheet.
- `packages`: Package Tier presentation and Promotions only.

The relation coordinator and Package provider remain the draft/validation boundary. `PackageRepository` remains persistence authority. Service content remains owned by the Service Catalogue and edited through `useServiceStation`.

## Decisions and Invariants

- Dashboard placement never transfers persistence ownership.
- Package Category Group membership remains on Package-owned source relationships, never Service records.
- Service Inclusions and FAQs remain Service-owned and are not copied into manager data.
- `sourceServiceId` remains live read-model provenance and is never persisted on rows.
- Derived source health and availability remain read-only.
- All Groups and Ungrouped remain reachable family scopes.
- Manager-owned drawer Save means apply to the current draft; page Save performs persistence.
- Packages does not configure Service supply or Rate Sheet state.
- Commercial Group descriptions, persisted Price Settings, and group-registry unification require later schema approval.

## Validation

Each phase passed `tsc --noEmit`, a production Vite build, `git diff --check`, Code Map word limits, canonical link checks, and focused source searches for surface boundaries and removed nested-manager routes. The working tree was clean after commits `33919da`, `7af1ba9`, `dde97dc`, and `ae8b44b`. No push occurred.

## Deferred Work

- Add Commercial Group descriptions only through an approved additive schema change.
- Design persisted Price Settings before exposing writable currency, tax, billing-cycle, rounding, or pricing-note controls.
- Unify relationship Groups and Rate Sheet groups only through a deliberate migration with downstream review.
- Future subscriptions, recurring offers, bundles, and CRM capabilities belong to later Packages milestones and were not introduced here.

## Related History

- [Package Manager Top-Level Workstation](002-package-manager-workstation.md)
- [Family-First Workspace](003-family-first-workspace.md)
- [Workspace Tab and Section Consolidation](004-workspace-tab-consolidation.md)
- [Package Category Groups v1](PackageCategoryGroups-v1.md)
