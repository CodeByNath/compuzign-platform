# S6 — Category Station Onboarding Blueprint — v1

**Status:** Historical completed-phase blueprint
**Scope:** Category onboarding plan and recorded S6 implementation budget
**Current authority:** [Categories Code Map](../code-map/categories.md) and source

> Paths below are intentionally preserved as the plan executed at the time.
> Category drawer composition has since moved; use the current Code Map for
> ownership and path navigation.

Canonical implementation blueprint for Phase S6 of the Schema-Driven
Workstation Architecture: onboarding **Category** as the first brand-new
Station on the completed platform architecture.

**This is an onboarding exercise, not an architecture exercise.** S1–S5 are
complete, reviewed, and committed. The architecture is locked. The S6 audit
(2026-07-07) concluded: the schema architecture passes; zero new shell
archetypes, zero new presentation modes, zero new renderer components, zero
new drawer/table frameworks are required; the only genuine prerequisite is
**backend Station DNA for Category**, which is Station-layer growth the
architecture was built to receive — not an architecture change.

Companion documents:
- [SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md) — the architecture this phase validates; §12 defines the S6 budget and the gap-report rule.
- [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) — the lifecycle engine Category joins (canonical participation).
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — the locked drawer contracts; encoded in the renderers Category consumes.
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) §16 — the module build checklist; Category inherits it through the shells.
- [category-frontend-visibility-roadmap.md](category-frontend-visibility-roadmap.md) — superseded in part by Decision D1 below (recorded there on completion).

Path conventions in this document:
- `src/…` = `wp-content/plugins/compuzign-platform/src/…` (backend)
- `ts/…` = `wp-content/plugins/compuzign-platform/resources/ts/…` (frontend)

---

## 1. The S6 budget (locked, from §12)

> **Category end-to-end from a manifest + the two shells only. Budget: zero
> new renderer components and zero new archetypes; forced hand-written JSX is
> logged as a gap and fixed in the shared layer.**

Concretely, this build must not introduce:

- new shell archetypes (Overview and Child are the inventory)
- new `ShellMode` values or mode renderers
- new Platform Elements (`text`, `rich-text`, `item-collection`,
  `relation-summary` cover everything Category renders)
- new renderer components under `ts/components/admin/schema/`
- new framework abstractions or registry systems
- changes to `EntityDrawer`, `EntityTable`, `DrawerTabs`, `ActionFooter`,
  `ReadBlock`, `AsyncSection`, `useInlineConfirm`, `ModuleStatusPill`,
  `ModuleNotificationPanel`, `InlineEditorShell`, `presentation.ts`,
  `modeContext`, `overviewShell`, `childShell`, or `evaluateModule` —
  **with one sanctioned exception**: the v1.2 Collection-placement
  amendment (Amendment Log 2026-07-07) authorises the minimal plumbing
  that realises `ShellSlot.footer` (the placed slot's footer re-selection
  reaching the shell frame's footer resolution, e.g. via `EntityDrawer`'s
  `PlacedShell` and an optional shell prop). Nothing beyond what that
  amendment names.

What this build **is allowed** to add — the designed extension points:

| Kind | Where |
|---|---|
| New `ModuleDefinition`s | `ts/drawer-kit/utils/moduleNotifications.ts` (DNA growth — every station added its own) |
| New station hook | `ts/hooks/useCategoryStation.ts` |
| New manifest + registry entry | `ts/components/admin/schema/entities/category.ts` + one line in `entities/index.ts` |
| New shell bindings | `ts/components/admin/schema/shells/bindings/category.tsx` |
| New TableSchemas | `ts/components/admin/schema/tables/category.tsx` |
| New workstation registry entry | one entry in `schema/workstations.ts` + one `WorkstationId` union member |
| New icon registry entries | `schema/icons.tsx` (`MODULE_ICONS` / `NAV_ICONS` sections) |
| New surface + step components | `ts/components/admin/workstations/` (environments, not framework) |
| New editor component | `ts/components/admin/editors/CategoryOverviewEditor.tsx` (editors are per-module by design) |
| New backend controller + meta model | `src/Modules/Admin/Http/`, reusing `StationLifecycle.php` unchanged |
| New API fetchers + types | `ts/api/endpoints/admin.ts`, `ts/api/types/admin.ts` |
| New snapshot fixtures | `scripts/module-state-snapshot.mjs` cases |
| v1.2 contract fields (already amended) | `schema/types.ts`: `ShellSlot.footer?: string[]` + `EntitySchema.placements.collections?: Record<string, ShellSlot>` — declared by Amendment Log v1.2; S6 is their first realisation |

**Gap protocol (locked).** If any phase forces work outside these two lists:
stop, do not work around it, document the blocker (what was attempted, which
contract blocks it, why no existing extension point expresses it), and
propose the smallest amendment via the Amendment Log path. The S6 gap report
(Phase G) is the only sanctioned source of new abstractions.

---

## 2. Recorded scope decisions (D1–D8)

Settle these once, here, so no phase re-litigates them.

