# CompuZign AI Index

## Read order

1. [AGENTS.md](../AGENTS.md)
2. `docs/ai-index.md` (this index)
3. The primary relevant [Code Map](code-map/000-README.md)
4. Authoritative source and stable `SECTION:` markers
5. Related Code Maps only when the source crosses a boundary
6. Relevant [Project History](project-history/000-README.md) only when needed

## Peer Station model

- [Station Manager](code-map/station-manager.md) is coordinator-only. It owns registration contracts/resolvers, ordering and availability coordination, boot/finalize, generic surface composition, native record-identity transport, and retained-collection infrastructure. It owns no presentation primitive, domain logic, persistence, pricing, lifecycle rule, or drawer editor.
- [Service Station](code-map/service-station.md) is the Service peer and sole authority for Service data, IDs, lifecycle, validation, saves, catalogue presentation, and drawer composition.
- [Package Station](code-map/package-station.md) is the Package peer and sole authority for Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, validation, saves, presentation, drawers, APIs, and persistence.
- [Admin Station](code-map/admin-station.md) is a presentation/control Station and the thin frontend host. It owns shell chrome, icons, presentation tools, the generic drawer shell, and string-key presentation policy. Its drawer hosts the owning Station's registered contract; it never saves Service or Package data.

Placement does not transfer authority. Peers register their own capabilities; Admin decides placement, order, conditions, kit selection, and the default Home through Station Manager. Peer imports of Admin presentation modules are legal capability consumption. Peer-to-peer domain consumption uses public barrels.

Each Station has sibling surfaces: **Station Home** for reading, browsing, monitoring, and showcase; and one first-level **Station Drawer** for editing. A drawer may use tabs but never nests another drawer. Closing returns to the same Home state. The shared interaction pattern does not create shared persistence authority.

The locked cross-Station lifecycle and drawer contract is
[Station and Drawer Lifecycle Contract v1](architecture/StationDrawerLifecycleContract-v1.md).
Read it before creating or editing a Station, module, drawer, or record footer.
Service and Category conform today; Package Centre, Tier, Rate Sheet, and
Promotion surfaces are explicitly marked pending there until their source and
documentation adopt the same Overview-Save → returned-ID → Publish handoff.

## Boot contract

The Admin Station entry synchronously registers Service, Package, Admin capabilities, and Admin presentation policy; finalizes Station Manager; then registers the mounted app. Peer `register.ts` modules are entry-only. No resolver runs at module scope or before successful finalization. See [Station Manager](code-map/station-manager.md) for the exact order and invariants.

## Capability vocabulary and lifecycle

- **Tool** — a user-facing operational system.
- **Skill** — a reusable deterministic operation.
- **AI capability** — a reasoning-backed operation.
- **Connector** — an integration boundary.

Capability lifecycle is **registered** with the platform → **available** to a Station → **activated** for an owning entity. Activation records are stored by the owning Station, never in generic shared business storage.

Only the registration/finalize system has current consumers. Tool identity, availability evaluation over `StationConditions`, per-entity activation, frontend permission granularity, and skill/AI-capability/connector registries are reserved documentation seams. Do not build them before a real consumer exists. Current permissions remain backend gates; current conditions carry `scope: 'current'` without an availability evaluator.

## Shared and presentation boundaries

- `resources/ts/drawer-kit/` owns generic rendering and interaction contracts, not entity authority.
- `resources/ts/entity-drawers/` contains remaining host-neutral entity composition/shared chrome where documented by its Code Maps.
- Admin-owned cards, grids, status primitives, icons, and generic drawer shell remain under `resources/ts/admin-station/`; visual reuse does not make them Manager-owned.
- Source code is authoritative when documentation conflicts.

## Documentation and validation

Code Maps describe current ownership and entry points. Architecture documents preserve stable constraints or explicitly labelled specifications. Project History records completed milestones and is immutable. Local `CLAUDE.md` files contain local boundaries only.

When source moves, update imports, tests/contracts, affected Code Maps and local instructions; verify canonical paths/links; and rebuild generated output when applicable. Run focused checks during implementation and the complete relevant validation once before completion.
