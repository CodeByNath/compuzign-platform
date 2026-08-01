# Admin Station Drawer

Admin Station owns one entity-agnostic drawer shell. Station Manager resolves registrations; the owning Station supplies its adapter, composition, state, validation, and saves. Hosting never transfers authority.

## Registration and runtime

`drawerTypes.ts` defines key, native identity, mode, optional size, and shell bridge. `drawerTemplates.ts` registers contracts and rejects duplicate keys or empty modes. Unknown keys resolve to the shell's neutral unavailable state.

Registration ownership is:

| Key | Registrar | Host / composition owner | Size | Modes |
| --- | --- | --- | --- | --- |
| `category` | Admin Station | Admin Category host adapter / neutral Category drawer | normal | view, edit |
| `service` | Service Station | Service Station | normal | view, edit |
| `package-family` | Package Station | Package Station | normal | view, edit |
| `tier` | Package Station | Package Station | normal | view, edit |
| `tier-inclusion` | Package Station | Package Station | normal | view, edit |
| `rate-sheet` | Package Station | Package Station | extra-wide | view, edit |
| `tier-rate-sheet` | Package Station | Package Station | extra-wide | view, edit |
| `tier-rate-sheet-group` | Package Station | Package Station | wide | view, edit |

`DrawerMode` is `'view' | 'edit'`; there is no `create` mode. Family, Service, Category use a stable `'new'` sentinel, while Tier uses its registration address. Each resolves to `null`, never a fabricated identity, and its station holds pending state locally. Service Overview Save creates and hands off its Pending record; child actions stay locked until then, and Publish later settles and activates it.

## Drawer size

`DrawerSize` is `'normal' | 'wide' | 'extra-wide'`, declared by each registration. `AdminStationDrawer` turns it into a CSS modifier; the generic shell never branches on entity type, and wide drawers still yield to the viewport.

The runtime chain is:

```text
kit action with native record id
  → StationSurfaceHost resolves binding action intent
  → AdminStationDrawerContext stores key, id, mode, and wall refetch
  → AdminStationDrawer resolves the registered contract
  → owning Station adapter resolves its record
  → owning composition renders and mutates
  → onSaved refreshes only the originating wall
```

`shell/drawer/AdminStationDrawer.tsx` owns chrome, close guards, scroll lock, focus restoration, and the optional footer. It never switches on entity type.

`AdminStationDrawerContext.tsx` keeps one open drawer and preserves identity across mode changes. Closing clears both state and the originating-wall refetch handle; a late save then cannot refresh a wall the user has left.

## Owning compositions

- `admin-station/stations/serviceCategory/CategoryDrawerHost.tsx` mounts the Category composition and uses numeric Category identity, or the stable `'new'` sentinel resolved to `category: null`, and mounts the SAME composition either way.
- `service-station/surface/ServiceDrawerHost.tsx` mounts the Service composition and uses numeric Service identity, or the stable `'new'` sentinel resolved to `service: null`, and mounts the SAME composition either way.
- `package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx` resolves string `group_id`, or the stable `'new'` sentinel to a local empty record, and mounts the SAME Package Family composition either way.
- `package-station/surface/tierSurface/TierDrawerHost.tsx` resolves stable string `occupant_id`, whole-instance, fixed-slot, and Tier registration identities, and rejects foreign identity shapes.

Each composition uses the shared `drawer-kit`; Category, Service, Package Family, and Tier writes remain in their owning hooks. Presentation components call no endpoints.

## Invariants

- Record ids pass through without parsing, stringification, or numeric coercion.
- The generic shell never saves domain data directly.
- Drawer registrations are capabilities; Admin's surface policy chooses which key a bound action opens.
- Module editing replaces only the active module; sibling modules remain readable.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md), [Cards](admin-station-cards.md), [Drawer System](drawer-system.md), [Entity Drawer Recovery](entity-drawer-recovery.md), and [Package Manager](package-manager.md).