**D1 — Frontend visibility = lifecycle status.** Category's public visibility
is its `platform_status`, not a separate `cz_category_frontend_visible` term
meta. The roadmap doc's separate-flag proposal is superseded: a category
surfaces on the public Cost Builder only when it is `active` **and** contains
at least one active published service (both conditions, as the roadmap
intended). One lifecycle system, no parallel visibility concept.

**D2 — Lazy status default `active`, no migration script.** A term with no
station meta reads as `platform_status: 'active'`, `module_status.overview:
'settled'`. Existing categories keep today's behaviour with zero data
migration; removing the code restores current behaviour exactly (rollback is
trivial). No activation hook, no backfill pass.

**D3 — Inline creation stays, and stays `active`.** The service editor's
inline category flow (`createServiceCategory` /
`updateServiceCategory`) is untouched and continues to produce
immediately-usable categories (per D2, no meta = active). Station-created
categories (Phase F create flow) follow the station convention instead:
created `disabled`, activated by Publish — matching service creation
(`AdminServicesController` creates with `platform_status: 'disabled'`). The
asymmetry is deliberate and recorded: inline creation is a convenience path
inside a service edit; the station path is lifecycle-managed.

**D4 — Two modules: `overview` (owned) + `services` (relation summary
gateway), plus the services collection surface (v1.2).**
- `overview` — name, slug (read-only), description. Full draft envelope.
- `services` — the **summary gateway** into the category's assigned
  services: a `metrics` element (headline: total services; copy: active vs
  inactive/disabled split) with a `view` footer action. Exact precedent:
  the Service drawer's Package Summary shell (`servicePackageSummaryShell`
  — overview archetype, `metrics`, `footer: ['view']`), placed in the
  Connections tab as a `mode: 'summary'` slot. Pure synchronous projection
  of station data (Boundary Test: no own lifecycle → lightweight
  `ModuleDefinition` over `{ total, active, disabled }` counts, the
  `tierFeaturesModule` precedent). Read-only in v1 — assignment stays on
  the service side (relational ecosystem: the service is the anchor; the
  category emphasises the relationship).
- **Services collection** — the gateway's `view` transits to the Category
  Services collection surface: the shared `serviceOverviewShell` repeated
  once per assigned service in the `summary` viewpoint, each card carrying
  a `view` footer that opens the real Service drawer. Declared as
  `placements.collections.services = { module: 'service', mode: 'summary',
  footer: ['view'] }` per the v1.2 Collection placement (§8 of the
  architecture doc): one shell, one binding, one mode per card; the surface
  owns the N bindings; no new mode, archetype, or renderer. (Summary-mode
  fallback renders the shell's `text`/`term`/`rich-text` elements via their
  `details` renderers; `relation-summary` is connections-only and drops
  out — a naturally compact card with zero renderer additions.)

The full Category flow this yields:

```
Category drawer
├─ Details tab      categoryOverviewShell           details mode
└─ Connections tab  categoryServicesShell (metrics) summary mode · footer [view]
                        │ view
                        ▼
                    Category Services collection surface
                        serviceOverviewShell × N     summary mode · footer [view]
                        │ view (per card)
                        ▼
                    the real Service drawer (ServiceViewStep — existing station)
```

**D5 — Slug is immutable in v1.** Displayed in Details as read-only `text`;
not present in the editor. Renaming a category keeps its slug (WP behaviour;
avoids public URL churn). Slug editing is future scope with its own
redirect/consistency story.

**D6 — Delete guard.** Permanent delete is blocked while any service (in any
platform status) is assigned to the category — the backend returns 409 with
the assigned count, the frontend surfaces it via the existing inline-confirm
error path. `wp_delete_term` silently severs relationships; the guard makes
detachment an explicit prior step (unassign via each service's overview).

**D7 — Selector scoping.** Admin category selectors (service overview editor,
catalog tab bar) list **live** categories (`active` + `disabled`) only.
Archived/trashed categories never appear in pickers, but remain rendered on
services already assigned to them (read side is unaffected — no data loss,
no broken chips). The public Cost Builder gate is D1's, stricter (`active`
only).

**D8 — Travel surfaces via Bin only.** Category archived/trashed rows join
the Bin workstation as a Category pane (the `placements.travel.bin`
consolidated two-scope TableSchema — the S4-realised optional slot, second
real consumer). No hidden `category-archived` / `category-trash` workstation
routes in v1: the service equivalents exist for legacy-route reasons Category
does not have. `WorkstationId` therefore grows by exactly one member
(`category-catalog`).

---

## 3. Phase map and dependencies

```
A  Backend Station DNA (meta model + lifecycle wiring)
│
B  REST API & lifecycle routes + public gate + selector scoping
│
C  Frontend API layer + useCategoryStation
│
D  Frontend DNA + editor + shell bindings + manifest + tables + registries
│
E  Workstation registration (registry entry + WorkstationId)
│
F  Surfaces: Category workstation, drawer steps, Bin pane
│
G  Validation, snapshots, regression, S6 gap report
```

