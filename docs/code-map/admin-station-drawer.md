# Admin Station Drawer

The host participates in the locked [Station and Drawer Lifecycle Contract](../architecture/StationDrawerLifecycleContract-v1.md): it transports native identity and the mounted footer slot; the owning Station performs every create, save, settle, activate, mask, travel, and delete operation.

Admin Station owns one entity-agnostic drawer shell. Station Manager resolves registrations; the owning Station supplies its adapter, composition, state, validation, saves. Hosting never transfers authority.

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
| `rate-sheet` | Package Station | Package Station | normal (view) / extra-wide (edit) | view, edit |
| `tier-rate-sheet` | Package Station | Package Station | extra-wide | view, edit |
| `tier-rate-sheet-group` | Package Station | Package Station | wide | view, edit |
| `request` | Admin Station | Admin Station Requests host adapter | normal | view |

`DrawerMode` is `'view' | 'edit'`; there is no `create` mode. `request` (CRM-1B) is the first registration declaring only `view` — the existing clamp-to-supported-modes contract needed no shell change; Requests simply registers no `edit` intent. Family, Service, Category use a stable `'new'` sentinel, while Tier uses its registration address. Each resolves to `null`, never a fabricated identity, and its station holds pending state locally. Service and Category Overview Save create and hand off Pending records; Service child actions lock until then, and Publish settles and activates them.

## Drawer size

`DrawerSize` is `'normal' | 'wide' | 'extra-wide'`. A registration declares one size for every mode, or a `DrawerSizeByMode` map (a size per `DrawerMode`) for content needing more room in one mode than another — an omitted mode, like an absent `size`, resolves to `normal`. `AdminStationDrawer` resolves the declared size against the mode that will render (clamped to supported modes, exactly as content rendering is) into a CSS modifier; the shell never branches on entity type, and wide drawers still yield to the viewport. `rate-sheet` is the one mode-keyed registration today: View mounts a compact overview at normal width, while Edit — the pricing grid — needs the wider table room.

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

`AdminStationDrawerContext.tsx` keeps one open drawer and preserves identity across mode changes. Closing clears both state and the originating-wall refetch handle; a late save cannot refresh a wall the user has left.

## Owning compositions

- `admin-station/stations/serviceCategory/CategoryDrawerHost.tsx` mounts the Category composition and uses numeric Category identity, or the stable `'new'` sentinel resolved to `category: null`, and mounts the SAME composition either way.
- `service-station/surface/ServiceDrawerHost.tsx` mounts the Service composition and uses numeric Service identity, or the stable `'new'` sentinel resolved to `service: null`, and mounts the SAME composition either way.
- `package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx` resolves string `group_id`, or the stable `'new'` sentinel to a local empty record, and mounts the SAME Package Family composition either way.
- `package-station/surface/tierSurface/TierDrawerHost.tsx` resolves stable string `occupant_id`, whole-instance, fixed-slot, and Tier registration identities, and rejects foreign identity shapes.
- `admin-station/stations/requests/RequestDrawerHost.tsx` (CRM-1B/1C) resolves string `quote_ref` against `RequestRepository`; read-only content, no editor, but does publish a footer (Approve/Cancel/Print, status-branched).

Package Family and Tier rows above are pending the locked lifecycle migration; the host transports their identities but does not make their current source-specific creation/travel rules conform.

Each composition uses the shared `drawer-kit`; Category, Service, Package Family, Tier writes remain in their owning hooks. Presentation components call no endpoints.

## Invariants

- Record ids pass through without parsing, stringification, or numeric coercion.
- The generic shell never saves domain data directly.
- Drawer registrations are capabilities; Admin's surface policy chooses which key a bound action opens.
- Module editing replaces only the active module; sibling modules remain readable.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md), [Cards](admin-station-cards.md), [Drawer System](drawer-system.md), [Entity Drawer Recovery](entity-drawer-recovery.md), and [Package Manager](package-manager.md).
