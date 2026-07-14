# Service Connections

## Purpose

Defines the provider-neutral graph used by a Service drawer to discover, display, and manage connected packages and promotions.

## Ownership

The relation registry owns provider discovery and the coordinator owns transient multi-provider drafts. Each provider owns its read model, validation, and save operation. The Service drawer only supplies station context; it must not implement provider-specific persistence.

## Main Entry Points

- [registry.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/registry.ts) registers relation providers and resolves those applicable to a station scope. Use it when adding a provider or changing discovery rules.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/types.ts) defines station scopes, connection descriptors, provider sections, summaries, and continuations. Use it when changing the provider contract.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) renders the Family Card scope strip, provider tabs/workspaces, Rate Sheet forms, validation summaries, Save controls, and dirty-exit confirmation. Use it for connection-manager runtime UI. The relations projection row carries optional `sourceServiceId` provenance so the workspace can scope rows by Package Category Group.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns read models, drafts, selection, dirty state, validation aggregation, and save results. Use it for provider-neutral state transitions.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) supplies writable Package sections, Rate Sheet rules, summaries, and Tier continuations. Use it for Package connection behavior.
- [promotion.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/promotion.ts) supplies Promotion cards, create/edit state, validation, saves, and drawer continuations. Use it for Promotion connection behavior.
- [active-package-read-only.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/active-package-read-only.ts) exposes active Package projections without mutation methods. Use it for read-only consumers.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Coordination | `SECTION: MANAGER_COORDINATION` | Provider reads, drafts, validation, saves | Changing manager state |
| Rate Sheet | `SECTION: RATE_SHEET_EDITOR` | Save/validation; editor in `PackageRateSheetEditor.tsx` | Changing Rate Sheet UI |
| Services | `SECTION: SERVICE_WORKSPACE` | Assignments and Category Groups | Changing Service connections |
| Packages | `SECTION: PACKAGE_WORKSPACE` | Tiers, Connections relationships, Settings (Groups + Rate Sheet) | Changing Package workspace |
| Promotions | `SECTION: PROMOTION_WORKSPACE` | Promotion provider surface | Changing Promotion workspace |
| Render | `SECTION: MANAGER_RENDER` | Tabs, actions, guards, composition | Changing manager UI |
| Package draft | `SECTION: PACKAGE_DRAFT` | Decisions and dirty comparison | Changing provider drafts |
| Groups | `SECTION: PACKAGE_GROUPS` | Group lifecycle and ordering | Changing relationship Groups |
| Service connections | `SECTION: SERVICE_CONNECTIONS` | Connect and Group assignment | Changing source assignment |
| Provider | `SECTION: PACKAGE_PROVIDER` | Read, validate, save, continuations | Changing provider behavior |

## Runtime Flow

Two hosts supply a service scope: `ServiceViewStep` via the Station Manager drawer, and the top-level [PackageManagerWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/PackageManagerWorkstation.tsx) page (which adapts the exported `ManagerShellContext` to a page footer and navigation guard). The registry resolves providers; `DynamicStationManager` coordinates their drafts, validation, saves, workspaces, continuations, and exit guards. Shared drawer configs live in [stationManagerDrawers.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/stationManagerDrawers.ts). Providers retain persistence authority.

## Validation

- [package-relation-provider-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/package-relation-provider-contract.ts)
- [manager-coordinator-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/manager-coordinator-contract.ts)
- [active-package-read-only-provider-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/active-package-read-only-provider-contract.ts)

## Related Code Maps

[Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), and [Promotions](promotions.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — the Package Category Group station hosted on this surface: assignment model and dependency guards.
