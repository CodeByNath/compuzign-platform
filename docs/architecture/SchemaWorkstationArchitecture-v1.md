# Schema-Driven Workstation Architecture — v1

Canonical specification for the platform's schema-driven presentation
architecture. Approved 2026-07-05 (Phase S0); **amended 2026-07-05 (v1.1,
"Living Architecture" correction)** before any implementation began. The
contracts in this document change only through a formal architecture
amendment recorded in the Amendment Log (§14).

Companion documents:
- [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) — the backend lifecycle engine and the three station participation models. The Station is the living DNA this architecture presents.
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — the locked Drawer Header & Navigation Contract, Drawer Tab Contract, and Presentation Status Contract. This architecture encodes those contracts; it never re-litigates them.
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — the behavioural reference the shells must reproduce.
- [DrawerModuleSystem-v1.md](DrawerModuleSystem-v1.md) — the `.drawerModule` CSS frame the shells render.
- [AdminShellSystem-v2.md](AdminShellSystem-v2.md) — the four-zone workstation page frame.

---

## 1. Philosophy — the Living Architecture

> **The correction that produced v1.1:** *Schema is not the DNA. The Station —
> the living business module — is the DNA. Schema is the shell system that
> receives, organises, and presents that living DNA.*

| Layer | Metaphor | Owns |
|---|---|---|
| **Station** | life / DNA | lifecycle, state, ownership, references, relationships, actions, notifications, behaviour, data contracts |
| **Shell Schema** | shell / cells | reusable presentation shells that receive Station DNA |
| **Mode** | viewpoint / relativity | how a shell is viewed (Details, Connections, Edit, Summary, Table, Card) |
| **Group** | placement / orbit | how shells line up together (tabs, commercial group, parent/child, workstation groups) |
| **Workstation** | galaxy | the full environment where stations, shells, modes and groups come together |

The organism is never recreated. The Station lives on the backend and in the
station hooks; it is never rebuilt. Shells regenerate freely around it. A
Service Overview is never rewritten because it appears somewhere else — the
same living module is received by the same shell, viewed through a different
mode, placed by a different group.

This remains an **evolution of the existing architecture, not a
replacement**: the behavioural engine (`evaluateModule` + `ModuleDefinition`),
the lifecycle engine (`StationLifecycle.php`), the station hooks, and the
locked presentation contracts are all untouched. The schema layer is
presentation only — it **contains no DNA and never will**.

## 2. The layer model

```
Station DNA          the living business module (backend + station hooks)
        ↓  received by
Shell Schemas        two shell archetypes: Overview Shell · Child Shell
        ↓  viewed through
Modes                details · connections · edit · summary · table · card
        ↓  placed by
Groups               Details group · Connections group · Commercial group · workstation groups
        ↓  composed in
Workstations         navigation, page frames, surfaces
```

Every layer has a single responsibility, and each is grounded in an existing
asset:

| Layer | Single responsibility | Existing asset |
|---|---|---|
| Station DNA | all business truth and behaviour | `StationLifecycle.php`; `ModuleDefinition<T>` + `evaluateModule` (`utils/moduleNotifications.ts`); station hooks + `stationPrimitives.ts`; REST module endpoints — **all unchanged** |
| Shell Schemas | receive DNA, organise it into Schema Groups, present it | evolves `ReadBlock.tsx` (read shell) and `InlineEditorShell.tsx` (edit shell) |
| Modes | decide how a shell is viewed and how much of it renders | replaces the hand-rolled `mode='details'\|'connection'` prop branching |
| Groups | decide where shells appear, in which mode | the Drawer Tab Contract's fixed tabs; `WORKSTATIONS` registry grouping |
| Workstations | compose the environment | `WORKSTATIONS: WorkstationDef[]` + the AdminShellSystem-v2 four zones |

Schemas are **TypeScript modules, not JSON** — type-checked descriptors with
closures, exactly as `ModuleDefinition` uses today. Serializability is a
non-goal.

Planned home (created in Phase S2, not before):

