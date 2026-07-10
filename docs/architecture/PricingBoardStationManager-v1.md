# Pricing Board Station Manager — Phase 0 Architecture Contract (v1)

Planning-only contract. No code, no schema, no UI in this phase. Defines the
reusable **Station Manager** pattern first, then Pricing Board as its first
implementation. This doc replaces all earlier "Board Manager" / "Control
Centre" language for this feature — that terminology is retired.

Companion documents:
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — drawer state machine and tab contract (Details | Connections), unchanged by this doc.
- [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) — station lifecycle vocabulary; Station Managers are explicitly outside this engine (see §1).
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — the drawer module template a Station Manager does *not* use for its outer shell.

---

## 1. Station Manager Contract

**What a Station Manager is.** A Station Manager is a top-level, hidden
workstation surface that coordinates a reusable structure shared *between*
stations: a source station supplies raw data, and one or more consumer
stations use a derived, organized version of that data. A Station Manager
has no lifecycle of its own — `draft` / `active` / `disabled` / `archived` /
`trashed` do not apply to it. It manages structure; it is not a station.

**How it differs from a station drawer.** A drawer edits and presents *one*
station's own record — its lifecycle, its modules, its fields. A Station
Manager coordinates a structure that spans stations. It is never entered via
the sidebar/drawer stack, has no Details/Connections tabs, and is never
subject to `StationLifecycle` transitions.

**How it differs from an inline editor.** An inline editor is scoped to and
owned by the drawer that renders it, editing fields that belong to that
station's own record. A Station Manager owns a structure that does not
belong to any single station's record — it is the coordinating layer between
a source and its consumers. It is never embedded inside a drawer.

**How it uses Connections.** A station drawer's Connections tab is the only
entry point into a Station Manager. Connections shows a read-only
summary/link card — it never surfaces the manager's editor inline, and the
drawer never acts as the manager's controller. Selecting the link opens the
Station Manager as its own top-level surface, scoped to that station.

**How it links source station data to consumer station usage.** The source
station supplies a raw pool. The Station Manager organizes, declares, and
derives a managed structure from that pool (groups, order, commercial rules,
etc.) and exposes a read model. Consumer stations store only their own usage
choices against that read model — never a copy of the manager's structure.

## 2. Pricing Board Station Manager

First implementation of the Station Manager pattern.

- **Source station:** Service / Package station — source data is service
  inclusions (`cz_service_inclusions`).
- **Managed structure:** a grouped commercial pricing board — groups and
  ordered items, commercial declarations (price, unit), quantity rules.
- **Consumers:** Tier Pricing Usage first. Future consumers: Bundle,
  Promotion, Subscription, Custom Plan, and other B2B station-to-station
  managers.
- **Scope:** one Pricing Board Station Manager per package station. Package
  and service are the same scope key today (the package station is postmeta
  on the Service post) — so this is a 1:1, service-scoped manager, not a
  global/shared board across services.

## 3. Drawer boundary

- `ServiceTierStep.tsx` must not own manager state — no `useState` board
  draft, no board editor imported inline.
- The package drawer's Connections tab may only show a read-only
  summary/link card into the Pricing Board Station Manager, scoped to that
  service. It shows that this station feeds a useful structure into another
  station — it does not reproduce that structure.
- No board editor inside the package drawer. Not as a full surface, not as a
  "quick edit" shortcut.
- No local `useState` manager surface anywhere inside `ServiceTierStep` — all
  board state lives inside the Station Manager surface, never in the drawer
  tree.

## 4. Manager surface boundary

- Station Managers render through the existing top-level
  workstation/router pattern (`WorkstationRouter` / `AdminShell`), never
  through `DrawerTabs` / `EntityDrawer` as their outer shell.
- Hidden from sidebar navigation in v1 (`hiddenFromNav: true`) — reachable
  only from the originating station's Connections tab.
- Scoped at open time by the originating station (e.g. `serviceId`). The
  manager has no ambient "current service" context of its own; it must be
  handed scope explicitly.
- Owns the full read → manage → edit flow for its structure internally
  (read model, edit affordances, ordering). It may use drawer-style editors
  or shells internally for individual group/item edits, but the manager
  shell itself is not a drawer and is not entity-lifecycle-bound.

## 5. Storage contract

- Manager-shaped storage: `groups[]` (`group_id`, `label`, `sort_order`) +
  `items[]` (`inclusion_id`, `inclusion_label`, `group_id`, `sort_order`,
  `base_price`, `unit`, quantity rules, `enabled`, `missing`) — never a flat
  rows list.
- Items are derived 1:1 from the source station's pool (inclusions) and
  cannot be manually added or deleted. An unwanted item is disabled, never
  removed — the pool, not the board, owns item existence.
- Groups are a pure admin-created organizational layer with no external
  source of truth. They can be created, deleted, and reordered freely.
  Deleting a non-empty group reassigns its items to the default/ungrouped
  bucket — it never deletes or disables the items themselves.
- Stale references (a pool item that no longer resolves) are preserved and
  flagged `missing: true`, never dropped — the same never-drop-only-flag
  discipline used elsewhere on the platform for pool references.

## 6. Consumer contract

- Tier Pricing Usage stores only usage choices: `pricing_mode` +
  `usage[{ inclusion_id, enabled, quantity }]` — no `group_id`, no
  `sort_order`, no `base_price`, no `unit`.
- Grouping, order, base price, and unit stay owned exclusively by the
  Pricing Board Station Manager.
- Consumers read the manager's read model at render time and overlay their
  own usage choices row-by-row — grouping and order are borrowed for
  display, never copied into consumer storage.
- The same contract applies to every future consumer (Bundle, Promotion,
  Subscription, Custom Plan): usage-only storage, structure always read live
  from the manager.

## 7. Pricing rules

- Empty manual tier price → displays "Contact us".
- Numeric manual tier price → displays the manual price as-is.
- Calculated price is an admin-only preview, derived at read time. It is
  never written into `tier.price`.
- An incomplete calculation yields `total: null` / `status: incomplete` — it
  is never coerced to `0`.
- Cost Builder and public pricing remain untouched by this feature until a
  separately-approved future phase explicitly authorizes calculated pricing
  publicly.

## Naming discipline

"Station Manager" is the architectural name only. Code identifiers stay
literal and technical — e.g. workstation id `pricing-board-manager`, file
`PricingBoardManagerWorkstation.tsx`, meta key `pricing_board`. Do not embed
"Station Manager" verbatim into identifiers, matching the platform's
existing discipline of keeping code names literal while architecture docs
carry the conceptual name (see [[feedback-control-centre-no-direct-wiring]]).
