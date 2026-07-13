# Service Connections

## Purpose

Defines the provider-neutral graph used by a Service drawer to discover, display, and manage connected packages and promotions.

## Ownership

The relation registry owns provider discovery and the coordinator owns transient multi-provider drafts. Each provider owns its read model, validation, and save operation. The Service drawer only supplies station context; it must not implement provider-specific persistence.

## Main Entry Points

- [registry.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/registry.ts) registers relation providers and resolves those applicable to a station scope. Use it when adding a provider or changing discovery rules.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/types.ts) defines station scopes, connection descriptors, provider sections, summaries, and continuations. Use it when changing the provider contract.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) renders provider tabs/workspaces, Rate Sheet forms, validation summaries, Save controls, and dirty-exit confirmation. Use it for connection-manager runtime UI.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns read models, drafts, selection, dirty state, validation aggregation, and save results. Use it for provider-neutral state transitions.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) supplies writable Package sections, Rate Sheet rules, summaries, and Tier continuations. Use it for Package connection behavior.
- [promotion.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/promotion.ts) supplies Promotion cards, create/edit state, validation, saves, and drawer continuations. Use it for Promotion connection behavior.
- [active-package-read-only.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/active-package-read-only.ts) exposes active Package projections without mutation methods. Use it for read-only consumers.

## Runtime Flow

`ServiceViewStep` creates a service-scoped descriptor. The registry resolves applicable providers, then `DynamicStationManager` acts as the relation-manager composition root: it loads provider read models, coordinates provider selection/drafts/validation/save and exit guards, and renders provider-specific workspaces.

For the package provider the Service Connections sub-tab also hosts [PackageCategoryGroupsSection.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupsSection.tsx) — the Package Category Group station (create/lifecycle/guarded delete via `/admin/package-category-groups`); source relationships carry the `category_group_id` assignment set from the Services tab table.

The same component currently also owns Rate Sheet UI state: service-source loading, source picking, temporary and persisted groups, section editing, validation issues, and saves through the active provider adapter. It follows continuations into focused Package or Promotion drawers. Read-only consumers receive projections without write lifecycle methods. This Rate Sheet responsibility makes the manager a future separation candidate even though provider composition itself is legitimate here.

## Validation

- [package-relation-provider-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/package-relation-provider-contract.ts)
- [manager-coordinator-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/manager-coordinator-contract.ts)
- [active-package-read-only-provider-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/active-package-read-only-provider-contract.ts)

## Related Code Maps

[Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), and [Promotions](promotions.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — the Package Category Group station hosted on this surface: assignment model and dependency guards.
