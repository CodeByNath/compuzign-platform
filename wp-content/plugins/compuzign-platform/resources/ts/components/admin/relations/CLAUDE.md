# Admin Relations Boundary

Global policy is defined by [AGENTS.md](../../../../../../../../AGENTS.md).

## Ownership and entry points

This folder owns Command Centre relation-provider discovery, provider-neutral coordination, Package/Promotion providers, Package Family scope, Rate Sheet configuration, and focused manager drawer configs.

- `registry.ts` / `coordinator.ts` — provider discovery and neutral draft coordination.
- `DynamicStationManager.tsx` — Service/Package/Promotion workspace host.
- `providers/` — domain adaptation and save boundaries.
- `serviceManagerDrawers.tsx` / `packageManagerDrawers.ts` — focused manager-owned drawer configs.
- `usePageManagerShell.tsx` — page footer and dirty-navigation adapter.

## Boundaries

This is a Command Centre host, not shared drawer authority. Package Family, Category, Service, and Tier presentation belongs in `entity-drawers/` and generic rendering in `drawer-kit/`; do not fork those capabilities here or into Admin Station. Providers adapt and save through authoritative hooks/controllers; they do not create parallel Package persistence or endpoint contracts. Preserve `occupant_id` as UI identity and resolve it to `slotId` only at Tier mutation boundaries.

Read [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Tiers](../../../../../../../../docs/code-map/tiers.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