Strictly sequential A→B→C→D; E and F depend on D; G closes. Each phase is a
separate commit (or small commit series) that leaves the platform green:
phases A–C ship dark (no UI change), D ships dead code plus registry entries
consumed only in E/F, so any phase can be reverted independently until F
lands.

---

## Phase A — Backend Category Station DNA

**Objective.** Give Category a real station: lifecycle state and a module
envelope stored on the taxonomy term, with `StationLifecycle.php` as the
authoritative transition engine — WordPress taxonomy remains storage and
relationships only.

**Scope.**
- Define the term-meta model, one consolidated key `cz_category_meta`
  (mirror of the service's `cz_service_meta` array, adapted to one owned
  module):
  - `platform_status` — `'active' | 'disabled' | 'archived' | 'trashed'`
  - `previous_platform_status` — for engine-computed restore
  - `module_status` — `{ overview: 'not-configured' | 'pending' | 'settled' }`
  - `overview_draft` — the overview module's draft envelope
    (`{ name, description }`; slug excluded per D5), or absent
- A `CategoryMeta` support class (pattern: the existing meta resolution in
  `AdminServicesController` / `MetaSchema::resolvePlatformStatus`) owning:
  read-with-lazy-defaults (D2: no meta → `active` / `overview: settled`),
  write, and the draft-preferred projection used by responses.
- All transitions computed through the existing `StationLifecycle` static
  API (`applyStatus`, `capturePrevious`, `restore`, `canDelete`, …) —
  **zero changes to `StationLifecycle.php`**. Participation: canonical
  (same as Service).
- Delete guard predicate (D6): count of `cz_service` posts assigned to the
  term, any status.

**Files.**
- New: `src/Modules/Admin/Support/CategoryMeta.php` (name/location matching
  the existing Support pattern next to `StationLifecycle.php`).
- Read-only reference (no edits): `src/Modules/Admin/Support/StationLifecycle.php`,
  `src/Core/TaxonomyRegistrar.php` (taxonomy stays exactly as registered).

**Dependencies.** None — first phase.

**Validation.**
- Unit-level (or WP-CLI smoke): a term with no meta resolves
  `active/settled`; transitions round-trip through `StationLifecycle`
  (publish → toggle → archive → restore resolves `previous_platform_status`;
  delete guard blocks with assigned services and allows at zero).
- Grep check: no writes to term fields WP owns (`name`/`slug` untouched by
  the meta layer); no new lifecycle constants anywhere (all imported from
  `StationLifecycle`).

**Expected outcome.** A dark, endpoint-less DNA layer: categories have
canonical station state with behaviour-preserving defaults. Nothing
user-visible changes.

**Risks.**
- *Default drift*: a wrong lazy default flips existing categories invisible.
  Mitigate with an explicit test asserting the no-meta projection equals
  today's implicit behaviour.
- *Meta shape churn*: later phases reading raw meta instead of
  `CategoryMeta` would fork the defaults. Rule: `CategoryMeta` is the only
  reader/writer of `cz_category_meta`.

**Rollback.** Delete the support class. No data migration ran (D2), so
nothing to unwind; stray `cz_category_meta` rows are inert.

---

## Phase B — REST API, lifecycle routes, public gate, selector scoping

**Objective.** Expose the Category station over REST with the exact route
grammar the Service station established, and apply the D1/D7 gates to the
existing surfaces that list categories.

**Scope.**
1. New controller `AdminCategoriesController` (registered from
   `AdminModule::register()` beside `AdminServicesController`), route family
   mirroring the service grammar under `compuzign/v1`:

   | Route | Method | Behaviour |
   |---|---|---|
   | `/admin/categories` | GET | List with station projection: id, name, slug, description, `platform_status`, `previous_platform_status`, `module_status`, draft-preferred overview fields, `hasDraft`, assigned-service count. Default scope excludes archived/trashed; `?platform_status=archived\|trashed` returns that bin (same param contract as `/admin/services`). |
   | `/admin/categories` | POST | Station create (D3): term + meta, `platform_status: 'disabled'`, `overview: 'pending'` or `'settled'` per payload completeness. |
   | `/admin/categories/{id}/overview` | PUT | Save overview draft (name, description); marks `overview: 'pending'`. |
   | `/admin/categories/{id}/overview/settle` | POST | Commit draft → term (`wp_update_term` name, description meta), clear draft, `overview: 'settled'`. |
   | `/admin/categories/{id}/overview/revert` | POST | Discard draft; `module_status` re-derives from settled state. |
   | `/admin/categories/{id}/status` | PATCH | Engine transition via `StationLifecycle::applyStatus` (+ `capturePrevious`). Invalid target → 422, same as services. |
   | `/admin/categories/{id}/restore` | POST | Server-driven restore resolving `previous_platform_status`. |
   | `/admin/categories/{id}` | DELETE | Permanent delete: only when trashed (`StationLifecycle::canDelete`) **and** the D6 guard passes; guard failure → 409 `{ assigned_count }`. |

   Note the existing inline routes (`/admin/service-categories`,
   `/admin/service-categories/{id}`) are **not moved, renamed, or changed**
   (D3). The new family is additive.
