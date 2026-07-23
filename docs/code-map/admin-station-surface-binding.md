# Admin Station Surface Binding

The dynamic station/placement → presentation projection engine. It composes live walls without shell-level entity branching.

Roots: `wp-content/plugins/compuzign-platform/resources/ts/station-manager/` for coordination and `resources/ts/admin-station/register.ts` for presentation policy.

## Runtime chain

```text
active station + placement
  → StationPresentationShell (one per Home)
  → resolveSurfaceBindings() returns walls sorted by declared order
  → StationSurfaceHost resolves dataSourceKey + templateKitKey
  → read hook supplies { items, loading, error, refetch }
  → kit emits native-identity actions
  → shell dispatches intent + that wall's refetch handle
  → registered drawer adapter
```

Bindings declare numeric `order`; the resolver uses a stable sort. Service Home presents Package Families (`0`) then the Service Catalogue (`1`). The **Packages** station is led by the Tier tool (`0`, wall title **Tier Workspace Engine**), registered once as `surfaceId: 'tier-tool'`, `dataSourceKey: 'package-tier-workspace'`, `templateKitKey: 'tier-workspace'`, and `drawerTemplateKey: 'tier'`. No Package Families card wall is bound here: the Tier tool owns its Family group (transient selector plus read-only authoritative summary), so Family is engine scope rather than a preceding wall. The Families source, kit, and drawer remain registered for Service Home. Tool availability is a station-level binding row, never per-Family or persisted; future tools add rows. The former Category carousel, Service cards, and Package Tier wall remain registered but unbound.

## Authoritative files

- `station-manager/registry/surfaceBindings.ts` — binding registration, stable order-sorted resolution, and default-home accessors.
- `admin-station/register.ts` — Admin-authored binding rows, conditions, template/drawer keys, and default Home; it also registers Admin's own presentation capabilities.
- `service-station/register.ts` and `package-station/register.ts` — peer-owned navigation, destinations, sources, kits, and drawers.
- `admin-station/presentation/StationPresentationShell.tsx` — the ordered section loop and titled presentation chrome.
- `station-manager/registry/{dataSources,templateKits}.ts` — source and kit registration/resolution contracts.
- `station-manager/recordIdentity.ts` — zero-dependency `StationRecordId = string | number`.
- `station-manager/StationSurfaceHost.tsx` — generic resolver-backed source/kit composer.
- `station-manager/useRetainedCollection.ts` — wall-local stale-while-revalidate behavior.
- `station-manager/registry/boot.ts` — locks registries and validates binding source/kit resolution before mount.
- `shell/AdminStationBody.tsx` — activates the station, hands one presentation shell to the Home, and forwards intents to the drawer.

## Invariants

- The shell never branches on entity; adding a wall changes a binding plus a real source/kit registration.
- Section sequence is the binding's declared `order`, never array position alone; the stable sort keeps registration order as the only tie-breaker.
- The Home renders exactly one presentation shell per active station; sections are never separate competing presentation regions.
- A source hook is stable per mounted host; the host key includes its `dataSourceKey`.
- Refresh is structural and targeted: the opening wall supplies the only refetch handle invoked after mutation.
- Record ids remain native. Package Family and Tier ids are strings; Category and Service ids are numbers. The host neither parses nor coerces them.
- Bindings import no Command Centre runtime module.
- Only surfaces with real sources and kits are bound. Registered but unbound sources remain reusable.

## Drawer boundary

`ResolvedStationIntent` carries the native `recordId`, resolved intent, and `drawerTemplateKey` into the shared [Admin Station Drawer](admin-station-drawer.md). Action-to-tab mapping lives in binding `actionIntents`; the deleted `categoryGroupDrawer.ts` seam must not return.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station](admin-station.md), [Navigation](admin-station-navigation.md), [Cards](admin-station-cards.md), and [Drawer](admin-station-drawer.md).