```
resources/ts/components/admin/schema/
  types.ts              descriptor interfaces
  icons.tsx             module icon registry
  presentation.ts       single pill meta + travel pill map (contract chokepoint — S1a)
  elements/
    library.ts          Platform Element library (content pieces for shell Content Groups)
    modeRenderers.ts    element × mode → renderer
  shells/
    overviewShell.ts    the Overview Shell archetype
    childShell.ts       the Child Shell archetype
    bindings/           per-module shell configuration (service.ts, tier.ts, promotion.ts)
  entities/             station manifests + registry
  workstations.ts       WorkstationSchema + GroupSchema registry
```

## 3. Station DNA — the life layer

The Station owns **everything that is alive**: lifecycle, state, ownership,
references, relationships, actions (behaviour), notifications, and data
contracts. Its assets are already built and are not modified by this
architecture:

- `StationLifecycle.php` — operational states and travel transitions
  (canonical / travelling-instance / shell-occupant participation).
- `ModuleDefinition<T>` + `evaluateModule` — per-module notifications and
  status derivation. **These stay in `utils/moduleNotifications.ts`,
  untouched.** They are DNA, not schema.
- Station hooks (`useServiceStation`, `usePackageStation`,
  `usePromotionStation`) + `stationPrimitives.ts` — draft-preferred
  derivation, mutations, module state.
- Per-module REST endpoints — the data contracts.

The DNA reaches a shell through one delivery object, produced by the station
hook at render time:

```ts
interface ShellBinding<T = unknown> {
  data: T;                            // draft-preferred module data
  state: ModuleState;                 // from evaluateModule — status + notes
  hasDraft: boolean;
  handlers: Record<string, () => void | Promise<void>>;  // keyed by action id
  busy?: string | null;               // action id in flight
}
```

**Boundary (locked):** DNA flows one way, Station → Shell. A shell never
computes status, never derives notes, never owns business truth, never calls
endpoints. Handlers live in station hooks; schemas declare intent only.

## 4. Shell Schemas — the shell layer

A Shell Schema is a reusable presentation shell that receives Station DNA and
organises it into **Schema Groups**. It **references** the living module; it
does not extend or contain it (v1.1 correction — composition, not
inheritance, so schema files stay pure presentation and
`moduleNotifications.ts` needs no changes at all):

```ts
interface ShellSchema<T = unknown> {
  archetype: 'overview' | 'child';     // §5 — the two shell behaviours
  dna: ModuleDefinition<T>;            // reference to the living module (unchanged, in moduleNotifications.ts)

  header:  HeaderGroup<T>;             // identity elements: title, subtitle, icon id, count
  content: ContentElement<T>[];        // Content Group — Platform Element instances (§6)
  footer:  FooterGroup;                // ordered action ids
  actions: Record<string, ShellActionSchema>;  // Action Group
  editor?: ShellEditorSchema;          // Edit-mode binding (InlineEditorShell + module editor)
  // Notification Group = delivered via ShellBinding.state.notes (DNA, not schema)
  // Status             = delivered via ShellBinding.state.status (DNA, not schema)
}

interface HeaderGroup<T> {
  title: string; subtitle?: string;
  icon: IconId; iconVariant?: string; scopeClass?: string;
  count?: (data: T) => number | null;
}

interface ShellActionSchema {
  id: string;                          // 'edit' | 'discard-draft' | 'view' | …
  label: string;
  intent: 'primary' | 'secondary' | 'danger';
  confirm?: { prompt: string; confirmLabel: string };   // shared inline-confirm
  when?: (b: ShellBinding) => boolean;                  // e.g. b.hasDraft
}

interface FooterGroup { actions: string[] }
```

> **Stable Contract (locked, formerly the "DNA Law").** A shell's Schema-Group
> structure — Header, Content, Footer, Action, plus DNA-delivered
> Notifications and Status — is a **stable contract**. It never changes for
> implementation convenience and evolves only by formal amendment. Normal
> evolution = Platform Elements joining the Content Group. Note the corrected
> attribution: the *permanence* belongs to the Station (the module is never
> rebuilt); the *stability* belongs to the shell contract (shells regenerate,
> but their anatomy is fixed).

## 5. Shell Archetypes — two behaviours, not nine modules

The platform does not have nine unrelated module behaviours. At the behaviour
level it has **two shell archetypes**. Implementation generalises these two —
everything else is data binding, actions, content, and mode configuration.