2. Selector scoping (D7):
   - The catalog response's `categories` array
     (`AdminServicesController::catalog`) filters to live categories and
     now carries `platform_status` per entry (additive field).
   - Any other admin category list feeding pickers gets the same live
     filter (audit each `get_terms` call sites for `cz_service_category`
     in the admin controllers).
   - Service detail/read paths that *render* assigned categories stay
     unfiltered (D7 read-side rule).
3. Public gate (D1): `PricingBuilder::buildResponse()` requires
   `CategoryMeta` status `active` for a term to surface — applied uniformly
   to both the curated `ORDERED_CATEGORIES` pass and the appended-terms
   pass (a disabled curated category disappears from the public builder;
   this is the feature). Existing "has at least one active service" logic
   is unchanged and remains the second condition.

**Files.**
- New: `src/Modules/Admin/Http/AdminCategoriesController.php`
- Edit: `src/Modules/Admin/AdminModule.php` (one registration line)
- Edit: `src/Modules/Admin/Http/AdminServicesController.php` (catalog
  categories: live filter + status field — additive, no shape breaks)
- Edit: `src/Modules/CostBuilder/Services/PricingBuilder.php` (status gate)

**Dependencies.** Phase A (`CategoryMeta`).

**Validation.**
- Route-level smoke for every row of the table above, including: 422 on
  invalid transition, 409 on guarded delete, bin scoping on the list route.
- Public parity check: with all categories at lazy-default `active`, the
  Cost Builder response is **byte-identical** to pre-S6 (D1 gate is a no-op
  until someone disables a category). This is the phase's regression anchor.
- Permission parity: the new routes use the same `permission_callback`
  policy as the service family.

**Expected outcome.** Category is fully lifecycle-operable via REST; admin
pickers stop offering binned categories; public surface behaviour is
unchanged until a category is explicitly disabled/binned.

**Risks.**
- *Public regression* is the big one — the PricingBuilder gate touches the
  live Cost Builder. The byte-identical parity check above is mandatory
  before merge.
- *Picker regression*: the service overview editor must still round-trip a
  service assigned to a now-binned category (renders, saves without
  dropping the assignment). Add an explicit manual case.
- *Curated-list surprise*: disabling a curated `ORDERED_CATEGORIES` entry
  removes a fixed public section. Accepted per D1; called out in the
  release note.

**Rollback.** Remove the controller registration and revert the two edited
files. Terms and meta persist harmlessly (lazy defaults).

---

## Phase C — Frontend API layer + `useCategoryStation`

**Objective.** Deliver Category Station DNA to the frontend through the
established station-hook contract: the S4 `modules: {…}` shape, draft-
preferred data, handlers, loading flags.

**Scope.**
- API types: `CategoryStationItem` (the list-route projection),
  `CategoryOverviewDraft`, response types — in `ts/api/types/admin.ts`
  beside the service types.
- Fetchers in `ts/api/endpoints/admin.ts` for every Phase B route
  (list, create, save/settle/revert overview, status, restore, delete).
  The existing `createServiceCategory` / `updateServiceCategory` fetchers
  stay untouched.
