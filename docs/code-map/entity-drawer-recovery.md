# Entity Drawer Recovery

The **neutral, host-agnostic Service and Tier drawer compositions**, extracted from the former `ServiceViewStep` / `ServiceTierStep` god files, and the host seam that lets any drawer host mount them. This is the "finish the Station separation" work: the mature drawer presentation is owned by the entity, not by either host — and **both hosts now mount it**.

Roots:
- `wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/` — the generic renderer kit
- `wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/` — the Service and Tier compositions

## The layers

```
Old Command Centre host (ActionShell / StepContext)      New Admin Station host (drawer shell)
  → ServiceViewStep / ServiceTierStep                      → ServiceDrawerHost / TierDrawerHost
      (thin adapter: StepContext → bridge)                     (thin adapter: DrawerContentProps → bridge)
            ↘                                             ↙
              → EntityDrawerHostBridge
                → ServiceDrawerContent / TierDrawerContent   (neutral composition, no host import)
                  → useServiceStation / usePackageStation     (authoritative state + mutation)
                    → module REST endpoints
```

Both hosts mount the **same** composition through a thin adapter. Neither owns the drawer.

## Authoritative files

- `drawer-kit/entityDrawerHost.ts` — **`EntityDrawerHostBridge`**: `{ close; setFooter(node); setCloseGuard(guard|null); onMutationComplete? }`. The whole host seam. Names no host, no entity.
- `drawer-kit/` — the generic renderer kit, importable by both bundles: `EntityDrawer`, `DrawerTabs`, `ReadBlock`, `InlineEditorShell`, `ActionFooter`, `ui/*`, `utils/{moduleNotifications,moduleStatus}`, and `schema/{types,icons,modeContext,presentation,elements,shells}`. Its only outbound imports are type-only, to neutral modules — no host, no routing, no mutation authority. `ManagerEntityRef` / `StationConnectionDescriptor` are declared here (because `ShellBinding` carries the descriptor) and re-exported by `components/admin/relations/types.ts`.
- `entity-drawers/service/` — the neutral Service composition:
  - `ServiceDrawerContent.tsx` — assembles `EntityDrawer` (Overview/Inclusions/FAQs modules, status pills, notification panels, module footers), the Connections Pricing Summary, and the in-place module editors. Imports neither host. Publishes the footer through the bridge.
  - `useServiceDrawerController.ts` — record identity, the **module-level** edit state machine (one module editing, others readable), drafts/dirty, save/cancel/discard, lifecycle (toggle/settle/publish/archive/trash), and the guarded exit (unsaved / pending / new-never-published). Coordinates `useServiceStation`; **renders no JSX**.
  - `ServiceDrawerFooter.tsx`, `ServiceDrawerDialogs.tsx` — record footer + confirm/exit modals (pure presentation). `serviceDrawerTypes.ts` — content props.
  - `serviceSeed.ts` — `buildServiceItemForStationHandoff` / `normalizeAdminCategories`, the drawer's INPUT adapters. Shared, so both hosts build the same seed; `ServiceCatalogStation` re-exports them for its own consumers.
- `entity-drawers/tier/` — the neutral Tier composition, same shape plus the two-level nav (package overview ↔ individual tier) and occupant/bin travel: `TierDrawerContent.tsx`, `useTierDrawerController.ts` (archive/restore-with-swap·retarget·pending-drafts/trash/delete, popular-tier, enable-disable, guarded exit — no JSX), `TierDrawerFooter.tsx`, `TierBinList.tsx`, `TierDrawerDialogs.tsx`, `tierDrawerTypes.ts`.
- `entity-drawers/{schema,editors,shared}/` — the Service and Tier entity manifests, bindings, tables, the six module editors, and `serviceDrawerShared` / `tierOccupants`.

### The two host adapters

- `components/admin/stations/ServiceViewStep.tsx` (55 lines, was ~1035) / `ServiceTierStep.tsx` (49 lines, was ~1040) — read the StepContext handoff, build the bridge (`ctx.setFooter`/`setCloseGuard`/`close`/`onRefresh`), mount the composition. `ServiceViewStep` keeps the `decodeHtml`/`TIER_KEYS`/`TIER_LABELS` re-exports.
- `admin-station/stations/serviceSurface/ServiceDrawerHost.tsx` / `tierSurface/TierDrawerHost.tsx` — map `DrawerContentProps` onto the same bridge (`close = onClose`, `onMutationComplete = onSaved`). Service resolves its numeric `recordId` against the catalogue and builds the seed; Tier passes the card's `occupant_id` through as `initialOccupantId` and lets the composition re-resolve the slot.

## Bundle boundary — resolved

`admin` and `admin-station` remain separate Rollup entry points, and `admin-station` still imports **no** `components/admin` file (verified: the admin-station entry's module closure contains zero). The boundary was resolved by **moving** the shared code out of `components/admin` rather than by duplicating it:

- the generic kit → `drawer-kit/`
- the Service/Tier compositions and manifests → `entity-drawers/`

Both bundles import the same modules, so Rollup emits them as **one shared chunk** that `admin.js` and `admin-station.js` both reference. There is one implementation, not a fork.

The Command Centre's own entity manifests (Category, Promotion, Category Group) and `schema/stations.ts` (which imports `ActionShell` and every station — Command Centre routing) deliberately stayed behind.

**Stylesheet:** the drawer's CSS was likewise moved out of `admin.css` into `resources/css/modules/drawer-kit.css`, its own build entry (`dist/css/drawer-kit.css`), registered once in `Core/AssetLoader.php` and declared a dependency of both page stylesheets. It carries the `--admin-*` token block, whose selector was widened to `.cz-admin-root, .cz-admin-station` — the drawer rules read those tokens and they were previously scoped to the Command Centre root only.

## Registered in the Admin Station

`service` and `tier` are registered in the drawer template registry alongside `package-family`, each with `supportedModes: ['view','edit']`, and each has a card wall bound to it in `surfaceBindings.ts` (`services` via `useServiceCards`, `service-tiers` via `useServiceTierCards`). See [Admin Station Drawer](admin-station-drawer.md).

Tier identity is the **`occupant_id`**, never the tier slot name — a slot is a position and a bin swap/retarget can reassign it. The drawer re-resolves the slot from the occupant once the station loads.

## Remaining work

- **Do not delete** the old-host adapters until the old Command Centre route is retired.
- Refactor `PackageFamilyDrawerContent` onto the shared primitives — it is still the hand-built parallel UI it had to be before the kit was reachable. Package Family is otherwise untouched and works as before.
- The Tier wall resolves ONE host service (first service referenced by the first surface package, else the first catalogue row — the Command Centre's own rule, reused by `useHostService`). A multi-service tier surface needs a real scope, not a wider default.
- **Not yet verified in a browser.** There is no WordPress runtime in this environment; rendering, cascade-order effects, and the drawer's appearance inside the Admin Station shell need a visual pass.

## Invariants

Controllers render no JSX. Presentation modules make no API calls. Authoritative mutation stays in `useServiceStation` / `usePackageStation`. Module-level editing is preserved (never replaced by a global drawer edit mode). Stable native ids flow end-to-end, unconverted. The Admin Station shell and drawer controller still name no entity.

## Related Code Maps

[Drawer and Station System](drawer-system.md), [Admin Station Drawer](admin-station-drawer.md), [Service Catalogue](service-catalogue.md), [Tiers](tiers.md), [Package Manager](package-manager.md).
