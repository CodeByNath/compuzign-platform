# Admin Station Drawer

The fresh, shared **drawer path**: how a template kit's action becomes an open drawer over a record, with View/Edit tabs, without the shell or controller naming an entity. Completes the projection sequence begun in [Surface Binding](admin-station-surface-binding.md). Built new — it imports **no** old-tree drawer UI (`EntityDrawer`, `InlineEditorShell`).

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## The chain

```
template action → onIntent(recordId, actionId)
  → StationSurfaceHost resolves the binding's action intent + drawerTemplateKey
    → ResolvedStationIntent { recordId:StationRecordId, intent, drawerTemplateKey }
       + that wall's own refetch
      → drawer controller (openFromIntent) stores { drawerTemplateKey, recordId, mode }
        → shared drawer shell resolves the template by key
          → entity content renders its reading surface / inline editor
            → save succeeds → onSaved() → the ORIGINATING wall refetches
```

The id the card carried is the id the drawer edits with. Nothing in this chain converts, re-keys, or looks up a surrogate — see [Record identity](admin-station-cards.md#record-identity).

## Authoritative files

- `stations/drawers/drawerTypes.ts` — the contracts: `DrawerMode` (`'view'|'edit'`), `DrawerTemplateKey` (`'package-family'`), `DrawerContentProps` (`recordId:StationRecordId`, `mode`, `onModeChange`, `onClose`, `onSaved`), `DrawerTemplateRegistration`. Separate from the registry so the registry can value-import content without a cycle; its one import is the zero-dependency identity type.
- `stations/drawers/drawerRegistry.tsx` — `DrawerTemplateKey → { title, supportedModes, content }`. Load-time guard (`assertDrawerTemplatesWellFormed`: key match, non-empty modes) and `resolveDrawerTemplate` (null → neutral state, never throws at open).
- `shell/drawer/AdminStationDrawerContext.tsx` — the **controller** (generic): holds the one open drawer (`drawerTemplateKey`, `recordId`, `mode`) or null. `openFromIntent(intent, refetchSurface?)` (ignores non-drawer / keyless intents), `setMode` (switches tab, **preserves recordId**), `close` (clears all state — no stale intent survives), `notifySaved` (fires the originating wall's refresh). The refresh handle lives in a **ref**, not in state: it is a side-effect handle rather than rendered data, and it is dropped on close so a late async save refreshes nothing rather than a wall the user has left.
- `shell/drawer/AdminStationDrawer.tsx` — the **shared shell** (generic): right-side modal, backdrop/Escape close, scroll lock, focus into panel + restore on close. It clamps an unsupported requested mode and hands `onModeChange` to entity content, allowing editing to open inline from the owning module rather than appearing as a contextless first-level tab. Content is keyed by `template:recordId` (survives mode switches, remounts per record). Unknown key → neutral `UnresolvedDrawer`.
### Registered templates

**One template is registered today.** A template is entity-specific by design (that is what a template *is*); only the shell and controller stay generic.

- `stations/packageFamily/PackageFamilyDrawerContent.tsx` — loads by string `group_id` (`usePackageFamilyRecord`, a list-scan because there is no single GET). Its populated reading surface has a record hero, Overview/Connections tabs, a module card, and fixed Close/Edit actions. Overview editing replaces that reading surface inline with Back/Cancel/Save; save calls `savePackageFamilyOverview` with the same string id, then returns to Overview. Connections shows the backend `dependents` counts (Services, Rate Sheet rows, Tier selections).
  - **Mutation boundary, deliberate:** families have no shared authoritative state hook to reuse — the legacy tree owns that logic *inside its own UI components* (`PackageFamiliesSection`, `DynamicStationManager`), which must not cross the bundle. So this content calls the pure endpoint directly and advances its local record from the server's returned `group`. Overview edits save the station's **draft**; apply/publish stays with the lifecycle actions and is not reinvented here.

The registry has carried **two** templates at once (a numerically keyed Service Category Group template alongside this string-keyed one), which is how the axis was proven entity-agnostic: adding the second changed nothing but the registry map and its own folder, and retiring it later changed nothing else either.

It does not pass `onRefresh`: content reflects its save from that save's **own response**, so the open form never flashes.

## Save → refresh

`DrawerContentProps.onSaved` is how content reports a successful save. It is called **only on success** — a failed save must not refresh a wall, which would imply a change that never happened. Content does not know which wall opened it; it reports the fact and the controller routes it.

The two reads are **separate `useApi` instances** (the drawer's record read vs. the wall's collection read), so refreshing the wall cannot disturb what is on screen in the drawer. Both update, neither flashes: the drawer from its save response, the wall from a retained-collection reload (see [Surface Binding](admin-station-surface-binding.md) → `useRetainedCollection`).

Drawer content styles are the shared, entity-neutral `cz-record-drawer__*` + `cz-station-field*` primitives (renamed from the entity-named `cz-scg-drawer__*` when the second template landed).

## Invariants

- **Entity-agnostic shell + controller.** They hold a template *key*, never an entity; only content is entity-specific.
- **Native identity end-to-end:** one `recordId: StationRecordId` from card action → intent → controller → content → endpoint, in the record's own form (today a string `group_id`; the type stays `string | number` because an entity's id travels as its own source expresses it). Never converted in either direction. Survives View↔Edit switching. The controller treats it as **opaque** — it stores and returns it without parsing or comparing.
- **No old drawer UI imported.** Bundle isolation holds (madge baseline of four `components/admin` cycles unchanged). The shell no longer imports any `hooks/useServiceCategoryGroup*` state hook — the only remaining template calls pure endpoints.
- **Fails loudly / degrades safely:** malformed registry throws at load; an unresolved key or missing record renders a neutral state, never a blank or a crash.
- **One intent→mode system.** The old `categoryGroupDrawer.ts` seam was deleted; the action→tab mapping lives only in the binding's `actionIntents`.

## Wiring

`AdminStation.tsx` wraps `AdminStationDrawerProvider`; `AdminStationLayout.tsx` renders `<AdminStationDrawer/>`; `AdminStationBody.tsx` passes `openFromIntent` as the surface host's dispatch.

## Related Code Maps

[Surface Binding](admin-station-surface-binding.md), [Cards](admin-station-cards.md), [Admin Station](admin-station.md).