- `ts/hooks/useCategoryStation.ts` — modelled on `useServiceStation`,
  radically smaller (one owned module):
  - inputs: the category (from the list surface), `onRefresh`
  - draft-preferred derivation for overview (draft → settled), via the
    `stationPrimitives` helpers where they fit
  - `modules: { overview: ModuleState, services: ModuleState }` computed
    with `evaluateModule` against the Phase D definitions (`NoteContext.platformStatus`
    = the category's status; `hasDraft`, `moduleTransition` from meta)
  - `hasDraft`, `canPublish` (overview complete), `loading` flags
  - actions: `saveOverview`, `revertOverview`, `settleModules`,
    `publishCategory`, `toggleActive`, `archiveStation`, `trashStation`
    — every mutation calls `onRefresh`, per the platform state contract
- A list hook is **not** built: the Category workstation uses `useApi`
  directly against the list fetcher (pattern: `useAdminCatalog`), decided
  in Phase F; this phase only ships the fetchers.

**Files.**
- New: `ts/hooks/useCategoryStation.ts`
- Edit: `ts/api/types/admin.ts`, `ts/api/endpoints/admin.ts` (additive)
- Read-only reference: `ts/hooks/useServiceStation.ts` (the `modules`
  shape, lines ~90–130), `ts/hooks/stationPrimitives.ts`

**Dependencies.** Phase B (routes); Phase D's module definitions are
imported here — build C and D in one branch, commit DNA definitions first
if a strict file-level ordering is wanted.

**Validation.**
- Typecheck is the primary gate (the hook compiles against `ModuleState`,
  `NoteContext`, `ShellBinding` handler shapes with no `any` leaks beyond
  the established patterns).
- DNA boundary grep: the hook owns every endpoint call; nothing under
  `ts/components/admin/schema/` imports a fetcher.

**Expected outcome.** A station hook interchangeable in shape with
`useServiceStation`'s module delivery — the drawer step in Phase F consumes
it exactly the way `ServiceViewStep` consumes its hook.

**Risks.** Divergence from the `modules:{…}` shape (e.g. bespoke status
fields) would leak into the step and break the assembly pattern — review
against `usePromotionStation` for shape parity.

**Rollback.** Delete the hook; revert the additive API edits.

---

## Phase D — Frontend DNA, editor, shell bindings, manifest, tables, registries

**Objective.** Declare Category to the schema layer: two `ModuleDefinition`s,
one editor, one bindings file, one manifest, TableSchemas, and the registry
entries — all configuration of existing archetypes.

**Scope.**
1. **Module definitions** (`ts/drawer-kit/utils/moduleNotifications.ts`,
   additive DNA growth):
   - `categoryOverviewModule: ModuleDefinition<{ name; description; slug }>`
     — problems: name missing (description optional or required — match the
     service overview's completeness stance: required); `emptyPrompt: 'Edit
     and describe this category.'`; `includeDraftInTail: true`;
     `resolveStatus` per the canonical 5-state resolution (settled+active →
     `active`; incomplete → `pending-dim`; complete-unsettled →
     `pending-full`; platform disabled → `disabled`).
   - `categoryServicesModule: ModuleDefinition<{ total: number; active:
     number; disabled: number }>` — precedent: `tierFeaturesModule`;
     `isEmpty: total === 0`; `emptyPrompt: 'Assign services to this
     category from the Service Catalog.'`; no problems (read-only
     projection, D4); status follows platform status.
2. **Editor**: `ts/components/admin/editors/CategoryOverviewEditor.tsx` —
   name input + description textarea on the existing `cz-tf-*` controls,
   controlled `draft` + `onChange`, no slug field (D5). No category-selector
   logic (that lives in the *service* overview editor and is untouched).
3. **Shell bindings**: `ts/components/admin/schema/shells/bindings/category.tsx`
   - `categoryOverviewShell` — **overview archetype**; `dna:
     categoryOverviewModule`; header (title `Category Overview`, icon per
     the registry addition below, `scopeClass: 'drawerOverview'`); content:
     `name` → `text`, `slug` → `text`, `description` → `rich-text`; footer/
     actions: the standard `DETAILS_ACTIONS` pair (`edit`,
     `discard-draft` gated on `hasDraft`) exactly as the tier/promotion
     bindings declare them; `editor.render` → `CategoryOverviewEditor` in
     the `ShellEditSession` contract.
   - `categoryServicesShell` — the **summary gateway** (D4), a carbon copy
     of the `servicePackageSummaryShell` pattern: **overview archetype**;
     `dna: categoryServicesModule`; content: one `metrics` element binding
     `{ headline: 'N services', copy: 'X active · Y inactive' }` (shape per
     `MetricsValue`); `footer: { actions: ['view'] }` with the `view`
     action declared in the shell's Action Group. The `view` handler
     (surface-delivered) transits to the services collection surface.
   - The shared `serviceOverviewShell` registers in the category manifest's
     `shells` record under the `service` key (S4 related-stations rule) —
     it is the collection card; no new shell object is created for it.
4. **Manifest**: `ts/components/admin/schema/entities/category.ts` —
   `CATEGORY_ENTITY: EntitySchema`:
   - `id: 'category'` (already in the §9 union), labels, identity
   - `lifecycle: { participation: 'canonical', statuses: ['draft','active','disabled','archived','trashed'] }`
     (declared inventory mirrors the service manifest)
   - `shells: { overview: categoryOverviewShell, services:
     categoryServicesShell, service: serviceOverviewShell }` (the third
     entry is the shared collection card, per the S4 related-stations rule)
   - `actions`: the entity travel set (archive / trash / restore / delete
     with confirm) mirroring the promotion manifest's declarations
   - `placements.drawer`: `details: [{ module: 'overview', mode: 'details' }]`,
     `connections: [{ module: 'services', mode: 'summary' }]` — the gateway
     slot uses the `summary` viewpoint inside the Connections tab, exactly
     like the Service manifest's Package Summary slot (`metrics` has a
     summary-only renderer; a `connections`-mode slot would render an
     empty body)
   - `placements.collections`: `{ services: { module: 'service', mode:
     'summary', footer: ['view'] } }` — the v1.2 Collection placement;
     first realisation of both `collections` and `ShellSlot.footer`
   - `placements.table`: the catalog TableSchema (below)
   - `placements.travel`: `archived` + `trashed` + `bin` TableSchemas (D8 —
     `bin` is the consumed one; `archived`/`trashed` declared for
     completeness of the travel preset)
5. **Tables**: `ts/components/admin/schema/tables/category.tsx` — catalog
   columns (name, slug, services count, status pill via the
   `presentation.ts` chokepoint, description excerpt) with row action
   `view`; travel preset columns + `restore`/`trash`/`delete` row actions
   copying the service travel schema's grammar (`busyLabel`, icon-only
   danger, confirm prompts). TRAVEL_PILL usage comes from
   `presentation.ts` — no local pill maps.
