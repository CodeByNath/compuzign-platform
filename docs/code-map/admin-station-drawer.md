# Admin Station Drawer

The fresh, shared **drawer path**: how a template kit's action becomes an open drawer over a numeric record, with View/Edit tabs, without the shell or controller naming an entity. Completes the projection sequence begun in [Surface Binding](admin-station-surface-binding.md). Built new — it imports **no** old-tree drawer UI (`EntityDrawer`, `InlineEditorShell`); only the pure authoritative state hook is reused.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## The chain

```
template action → onIntent(recordId, actionId)
  → StationSurfaceHost resolves the binding's action intent + drawerTemplateKey
    → ResolvedStationIntent { recordId:number, intent, drawerTemplateKey }
      → drawer controller (openFromIntent) stores { drawerTemplateKey, recordId, mode }
        → shared drawer shell resolves the template by key
          → View / Edit tab → entity-specific content, record loaded by numeric id
```

## Authoritative files

- `stations/drawers/drawerTypes.ts` — zero-dependency contracts: `DrawerMode` (`'view'|'edit'`), `DrawerTemplateKey`, `DrawerContentProps` (`recordId:number`, `mode`, `onClose`), `DrawerTemplateRegistration`. Separate from the registry so the registry can value-import content without a cycle.
- `stations/drawers/drawerRegistry.tsx` — `DrawerTemplateKey → { title, supportedModes, content }`. Load-time guard (`assertDrawerTemplatesWellFormed`: key match, non-empty modes) and `resolveDrawerTemplate` (null → neutral state, never throws at open).
- `shell/drawer/AdminStationDrawerContext.tsx` — the **controller** (generic): holds the one open drawer (`drawerTemplateKey`, numeric `recordId`, `mode`) or null. `openFromIntent` (ignores non-drawer / keyless intents), `setMode` (switches tab, **preserves recordId**), `close` (clears all state — no stale intent survives). Narrows a free-string intent mode to a `DrawerMode` (`'edit'` else `'view'`).
- `shell/drawer/AdminStationDrawer.tsx` — the **shared shell** (generic): right-side modal, backdrop/Escape close, scroll lock, focus into panel + restore on close. Renders one tab per `supportedMode`, clamps an unsupported requested mode, and renders the template's content keyed by `template:recordId` (survives tab switches, remounts per record). Unknown key → neutral `UnresolvedDrawer`.
- `stations/serviceCategoryGroup/ServiceCategoryGroupDrawerContent.tsx` — the **first real template** (entity-specific, allowed to know its data). Loads the raw record by numeric id (`useServiceCategoryGroupRecord`, list-scan — there is no single GET), then reuses `hooks/useServiceCategoryGroupStation` (the authoritative mutation boundary — bundle-safe: pure endpoints + `moduleNotifications` logic). View = read overview; Edit = name/description → `saveOverview` (numeric `term_id`). No `onRefresh`: the hook reflects the save from its response, so the form never flashes; refreshing the card wall behind is deferred.

## Invariants

- **Entity-agnostic shell + controller.** They hold a template *key*, never an entity; only content is entity-specific.
- **Numeric identity end-to-end:** `recordId:number` from card action → intent → controller → content → endpoint. Never stringified. Survives View↔Edit switching.
- **No old drawer UI imported.** Bundle isolation holds (madge baseline of four `components/admin` cycles unchanged; the shared `useServiceCategoryGroupStation` chunk carries no renderer).
- **Fails loudly / degrades safely:** malformed registry throws at load; an unresolved key or missing record renders a neutral state, never a blank or a crash.
- **One intent→mode system.** The old `categoryGroupDrawer.ts` seam was deleted; the action→tab mapping lives only in the binding's `actionIntents`.

## Wiring

`AdminStation.tsx` wraps `AdminStationDrawerProvider`; `AdminStationLayout.tsx` renders `<AdminStationDrawer/>`; `AdminStationBody.tsx` passes `openFromIntent` as the surface host's dispatch.

## Related Code Maps

[Surface Binding](admin-station-surface-binding.md), [Cards](admin-station-cards.md), [Admin Station](admin-station.md).
