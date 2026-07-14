# Package Manager Top-Level Workstation (Phase 1)

## Date

2026-07-14

## Scope

Admin frontend only: the workstation registry, admin shell navigation, and the relations folder that hosts Station Manager. No PHP, persistence, provider, schema, endpoint, or ownership changes.

## Goal

Make Package Manager a first-class admin destination. Before this milestone, the Station Manager — the only surface for connected Services, source relationships, the Rate Sheet, Package tiers, and Promotions — was reachable solely through a nested chain: Service Catalog → Service drawer → Connections tab → Station Manager drawer, with further editors stacked as portal overlays. This milestone re-hosts the existing manager on a top-level page without duplicating any of its state, providers, or persistence, as Phase 1 of the approved plan to make Package/Station Manager the primary operational workspace.

## What Changed

- **Workstation registration.** A `package-manager` entry joined the Catalog group in `resources/ts/components/admin/schema/workstations.ts`, with a matching `WorkstationId` member and a cube nav glyph. The sidebar now opens Package Manager directly.
- **Page host.** New `resources/ts/components/admin/workstations/PackageManagerWorkstation.tsx` renders the unchanged `DynamicStationManager` inside the standard `Workstation` shell. It assembles dependencies with the same `useAdminCatalog` and `useSurfacePackages` hooks the Service Catalog uses, creating no new loading paths.
- **Compatibility host resolution.** The Package Station is the single global `cz_package_station` option, but its REST family is addressed as `admin/services/{id}/package-station/…`, where the backend only validates that the id names an existing Service post. The workstation resolves this host id from loaded data — the first Package's first `service_ref`, else the first catalogue Service — and shows an explanatory empty state when no Services exist.
- **Shared drawer extraction.** New `resources/ts/components/admin/relations/stationManagerDrawers.ts` owns the Promotion, Service Detail, and Package Tier `ActionConfig` builders previously assembled inline in `StationManagerStep`. Both hosts consume the same builders; hosts only decide where the config renders.
- **Page-level shell adapter.** `DynamicStationManager` now exports its `ManagerShellContext` type (a five-member `Pick` of the drawer `StepContext`). The workstation implements it with `usePageManagerShell`: the Save/Cancel footer renders in a sticky page footer, and the exit-guard / deferred-continuation semantics mirror `ActionShell`'s `requestExit` / `confirmPendingExit` / `cancelPendingExit`.
- **Navigation interception.** `WorkstationSurfaceProps` gained an optional `setNavigationInterceptor`; `AdminShell` routes sidebar workstation switches through the registered interceptor. With unsaved manager drafts, the manager's own "Unsaved Manager changes" dialog appears — Discard resets drafts and resumes the stored navigation; Keep editing cancels it. The interceptor clears on surface unmount, so a stale guard can never block another workstation.
- **First-level editors.** From the workstation, Service Detail, Package Tier, and Promotion drawers open through AdminShell's single `ActionShell` — one drawer over the page rather than portal stacks. Drawer completion refetches the catalogue while the manager stays mounted, preserving drafts.

## Final Architecture

Two hosts now supply the same service-scoped connection graph to `DynamicStationManager`: the preserved Station Manager drawer (`StationManagerStep`, unchanged behavior including `manager-wide` panel mode and portal overlays) and the Package Manager workstation page. Providers, the coordinator, `usePackageStation`, `PackageRepository`, and all admin REST contracts are untouched. The authority chain Service Catalogue → Package Manager → Rate Sheet → Tiers → Cost Builder → Quote Builder is unchanged.

## Decisions and Invariants

- The workstation is a host, not a new authority: coordinator state is per-mount, saves remain whole-draft provider saves, and Service editing still occurs only in the canonical Service drawer.
- Drawer configs live in `stationManagerDrawers.ts`; hosts must not re-inline them.
- The compat host-Service id is a routing detail resolved from loaded data; nothing may persist it as workstation state or treat it as ownership.
- Navigation guarding is a generic surface capability (`setNavigationInterceptor`), not a Package Manager special case.

## Validation

`tsc --noEmit` clean; `vite build` clean (tracked `dist/` regenerated); manager-coordinator, package-relation-provider, tier-occupant-admin, and active-package-read-only contracts all pass; `git diff --check` clean. Drawer navigation and dirty-state guarding were verified statically — the WordPress runtime is hosted remotely, so local validation is static by project convention.

## Deferred Work

- Known temporary quirk: a Service drawer opened from the workstation still offers "Open Station Manager", which opens the drawer-hosted manager above the page-hosted one. Each mounts independent per-mount coordinator state, so it is safe but redundant; Phase 4 retires the nested entry in favor of cross-workstation navigation.
- Family (Package Category Group) cards as workspace scope, tab/section reorganization, and Price Settings remain later phases of the approved roadmap.

## Related History

[Package Category Groups v1](PackageCategoryGroups-v1.md) — the commercial group station this workspace will later scope by.