6. **Registries**: one line in `schema/entities/index.ts`
   (`category: CATEGORY_ENTITY`); `schema/icons.tsx` gains a `category`
   glyph in `MODULE_ICONS` and `NAV_ICONS` (registry files are designed to
   grow; no renderer changes).

**Files.** As enumerated: 4 new (`category.tsx` bindings, `category.ts`
manifest, `category.tsx` tables, `CategoryOverviewEditor.tsx`), 3 additive
edits (`moduleNotifications.ts`, `entities/index.ts`, `icons.tsx`).

**Dependencies.** Phase C types (shell-data interfaces reference the API
projections).

**Validation.**
- Typecheck: the manifest satisfies `EntitySchema` with **no type edits
  beyond the two v1.2 fields** (`ShellSlot.footer`,
  `placements.collections` — already amended, realised here) — if
  `EntitySchema` needs anything further to express Category, that is a
  Phase G gap, full stop.
- Element audit: every content element uses an existing
  `PlatformElementId` with an existing registered renderer for its placed
  mode (`text`/`rich-text` details; `item-collection` falls back
  details→connections per the Fallback Rule). Zero `custom` uses expected;
  any `custom` use is logged per the escape-hatch policy.
- Grep: no JSX in the manifest or tables beyond `cell`/`icon` projections
  (the boundary the service tables established); bindings' only JSX is the
  `editor.render` wiring (established pattern).

**Expected outcome.** Category is fully described to the schema layer as
pure configuration. Nothing renders yet.

**Risks.** Editor session-contract mismatch (drafts here are object drafts
→ use `patch`; `replace` unused). Keep `ShellEditSession` usage identical
to the promotion overview binding.

**Rollback.** Delete the four new files, revert three additive edits.

---

## Phase E — Workstation registration

**Objective.** Make Category reachable: one registry entry, one union
member.

**Scope.**
- `ts/api/types/admin.ts`: `WorkstationId` union += `'category-catalog'`
  (the declared cost of "adding a workstation = one registry entry"; D8
  keeps it to exactly one member).
- `ts/components/admin/schema/workstations.ts`: one entry —
  `{ id: 'category-catalog', label: 'Categories', group: 'catalog',
  iconId: 'category', surface: { kind: 'component', component: () =>
  CategoryCatalogWorkstation } }`. Component surface, not `entity-table`,
  because a catalog that opens drawers needs `openAction`, exactly the
  Service Catalog precedent.
- `WorkstationRouter`, `Sidebar`: **zero changes** — registry dispatch
  picks the entry up. This is the S5 promise being cashed; verifying it is
  itself part of the S6 validation.

**Files.** 2 additive edits + the Phase F component import.

**Dependencies.** Phase F's surface component must exist for the import —
land E and F together (E is listed separately because it is the
architecture-validation moment: *adding a workstation = one entry*).

**Validation.** Sidebar shows Categories under Catalog with the new glyph;
route dispatches; no router/sidebar diffs beyond none.

**Expected outcome / Risks / Rollback.** Nav entry live; risk is nil;
rollback is two reverted lines.

---

## Phase F — Surfaces: Category workstation, drawer steps, Bin pane

**Objective.** Assemble the environments: the catalog surface, the
create/view drawer steps (manifest-assembled via `EntityDrawer`), and the
Bin's Category pane.

**Scope.**
1. **`CategoryCatalogWorkstation.tsx`** (`ts/components/admin/workstations/`)
   - Four-zone `Workstation` frame (AdminShellSystem-v2), header with
     count/subtitle + `+ New Category` action.
   - Data: `useApi` against the Phase C list fetcher; `refreshKey`
     contract honoured (refetch on bump).
   - Body: `EntityTable` with `CATEGORY_ENTITY.placements.table`,
     `frame="ws"`; handlers renderer-side (`view` → open drawer) — the DNA
     boundary the registry declares.
   - Drawer opening via `openAction({ mode: 'drawer', … })` with steps,
     mirroring `ServiceCatalogWorkstation`'s `openServiceDrawer` /
     `openCreateDrawer` pair, passing `openAction` + `onRefresh` through
     `initialStepData`.
