# Admin Shell System — v2

Canonical specification for the workstation page frame: the four-zone layout
contract every admin workstation inherits. Implemented by
`resources/ts/components/admin/shell/Workstation.tsx` (compound component)
and the `.cz-shell-workstation*` classes in `resources/css/modules/admin.css`.
Generalised from the Service Catalog pilot (Admin Shell System P2). This
document was written retroactively in 2026-07 (Phase S0 of the
[Schema-Driven Workstation Architecture](SchemaWorkstationArchitecture-v1.md))
to close a dangling reference — the contract itself has been live since P2.

---

## The four-zone contract

```
<Workstation>
  <Workstation.Header>  … </Workstation.Header>    ← fixed-size zone
  <Workstation.Toolbar> … </Workstation.Toolbar>   ← fixed-size zone
  <Workstation.Actions> … </Workstation.Actions>   ← fixed-size zone
  <Workstation.Content> … </Workstation.Content>   ← the only stretch zone
</Workstation>
```

Rules:

1. **The four zones are flat siblings.** Do not nest Toolbar or Actions
   inside Content, and do not make Content responsible for the controls
   above it.
2. **Only Content stretches.** Header, Toolbar, and Actions are fixed-size;
   Content owns scroll/overflow.
3. **Zones are extended, never forked.** Each zone accepts `className` so a
   view can layer module-scoped behaviour (e.g. a table layout) on top of the
   contract. A workstation must not re-implement the frame with raw
   `cz-ws-header` / `cz-ws-card` markup.
4. **CSS contract**: `.cz-shell-workstation`, `__header`, `__toolbar`,
   `__actions`, `__content` in `admin.css`. All values extend Atomic Engine
   `--cz-*` / admin tokens per the design-token discipline.

## Adoption status (2026-07)

| Workstation | Uses the contract |
|---|---|
| `ServiceCatalogWorkstation` | ✓ (pilot) |
| `BinWorkstation` | ✓ |
| `OverviewWorkstation`, `BundlesWorkstation`, `FeaturedWorkstation`, `RequestsWorkstation`, `HealthWorkstation`, `ServiceArchivedWorkstation`, `ServiceTrashWorkstation` | ✗ — legacy `cz-ws-header` / `cz-ws-card` frame |

Full adoption is scheduled as part of Phase S5 of the Schema-Driven
Workstation Architecture (workstations adopt the zones as they are migrated
onto `WorkstationSchema` surfaces). Rule 3 applies to all new work
immediately: no new workstation may hand-roll the page frame.
