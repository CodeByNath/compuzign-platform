# Dynamic Station Manager — Package Provider Contract (v1)

Architecture contract for the Package relation provider and the reusable
**Dynamic Station Manager** workspace. The accepted platform placement is the
optional terminal Manager tab in a station drawer. This doc replaces the prior
separate-workstation placement and all earlier "Board Manager" /
"Control Centre" language.

Companion documents:
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — canonical drawer contract: fixed `Details | Connections` base tabs plus capability-gated terminal `Manager`.
- [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) — station lifecycle vocabulary; Station Managers are explicitly outside this engine (see §1).
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — the drawer module template a Station Manager does *not* use for its outer shell.

---

## 1. Station Manager Contract

**What Dynamic Station Manager is.** Manager is the optional terminal
station-level drawer workspace that coordinates how registered relationships
participate in the currently open station. It has no lifecycle of its own —
`draft` / `active` / `disabled` / `archived` / `trashed` do not apply to it.
It manages relationship structure; it is not a station or entity.

**How it differs from station Details.** Details presents station-owned
modules, fields and inline editors. Manager coordinates provider-owned
relationship decisions. It opens directly as a working workspace with no
overview card and no extra Edit step.

**How it differs from Connections.** Connections presents connected entities
and opens their existing destinations. Manager renders declared relationship-
management capabilities. Destination editors remain authoritative and are
opened from Manager rows when needed.

**Placement boundary.** Manager is not a top-level workstation, separate
drawer, `EntitySchema`, `EntityDrawer`, shell placement, module or nested
provider tab system. `Details | Connections` remain mandatory and first;
Manager appears last only when at least one applicable provider declares a
writable management capability. Read-only providers do not create it, but may
contribute health and routing rows once it exists.

**How it links source station data to consumer station usage.** The source
station supplies a raw pool. The Station Manager organizes, declares, and
derives the Package provider's managed structure from that pool (groups,
order, availability and decoration) and exposes a read model. Consumer stations store only their own usage
choices against that read model — never a copy of the manager's structure.

**Ownership boundary.** Source entities own canonical data. Each relation
provider owns persistence, validation and projection/availability rules for
its relationship decisions. Manager coordinates one composite in-memory
session and one visible Save/Cancel surface; it owns no generic cross-provider
database envelope and never claims cross-provider atomicity.

## 2. Package relation provider

First writable provider of the Dynamic Station Manager pattern.

- **Source station:** Service / Package station — canonical source data is
  Service inclusions and FAQs.
- **Managed relationship concerns:** grouping, ordering, explicit package
  availability and Package-owned decorated labels.
- **Consumers:** Tier and future relation consumers read provider-owned
  projections; consumers never copy Manager structure into their own storage.
- **Scope:** one Package relation-provider configuration per package station. Package
  and service are the same scope key today (the package station is postmeta
  on the Service post) — so this is a 1:1, service-scoped manager, not a
  global/shared board across services.

## 3. Drawer and migration boundary

- `ServiceTierStep.tsx` must not own Manager provider draft state or import the
  Manager workspace editor inline.
- Until Manager-tab parity is complete, the current direct Package Manager
  action in Connections remains the temporary entry and its transit destination
  remains intact. They retire only after the in-drawer workspace reaches
  functional parity.
- The final Manager workspace is part of the station drawer but remains outside
  Package `EntitySchema` placements and outside `ServiceTierStep` state.
- No local Manager workspace state lives inside `ServiceTierStep`; the shared
  Manager coordinator owns the provider-keyed editing session.

## 4. Manager workspace boundary

- Manager receives explicit station scope (for Package, `serviceId`) and
  discovers applicable providers from the typed relation-provider registry.
- It renders a compact dashboard, provider filters/sections, dense relation
  rows, capability-driven controls, health/notifications and destination links.
  It renders no module cards, overview card, extra Edit state, nested provider
  tabs or provider-created modules.
- It coordinates `draftByProvider` and `originalByProvider`. All dirty Manager
  exits — Details, Connections, Close, Back and Cancel — share one guard.
  Dirty drafts are never silently hidden.
- Details and Connections keep standard width. Manager may request the explicit
  wider ActionShell panel mode; width returns automatically when Manager is
  left. `ActionShell` owns width.
- A visible Save validates all dirty providers before writing, then calls each
  provider's own save contract. Provider successes remain committed and provider
  failures remain dirty; cross-provider atomicity is never implied.

### Provider adoption

- Package is the first writable provider. `PackageManagerSchema`, GET,
  `has_configuration`, POST explicit decisions, deterministic identity,
  provisional reconciliation, missing-source preservation and consumer
  projections remain Package-owned and are adapted rather than generalized.
- Promotion initially contributes read-only identity, health and destination
  routing. Promotion priority, `is_featured`, schedule, headline, campaign
  fields, pricing, module drafts and lifecycle remain Promotion-owned. Future
  writable Promotion decorations require separately approved provider-owned
  storage and must not reuse those entity fields.

## 5. Package provider storage contract

- Package-provider storage remains `PackageManagerSchema`: `groups[]` plus
  explicit `items[]` decisions keyed by deterministic source identity. It is
  not generic Manager or cross-provider storage.
- Items are derived 1:1 from the source station's inclusion/FAQ pools and
  cannot be manually added or deleted. An unwanted item is disabled, never
  removed — the pool, not the board, owns item existence.
- Groups are a pure admin-created organizational layer with no external
  source of truth. They can be created, deleted, and reordered freely.
  Deleting a non-empty group reassigns its items to the default/ungrouped
  bucket — it never deletes or disables the items themselves.
- Stale references (a pool item that no longer resolves) are preserved and
  flagged `missing: true`, never dropped — the same never-drop-only-flag
  discipline used elsewhere on the platform for pool references.
- The GET read model, `has_configuration`, atomic POST of explicit decisions,
  provisional reconciliation, missing-source preservation and projection rules
  stay Package-provider-owned.

## 6. Consumer projection contract

- Consumers store only their own usage choices; they do not store Package
  provider grouping, order, availability decisions or decoration.
- Consumers read the manager's read model at render time and overlay their
  own usage choices row-by-row — grouping and order are borrowed for
  display, never copied into consumer storage.
- Future consumers borrow Package provider structure live and keep only their
  own consumer-specific usage choices; they do not copy provider structure.

## 7. Pricing boundary

- Package relation management owns no price, unit, quantity, Tier internals or
  Cost Builder logic.
- Pricing and public output remain owned by their existing entity/provider
  paths. A future provider may expose a pricing-related relationship
  decoration only through a separately approved, provider-owned capability;
  it cannot become generic Manager data.

## Naming discipline

"Dynamic Station Manager" is the architectural workspace name. Provider code
identifiers stay literal and technical — e.g. `packageRelationProvider`,
`promotionRelationProvider`, `PackageManagerSchema` and the existing
`package_manager` storage key. Do not model Manager as a workstation ID,
EntitySchema ID, lifecycle record or generic database key.