2. **`CategoryViewStep`** — the manifest-assembly step (pattern:
   `ServiceViewStep`, drastically smaller):
   - `useCategoryStation` for DNA; assembles
     `bindings: { overview: …, services: … }` (`ShellBinding`: data,
     `state` from `modules`, `hasDraft`, handlers keyed `edit` /
     `discard-draft`, `busy`). The `services` gateway binding additionally
     carries a `view` handler that transits to the services collection
     step (D4 flow).
   - `EntityDrawer entity={CATEGORY_ENTITY}` with the notification-panel
     accordion (`openPanel`/`onTogglePanel`) — drawer owns tab state
     (no footer-per-tab gating is planned; if the footer turns out to need
     the active tab, pass controlled tab props, the S4-provided option).
   - Edit overlay: step-owned `editingSection`, working draft + original
     snapshot, `InlineEditorShell` around the binding's `editor.render` —
     the established Edit Granularity flow.
   - Footer via `setFooter`: split button (Disable/Enable + Archive/Trash
     dropdown per the service footer grammar, driven by
     `StationLifecycle`-shaped state from the hook) + Publish + Cancel;
     terminal actions bypass the close guard (`closeWithoutGuard`
     pattern); close guards for dirty editor and pending modules via
     `setCloseGuard` + ref.
   - Step chrome (confirm modals, save feedback) through `EntityDrawer`'s
     `children`/`trailing` slots — surface content, out of schema.
3. **`CategoryServicesStep`** — the collection surface (v1.2, first
   realisation):
   - Reached from the gateway's `view` action via the established
     `openAction` step flow (the same mechanism `ServiceCreateStep` uses to
     hand off to `ServiceViewStep`).
   - Reads the slot from `CATEGORY_ENTITY.placements.collections.services`;
     resolves the shell through the manifest's `shells` record
     (`serviceOverviewShell` under `service`); assembles **one
     `ShellBinding` per assigned service** (title/category/description
     projection + `ModuleState`; a `view` handler per card) — the surface
     owns the N bindings, per the Collection placement rules.
   - Renders the existing archetype renderer inside
     `<ModeProvider mode={slot.mode}>`, mapped over the bindings, with the
     slot's `footer: ['view']` re-selection. **Zero hand-written
     `.drawerModule` JSX; zero new renderer components** — the map lives in
     the step. (A shared collection helper is *not* built in S6; that
     extraction waits for the second migrated consumer per the Governance
     Rule.)
   - Each card's `view` opens the real Service drawer via `openAction`
     with `ServiceViewStep` — the existing cross-station transit the
     catalog uses; the step assembles the same `initialStepData` payload
     (`service`, `packages`, `allCategories`, `onRefresh`, `openAction`),
     which sets its data requirements (the surface must have, or fetch,
     the catalog payload for the assigned services).
   - **v1.2 plumbing (the one sanctioned shared-layer touch, §1):**
     threading the placed slot's `footer` into the shell frame's footer
     resolution — an optional prop on the archetype renderers consumed by
     `resolveFooterActions` (select-only against the schema's Action
     Group), passed by `EntityDrawer`'s `PlacedShell` and by collection
     surfaces. Nothing else in the locked renderers changes; the
     `connections` View-only override is untouched.
4. **`CategoryCreateStep`** — pattern: `ServiceCreateStep`, one module:
   overview New state (Edit enabled, blank placeholders), local
   create-step notes per the locked create-step convention; Save creates
   via the station POST (D3: born `disabled`), closes and re-opens the
   view step for the new category. The `services` shell renders Locked
   (child gated on parent existence — `requiresParent` context or simply
   omitted pre-creation; follow whichever the service create step's
   locked-module treatment maps to, without new concepts).
5. **Bin pane** (`BinWorkstation.tsx` edit): a Category section rendering
   `CATEGORY_ENTITY.placements.travel.bin` through `EntityTable` with
   restore/trash/delete handlers against the Phase C fetchers — mirroring
   the existing service table in the same file. Delete surfaces the D6
   409 message through the existing error affordance.

**Files.**
- New: `ts/components/admin/workstations/CategoryCatalogWorkstation.tsx`
  (hosting both steps, as the service pattern does, or a separate
  `CategoryViewStep.tsx` if it grows past the file-size norms of its
  siblings)
- Edit: `ts/components/admin/workstations/BinWorkstation.tsx` (additive
  pane)

**Dependencies.** C, D, E.

