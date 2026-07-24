# Admin Station Drawer

Admin Station owns one entity-agnostic drawer shell. Station Manager resolves drawer registrations; the owning Station supplies the record adapter, mature drawer composition, domain state, validation, and saves. Hosting a drawer never transfers authority to Admin Station or Station Manager.

## Registration and runtime

`station-manager/drawerTypes.ts` defines the open string key, native record identity, opening mode, an optional declared panel `size`, and the shell/content bridge. `station-manager/registry/drawerTemplates.ts` registers contracts and rejects duplicate keys or empty supported-mode lists. Unknown keys intentionally resolve to `null`, allowing the shell to render its neutral unavailable state.

Registration ownership is:

| Key | Registrar | Host / composition owner | Size |
| --- | --- | --- | --- |
| `category` | Admin Station | retained Admin Category adapter / Category drawer | normal |
| `service` | Service Station | Service Station | normal |
| `package-family` | Package Station | Package Station | normal |
| `tier` | Package Station | Package Station | normal |
| `rate-sheet` | Package Station | Package Station | extra-wide |

## Drawer size

`DrawerSize` is `'normal' | 'wide' | 'extra-wide'`, declared per registration via the optional `size` field (omitted means `normal`, so every prior registration is unchanged). `AdminStationDrawer` reads the resolved template's size and appends a `cz-station-drawer--{size}` modifier; Admin Station's `admin-station.css` maps each modifier to a width at `min-width: 720px` (and a further step for `extra-wide` at `1200px`). This is generic Admin presentation: the shell never branches on entity or template key to choose a width — a drawer that needs more room declares its own `size`. The base `max-width` and the `560px` full-width rule still apply, so a wide drawer yields to the viewport on small screens instead of clipping horizontally.

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

`shell/drawer/AdminStationDrawer.tsx` owns overlay chrome, header, scrolling body, optional record footer, backdrop/Escape/header close, close-guard handling, scroll lock, and focus restoration. It never switches on entity type. Unsupported requested modes clamp to the first mode supported by the registered contract.

`AdminStationDrawerContext.tsx` keeps one open drawer and preserves identity across mode changes. Closing clears both state and the originating-wall refetch handle; a late save then cannot refresh a wall the user has left.

## Owning compositions

- `admin-station/stations/serviceCategory/CategoryDrawerHost.tsx` mounts the Category composition and uses numeric Category identity.
- `service-station/surface/ServiceDrawerHost.tsx` mounts the Service composition and uses numeric Service identity.
- `package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx` resolves string `group_id` and mounts the Package Family composition.
- `package-station/surface/tierSurface/TierDrawerHost.tsx` resolves stable string `occupant_id` and rejects foreign identity shapes.

The mature compositions remain under `entity-drawers/category/`, `service-station/drawer/`, and `package-station/drawer/{package-family,tier}/`. They use the shared `drawer-kit` renderer and module/editor/footer contracts. Category mutations remain in `useCategoryStation`; Service mutations remain in `useServiceStation`; Package Family and Tier mutations remain in Package Station hooks. Presentation components call no endpoints.

## Invariants

- Record ids pass through without parsing, stringification, or numeric coercion.
- The generic shell never saves domain data directly.
- Drawer registrations are capabilities; Admin's surface policy chooses which key a bound action opens.
- Module editing replaces only the active module; sibling modules remain readable.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md), [Cards](admin-station-cards.md), [Drawer System](drawer-system.md), [Entity Drawer Recovery](entity-drawer-recovery.md), and [Package Manager](package-manager.md).