### Overview Shell

| | |
|---|---|
| **Receives** | entity identity (the station's primary module) |
| **Modes** | Details · Edit (inline) · Connections · Summary |
| **Hosts** | related Child Shells inside its Connections viewpoint |
| **Used by** | Service Overview · Tier Overview · Promotion Overview · future Category / Bundle / Case Study Overview |

### Child Shell

| | |
|---|---|
| **Belongs to** | a parent station |
| **Owns/references** | child capability data (collections, references) |
| **Modes** | Details · Edit (inline) |
| **Appears** | inside the parent Overview's Connections placement |
| **Used by** | Service Features · Service FAQs · Tier Feature Refs · Tier FAQ Refs · Promotion Feature Refs · Promotion FAQ Refs · future child/reference groups |

Evidence from the codebase that the split is real: the four near-identical
`resolveStatus` closures found in the audit (tier/promotion features + faqs)
are exactly the Child Shell population; the three overview modules share the
identity/details/edit/connections behaviour the Overview Shell names.

> **Archetype Rule (locked).** New archetypes are added only by amendment.
> Two is the current inventory, not a cap — but a proposed third archetype
> must first fail to be expressed as content, actions, or mode configuration
> on an existing archetype. (Per the Boundary Test, a future Comments or
> Audit Trail capability that owns its own lifecycle would be a candidate —
> that is the amendment path, not a reason to pre-build.)

## 6. Platform Elements — content pieces inside a shell

Platform Elements are **not the centre of the architecture** (v1.1
correction). They are the content vocabulary of a shell's Content Group: the
pieces a shell organises and modes render.

```ts
type PlatformElementId =
  | 'text' | 'rich-text' | 'term'            // Overview content: Name, Description, Category
  | 'item-collection' | 'qa-collection'      // Child content: Inclusions chips, FAQs
  | 'custom';                                // escape hatch
  // Future content joins here — semantic, never render-flavoured:
  //   Overview: 'visibility-flag' | 'seo-summary' | 'ai-summary' | 'metrics' | 'timeline'
  //   Child:    'quantity' | 'price' | 'limits'
  //   …

interface ContentElement<T> {
  id: string;                      // 'name' | 'description' | 'quantity' | …
  element: PlatformElementId;
  label?: string;
  bind: (data: T) => unknown;      // data access only
  when?: (data: T) => boolean;     // data-driven presence only — never mode logic
}
```

Worked example of the point of this layer: if Tier Feature References gains
per-item `quantity` or `price` tomorrow, **nothing falls apart** — those join
the Child Shell's Content Group as elements. No new module behaviour, no new
archetype, no shell rewrite.

Rules retained unchanged from v1.0 (all locked):

- **Separation Rule** — an element describes *what joins the shell's content*;
  a mode renderer describes *how or whether it appears*. `ContentElement` has
  no presentation fields; there is no field to hide it in.
- **Granularity Rule** — a distinct element id only when at least one mode
  must render it differently from an existing element (`name` is a `text`
  instance, never a `name` element). Ids are semantic, never entity-specific,
  never render-flavoured.
- **Boundary Test** — own lifecycle/notifications/actions → it is a *module*
  (Station DNA, presented by a shell); projection of station data → it is an
  *element*. v1 elements are synchronous projections of station data.
- **Escape-hatch policy** — `custom` is first-class and permanent; every use
  is logged as a candidate element. Promotion needs 2+ real consumers.
- **Governance Rule** — deliberately lightweight: short Amendment Log entry +
  mode renderers + one non-hypothetical consumer.

## 7. Modes — the viewpoint layer

A mode is the viewpoint a shell is seen through. **Surfaces (drawer, page)
are not modes** — they are environments provided by Groups and Workstations
(v1.1 correction; this replaces v1.0's `PresentationMode` list, which mixed
surfaces and viewpoints).

```ts
type ShellMode = 'details' | 'connections' | 'edit' | 'summary' | 'table' | 'card';
```

| Mode | Viewpoint | Today's equivalent |
|---|---|---|
| `details` | full read view, status + notifications chrome | view cards / ReadBlock in the drawer's Details tab |
| `connections` | read-only relational view, no lifecycle chrome, View-only footer | the `mode='connection'` prop + `ServiceContextPanel` behaviour |
| `edit` | inline editor — module-level, inside `InlineEditorShell` | the existing universal edit flow (unchanged) |
| `summary` | compact read (at-a-glance) | commercial summary blocks, catalog row summaries |
| `table` | row projection with columns + row actions | the bespoke `<table>` literals (S3b replaces them) |
| `card` | tile projection | bundle/health card grids (future adoption) |

Element presentation lives in exactly one registry, keyed element × mode:

```ts
// schema/elements/modeRenderers.ts
MODE_RENDERERS: Record<PlatformElementId, Partial<Record<ShellMode, ElementModeRenderer>>>
```

No renderer for (element, mode) = the element does not appear in that
viewpoint. Example: `timeline` renders fully in `details`, compactly in
`summary`/`card`, and is absent from `table` until a renderer is registered.

Rules retained unchanged from v1.0 (all locked):

- **Fallback Rule** — the `details` renderer is the default fallback for the
  read viewpoints (`connections`, `summary`); `table`, `card`, and `edit` are
  opt-in only. One renderer makes a new element useful everywhere readable.
- **Ordering Rule** — element order is declared once in the shell's Content
  Group; modes and placements filter and densify, never reorder.
- **Edit Granularity** — editing stays module-level inside
  `InlineEditorShell`, permanently: the lifecycle engine's draft envelope is
  per-module, and element-level editing would fork it.

## 8. Groups — the placement layer

Groups decide **where shells appear and in which mode**. The unit of
placement:

```ts
interface ShellSlot {
  module: string;                    // module key (matches backend module key)
  mode: ShellMode;                   // the viewpoint this placement uses
  density?: 'full' | 'summary';      // may tighten, never expand, what renders
}
```

Placement groups in v1:

- **Details group** — the drawer's Details tab: the station's own shells in
  `details` mode.
- **Connections group** — the drawer's Connections tab: *related* stations'
  shells in `connections` mode (the Overview Shell hosting relatives).
- **Commercial group** — tier/promotion shell line-ups within the Service
  drawer.
- **Parent/child placement** — a Child Shell appearing inside its parent
  Overview's Connections viewpoint.
- **Workstation groups** — `command` / `catalog` / `operations` navigation
  grouping (`GroupSchema`), and each workstation's surface.

The Drawer Tab Contract is encoded here: the drawer placement schema has
exactly two groups, `details` and `connections`, with canonical keys —
fixed, not extensible.

```ts
interface GroupSchema { id: string; label: string; order: number }

interface WorkstationSchema extends WorkstationDef {
  iconId: IconId;                    // one icon registry — retires the Sidebar NavIcon switch
  surface:
    | { kind: 'entity-table'; entity: string; scope: 'current' | 'archived' | 'trashed' }
    | { kind: 'component'; component: () => ComponentType };   // bespoke pages
}
```

`WorkstationRouter` becomes registry dispatch; `Sidebar` consumes one
registry. Adding a workstation = one entry. Requests keeps its own
`RequestLifecycle` and registers as `{ kind: 'component' }` (out of scope for
station manifests in v1).

## 9. Station manifests (Entity Schemas)

The station manifest declares — never re-implements — the station's identity,
lifecycle participation, shells, and placements:

```ts
interface EntitySchema {
  id: 'service' | 'tier' | 'promotion' | 'category' | 'bundle' | string;
  label: { singular: string; plural: string };
  identity: { idOf: (d: any) => number | string; titleOf: (d: any) => string };

  lifecycle: {
    participation: 'canonical' | 'travelling-instance' | 'shell-occupant';
    statuses: Array<'draft'|'active'|'disabled'|'archived'|'trashed'>;
  };

  ownership?: { parent: EntitySchema['id']; label: string };

  shells: Record<string, ShellSchema<any>>;      // keyed by backend module key
  actions: Record<string, ShellActionSchema>;    // entity travel actions

  permissions?: { view?: string; edit?: string; travel?: string };
  // Reserved — dark until the backend exposes capabilities in the boot payload.

  placements: {
    drawer?: { details: ShellSlot[]; connections: ShellSlot[] };   // Drawer Tab Contract keys
    table?: TableSchema<any>;
    travel?: { archived: TableSchema<any>; trashed: TableSchema<any> };
  };
}

interface TableSchema<Row> {
  columns: ColumnDef<Row>[];         // { id, label, cell(row), width? }
  rowActions: RowActionDef<Row>[];   // { id, label, intent, confirm?, when? }
  empty: { message: string; cta?: { label: string; actionId: string } };
  scope?: 'current' | 'archived' | 'trashed';
}
```

`StationLifecycle.php` stays authoritative for transitions. Manifest keys
mirror backend module/endpoint keys exactly; a backend module addition
without a matching manifest entry is a review-blocking finding.

## 10. Renderer map

| Renderer | Consumes | Replaces |
|---|---|---|
| `OverviewShell` / `ChildShell` (evolve `ReadBlock` + new `ActionFooter`) | `ShellSchema` + `ShellBinding` + active `ShellMode` | hand-written `.drawerModule` shells in the three Service view cards, ServiceViewStep/CreateStep inline cards, orphaned `ServiceContextPanel` |
| `ActionFooter` | `FooterGroup` × `ShellBinding.handlers`, built-in inline confirm | four footer varieties; copied `pendingId`/`busyId` confirm blocks |
| Mode renderers | `ContentElement[]` × active `ShellMode` | hand-written shell bodies (progressively) |
| `ModeContext` | active `ShellMode` | the `mode='details'\|'connection'` prop branching |
| `EntityTable` (inside `AsyncSection`) | `TableSchema` | 7+ bespoke `<table>` literals; the 3× copied travel table; tier/promotion bin panes |
| `EntityDrawer` + `DrawerTabs` | `EntitySchema.placements.drawer` | per-step tab state; hand-assembled drawer bodies |

Unchanged by design: `evaluateModule` + `ModuleDefinition`,
`ModuleStatusPill` behaviour (pill = lifecycle only; button-when-notes),
`ModuleNotificationPanel`, `InlineEditorShell`, `ActionShell`/`ActionConfig`
(multi-step flows remain separate), station hooks, `StationLifecycle.php`,
all REST endpoints.

## 11. Locked contract encodings

Locked contracts are encoded in renderers, never exposed as schema knobs — a
schema cannot express a violation:

- The drawer header (static workspace title, one left control, reserved-empty
  right slot) is implemented inside the drawer renderer; no configuration
  surface exists.
- `DrawerTabs` is fixed `Details | Connections` with canonical keys
  `'details'` / `'connections'`.
- `schema/presentation.ts` is the single status→label/class chokepoint
  (S1a). Only Active / Pending / Disabled exist there; Archived / Trashed
  labels are exported separately for travel-surface renderers only.

## 12. Migration phases

Unchanged in structure; S2–S4 scopes corrected by v1.1. Sequencing principle:
consolidate before generalising; prove the shells on Service; then
Tier/Promotion become configuration; then validate with a brand-new entity.

| Phase | Scope | Done when |
|---|---|---|
| **S0** | This document + AdminShellSystem-v2.md. Docs only. ✅ (incl. v1.1 amendment) | Contracts reviewed and locked. |
| **S1a** | Pill unification: `schema/presentation.ts` single pill meta + travel map; all local pill maps delegate. | One definition per pill mapping repo-wide. |
| **S1b** | Icon registry; `ActionFooter`; migrate Service view cards + inline cards onto `ReadBlock`; delete orphaned `ServiceContextPanel`. | No hand-written `.drawerModule` header/footer JSX outside `ReadBlock`. |
| **S1c** | `DrawerTabs` (canonical keys), `AsyncSection`, `useInlineConfirm`. | Loading/error and inline-confirm copies removed. |
| **S2** | **The two shell archetypes**: `OverviewShell` + `ChildShell`, launch element library, `details` + `edit` mode renderers — proven on Service (Overview = overview archetype; Inclusions + FAQs = child archetype). Tier/promotion `ModuleDefinition`s untouched in place. | Service Details tab rendered by the two shells; `ModuleState` snapshots byte-identical; no per-module shell components. |
| **S3a** | `connections` + `summary` modes via `ModeContext`; delete the `mode=` prop; tier/promotion shells become bindings of the two archetypes. | Connections tab renders via mode; tier/promotion drawers on archetype shells. |
| **S3b** | `table` mode: `EntityTable` + `TableSchema`; catalog table, then travel preset across Bin/Archived/Trash + tier/promotion bin panes. | Zero bespoke tables on migrated surfaces. |
| **S4** | Station manifests (`EntitySchema`) + `EntityDrawer` assembling placements; normalise `useServiceStation` to the `modules:{…}` shape (own PR, rendering unchanged, before the renderer switch). | Service/Tier/Promotion drawers assembled from manifests. |
| **S5** | `WorkstationSchema` + `GroupSchema`; router registry dispatch; Sidebar consumes registry; remaining workstations adopt the four zones. | Adding a workstation = one registry entry. |
| **S6** | **Category** end-to-end from a manifest + the two shells only. Budget: zero new renderer components and **zero new archetypes**; forced hand-written JSX is logged as a gap and fixed in the shared layer. | Category live; gap report appended here. |

Guardrails carried through every phase: pixel/behaviour parity on migrated
surfaces; the Presentation Status Contract import boundary; no speculative
elements, modes, or archetypes before a real consumer exists; the S6 gap
report is the only sanctioned source of new abstractions.

## 13. Foundation stress-test record

Findings 1–10 from the v1.0 adversarial review stand (relationships are
station-level DNA; Granularity Rule; Boundary Test; module-level edit lock;
Fallback Rule; filter-never-reorder; shared layers require shared tests —
every `MODE_RENDERERS` entry ships a per-mode render test and the S2
`ModuleState` snapshot suite is a permanent parity harness; lightweight
governance; frontend/backend key mirroring; no speculation before S6).

v1.1 correction findings:

11. **DNA/shell conflation** — v1.0 described `ModuleSchema` as "the module's
    permanent DNA" and had it *extend* `ModuleDefinition`, blending living
    behaviour (problems/resolveStatus) with presentation descriptors.
    Corrected: the Station is the DNA; `ShellSchema` *references* the module
    (`dna:` field) and contains presentation only. Consequence:
    `moduleNotifications.ts` now needs **zero changes** in any phase.
12. **Nine-module over-generalisation** — v1.0's S2 would have produced a
    schema wrapper per module (11 wrappers). Corrected: two shell archetypes
    (Overview, Child) cover the current inventory; modules become bindings.
    Implementation cost drops from "generalise 9 modules" to "build 2 shells,
    bind 9 modules." The Archetype Rule guards against both re-sprawl and a
    premature third archetype.
13. **Surface/viewpoint mixing in modes** — v1.0's `PresentationMode` treated
    `drawer` (a surface) and `read-block` (a component) as peers of `table`/
    `card` (viewpoints). Corrected: `ShellMode` is viewpoints only; surfaces
    belong to Groups/Workstations. This removes an entire class of future
    ambiguity ("is X a mode or a place?").

## 14. Amendment Log

| Date | Amendment | Notes |
|---|---|---|
| 2026-07-05 | v1.0 approved | Initial architecture; launch element library: `text`, `rich-text`, `term`, `item-collection`, `qa-collection`, `custom`. |
| 2026-07-05 | **v1.1 — Living Architecture correction** | Station = DNA; Schema = shell; Mode = viewpoint; Group = placement; Workstation = galaxy. `ModuleSchema` → `ShellSchema` (composition via `dna:` reference, not inheritance). Two shell archetypes (Overview, Child) + Archetype Rule. Platform Elements repositioned as Content-Group content. `ShellMode` = viewpoints only. S2–S4 scopes corrected. All v1.0 locked rules and contracts retained. |
| 2026-07-06 | **S3a element additions** (Governance Rule) | `relation-summary` — compact child-relation counts; connections-only renderer; consumer: the related-service card's "Includes" line (tier/promotion Connections tabs). `metrics` — at-a-glance headline + copy; summary-only renderer; consumer: the Commercial group's Package Summary block. `qa-collection` bound-value contract: `answer` becomes optional — an owned item carries a string (empty = surfaced gap); a reference item without an answer relation carries `undefined` (no answer line); consumers: tier/promotion FAQ ref shells. All entries ship per-mode render cases in scripts/mode-renderer-snapshot.mjs. |
