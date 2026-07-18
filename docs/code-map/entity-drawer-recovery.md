# Entity Drawer Recovery

The **neutral, host-agnostic Service and Tier drawer compositions**, extracted from the former `ServiceViewStep` / `ServiceTierStep` god files, and the host seam that lets any drawer host mount them. This is the "finish the Station separation" work: the mature drawer presentation is now owned by the entity, not by the old Command Centre host.

Root: `wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/`

## The layers

```
Old Command Centre host (ActionShell / StepContext)
  → ServiceViewStep / ServiceTierStep  (thin adapter: StepContext → bridge)
      → EntityDrawerHostBridge
        → ServiceDrawerContent / TierDrawerContent   (neutral composition, no host import)
          → useServiceStation / usePackageStation     (authoritative state + mutation)
            → module REST endpoints
```

Both hosts are meant to mount the **same** composition through a thin adapter. The old host does today. The new Admin Station host **cannot yet** — see Bundle boundary.

## Authoritative files

- `entityDrawerHost.ts` — **`EntityDrawerHostBridge`**: `{ close; setFooter(node); setCloseGuard(guard|null); onMutationComplete? }`. The whole host seam. Names no host, no entity.
- `service-drawer/` — the neutral Service composition:
  - `ServiceDrawerContent.tsx` — assembles `EntityDrawer` (Overview/Inclusions/FAQs modules, status pills, notification panels, module footers), the Connections Pricing Summary, and the in-place module editors. Reuses the approved presentation unchanged; imports neither host. Publishes the footer through the bridge.
  - `useServiceDrawerController.ts` — record identity, the **module-level** edit state machine (one module editing, others readable), drafts/dirty, save/cancel/discard, lifecycle (toggle/settle/publish/archive/trash), and the guarded exit (unsaved / pending / new-never-published). Coordinates `useServiceStation`; **renders no JSX**.
  - `ServiceDrawerFooter.tsx`, `ServiceDrawerDialogs.tsx` — record footer + confirm/exit modals (pure presentation). `serviceDrawerTypes.ts` — content props.
- `tier-drawer/` — the neutral Tier composition, same shape plus the two-level nav (package overview ↔ individual tier) and occupant/bin travel:
  - `TierDrawerContent.tsx`, `useTierDrawerController.ts` (state incl. archive/restore-with-swap·retarget·pending-drafts/trash/delete, popular-tier, enable-disable, guarded exit — no JSX), `TierDrawerFooter.tsx`, `TierBinList.tsx`, `TierDrawerDialogs.tsx`, `tierDrawerTypes.ts`.
- `ServiceViewStep.tsx` (55 lines, was ~1035) / `ServiceTierStep.tsx` (49 lines, was ~1040) — **thin old-host adapters**: read the StepContext handoff, build the bridge (`ctx.setFooter`/`setCloseGuard`/`close`/`onRefresh`), mount the composition. `ServiceViewStep` keeps the `decodeHtml`/`TIER_KEYS`/`TIER_LABELS` re-exports.

## Bundle boundary (why the Admin Station adapters are not built)

`admin` and `admin-station` are **separate Rollup entry points**; `admin-station` imports **no** `components/admin` UI renderers ("contracts cross, renderers fork"). The neutral compositions live in the `admin` bundle because they reuse `EntityDrawer` / `OverviewShell` / `ReadBlock` / `InlineEditorShell` — which live there. So an Admin Station drawer template that mounts them would pull the entire admin renderer tree across the boundary. That is why `PackageFamilyDrawerContent` is a hand-built parallel UI, and why **registering Service/Tier in the Admin Station drawer registry is deferred**.

The Admin Station host is nonetheless **ready**: `DrawerContentProps` now carries optional `setFooter` / `setCloseGuard`, and `AdminStationDrawer` renders an entity-supplied footer and honours a close-guard — so its content contract already satisfies `EntityDrawerHostBridge` (`close = onClose`, `onMutationComplete = onSaved`). See [Admin Station Drawer](admin-station-drawer.md).

## Removal / relocation criteria

- **To register Service/Tier in the Admin Station:** relocate the shared drawer + schema renderer kit (`EntityDrawer`, the archetype shells, `ReadBlock`, `InlineEditorShell`, `ActionFooter`, the `ModeContext`/mode-renderers, entity manifests) to a neutral location importable by both bundles, then add a thin admin-station adapter that builds an `EntityDrawerHostBridge` and mounts the composition. Do **not** duplicate renderers.
- **Do not delete** the old-host adapters until the old Command Centre route is retired.
- Once Service/Tier prove the recovered path in the Admin Station, refactor `PackageFamilyDrawerContent` onto the shared primitives.

## Invariants

Controllers render no JSX. Presentation modules make no API calls. Authoritative mutation stays in `useServiceStation` / `usePackageStation`. Module-level editing is preserved (never replaced by a global drawer edit mode). Stable native ids flow end-to-end.

## Related Code Maps

[Drawer and Station System](drawer-system.md), [Admin Station Drawer](admin-station-drawer.md), [Service Catalogue](service-catalogue.md), [Tiers](tiers.md), [Package Manager](package-manager.md).