**Validation.**
- The budget grep (the phase's core test): **zero hand-written
  `.drawerModule` JSX** in the new files — every module card renders
  through `OverviewShell`/`ChildShell` via `EntityDrawer`. Any forced raw
  JSX stops the phase (gap protocol).
- Behavioural walk: create → publish → edit/draft → discard → settle →
  disable → archive → restore → trash → delete-guard (409 with assigned
  service) → unassign → delete. Pills obey the Presentation Status
  Contract (Active/Pending/Disabled only; travel labels only in
  Bin).
- Inline flows regression: creating/renaming a category from the service
  overview editor still works and reflects in the Category workstation
  after refresh.

**Expected outcome.** Category is live end-to-end from a manifest + the two
shells only.

**Risks.**
- *Footer/guard complexity*: the service footer grammar carries
  new-never-published nuances; Category should implement the same rules
  but with one module the surface is far smaller. Copy the decision table
  from ServiceDrawerModuleArchitecture-v1 §8 rather than re-deriving.
- *Collection transit payload*: opening the real Service drawer from a
  category card needs the same `initialStepData` the catalog assembles
  (`service`, `packages`, `allCategories`, `onRefresh`). If the category
  surface lacks part of that payload, fetch it — do not fork a reduced
  Service drawer. Refresh propagation must flow both ways (editing a
  service from the collection refreshes the collection's counts and the
  gateway metrics on return).

**Rollback.** Remove the workstation files + registry entry (Phase E
lines) + Bin pane block. Backend and schema layers can stay dark.

---

## Phase G — Validation, snapshots, regression, S6 gap report

**Objective.** Prove the S6 claim and close the phase in the Amendment Log.

**Scope & validation criteria.**
1. **Mode-renderer snapshot** (`scripts/mode-renderer-snapshot.mjs`): run
   in compare mode — **must pass with zero drift and zero new entries**.
   This is the machine proof that Category shipped without new element ×
   mode renderers.
2. **Module-state snapshot** (`scripts/module-state-snapshot.mjs`): add
   fixture rows for `categoryOverviewModule` (complete-active,
   complete-pending-draft, incomplete, not-configured, platform-inactive)
   and `categoryServicesModule` (empty, populated, platform-inactive);
   `--update` once to extend the baseline; existing rows must be
   **byte-identical** (no drift in any service/tier/promotion state —
   proves DNA additions didn't disturb shared evaluation).
3. **Budget audit** (grep-based, recorded in the gap report):
   - no new files under `ts/components/admin/schema/` except
     `entities/category.ts`, `bindings/category.tsx`, `tables/category.tsx`
   - no diffs to the locked renderer/contract files (list in §1)
   - no new `ShellMode`/`PlatformElementId` members; no `custom` elements
   - the only `schema/types.ts` diff is the two v1.2 fields; the only
     locked-renderer diff is the v1.2 slot-footer plumbing (§1 exception)
   - `presentation.ts` untouched; no local pill maps introduced
4. **Regression matrix** (manual):
   - Public Cost Builder byte-parity with all categories active; category
     disappears when disabled; reappears on enable (D1)
   - Service drawer end-to-end unaffected (open, edit, publish, travel)
   - Bin: service pane unchanged; category pane restore/delete flows
   - Selector scoping (D7) incl. the binned-assigned-category render case
5. **Gap report** — appended to SchemaWorkstationArchitecture-v1.md §14 as
   the S6 amendment entry, whatever the outcome:
   - if clean: record "Category onboarded within budget; zero gaps" — the
     architecture-complete claim is proven
   - if gaps: each with the blocked intent, the contract that blocked it,
     the workaround *not* taken, and the smallest amendment proposed
   - the **Collection placement realisation review**: the "detail-list"
     shape was resolved *ahead of* S6 by the v1.2 amendment (Amendment Log
     2026-07-07 — card = `summary` viewpoint; repetition = placement;
     cardinality = surface). The gap report confirms the realisation
     stayed inside what v1.2 names: the two contract fields, the
     slot-footer plumbing, the step-owned map — nothing more. Any pressure
     beyond that (e.g. per-card density filtering, collection-level
     chrome) is reported as a gap, not absorbed. The tier package-overview
     and promotion list card surfaces remain recorded as the *future*
     consumers that migrate onto Collection placement — explicitly not S6
     scope; their migration is when the shared collection helper may be
     extracted (Governance Rule).
6. **Docs closure**: mark the roadmap doc superseded-by-D1 where relevant;
   update the §12 phase table (S6 ✓ + gap-report pointer).

**Files.** `scripts/module-state-snapshot.mjs` (+ regenerated
`scripts/__snapshots__/*.json`), `docs/architecture/SchemaWorkstationArchitecture-v1.md`
(Amendment Log), `docs/architecture/category-frontend-visibility-roadmap.md`
(status note).

**Dependencies.** A–F complete.

**Expected outcome.** S6 closed with a recorded verdict; the architecture
migration is proven complete by a new entity onboarding as pure
configuration — or the precise, minimal list of what stops that claim.

**Risks.** Scope creep disguised as validation: fixing unrelated
observations found during the matrix belongs in follow-up work, not in S6.

**Rollback.** n/a (documentation + fixtures).

---

## Amendment Log

| Date | Amendment | Notes |
|---|---|---|
| 2026-07-07 | v1 — blueprint approved for execution | Produced from the S6 architecture audit (same date). Decisions D1–D8 recorded; phases A–G defined; budget and gap protocol restated from SchemaWorkstationArchitecture-v1 §12. |
| 2026-07-07 | v1.1 — Collection placement alignment | D4 and Phases D/F/G revised to the architecture's **v1.2 amendment** (Collection placement / detail-list ruling): the Category `services` module becomes the summary gateway (`metrics` element + `view` footer, Package Summary pattern, placed `mode: 'summary'` in the Connections tab) transiting to the Category Services collection surface — the shared `serviceOverviewShell` repeated per assigned service in the `summary` viewpoint with a per-card `view` footer opening the real Service drawer. First realisation of `placements.collections` and `ShellSlot.footer`; §1 gains the one sanctioned plumbing exception. No new modes, archetypes, elements, or renderer components. |
