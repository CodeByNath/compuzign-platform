# Platform Entity Onboarding Guide — v1

**Status:** Superseded implementation guide; preserved for historical reference
**Scope:** Schema-workstation S1–S6 onboarding process before drawer relocation
**Current authority:** [AGENTS.md](../../AGENTS.md), [Architecture Health Checklist](ArchitectureHealthChecklist-v1.md), and the owning [Code Map](../code-map/000-README.md)

> The paths and additive budgets below describe the former
> `components/admin/schema/` layout and monolithic notification module. Do not
> follow them for new work; locate current ownership through the Code Maps and
> source.

Practical checklist for adding **any new entity (Station)** to CompuZign on
the completed schema-driven architecture (S1–S5 done; S6 blueprint written).
Follow the steps in order; each step names its pattern precedent in the
codebase. **Onboarding an entity is configuration, not framework work** — if
a step forces you to build framework, stop and use the Gap Protocol (§15).

Companion documents (read before starting; this guide never overrides them):
- [SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md) — the layer model, shell archetypes, modes, placements, manifests, Amendment Log.
- [S6-CategoryOnboardingBlueprint-v1.md](S6-CategoryOnboardingBlueprint-v1.md) — the worked example this guide generalises (phases A–G, decisions D1–D8).
- [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) — the lifecycle engine and the three participation models.
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — the locked drawer contracts (header, tabs, Presentation Status).
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — module behaviour reference; §16 extension guidelines.

Path conventions:
- `src/…` = `wp-content/plugins/compuzign-platform/src/…` (backend)
- `ts/…` = `wp-content/plugins/compuzign-platform/resources/ts/…` (frontend)

---

## 0. Before you write anything

- [ ] Confirm the entity is a real **Station** — it owns lifecycle, state,
      and behaviour. If it is only a projection of another station's data,
      it is a Platform Element or a module on an existing station, not a new
      entity (Boundary Test, architecture doc §6).
- [ ] Confirm real consumers exist for every surface you plan. No
      speculative modules, modes, elements, or placements.
- [ ] Read the S6 blueprint end-to-end once. Your entity's plan should look
      like its phase map (A→B→C→D, then E/F, then G) with different nouns.

## 1. Backend Station DNA

Precedent: `CategoryMeta` plan (S6 Phase A); `AdminServicesController` meta
handling; `PackageSchema` for instance/occupant stations.

- [ ] Define one consolidated meta model for the entity
      (`platform_status`, `previous_platform_status`, `module_status`
      per module, one draft envelope per owned module).
- [ ] Create one Support class (e.g. `src/Modules/Admin/Support/<Entity>Meta.php`)
      that is the **only** reader/writer of that meta: lazy-default read,
      write, and the draft-preferred projection responses use.
- [ ] All status transitions go through the existing
      `StationLifecycle` static API (`applyStatus`, `capturePrevious`,
      `restore`, `canDelete`). **Zero changes to `StationLifecycle.php`.**
      No new lifecycle constants anywhere — import the vocabulary.
- [ ] WordPress stays the storage/relationship layer only. Never duplicate
      into meta what WP already owns (names, slugs, term relationships).
- [ ] Define any delete/guard predicates (e.g. Category's assigned-services
      409 guard) at this layer.

## 2. Lifecycle participation

Precedent: StationLifecycleEngine-v1 §2.

- [ ] Choose exactly one participation model and record it:
      - **canonical** — the whole record travels (Service, Category)
      - **travelling-instance** — each instance carries the envelope (Promotion)
      - **shell-occupant** — permanent shell, only the occupant travels (Tier)
- [ ] Use only the subset of the status vocabulary the entity needs
      (`draft | active | disabled | archived | trashed`); restore always
      lands `disabled`, never `active`.
- [ ] Honour the binding guard decisions: pending drafts block destructive
      writes everywhere (`discard_drafts: true` confirm path, `code:
      pending_drafts`).

## 3. Module definitions (frontend DNA)

Precedent: `categoryOverviewModule` / `tierFeaturesModule` (S6 Phase D.1).

- [ ] Add one `ModuleDefinition<T>` per module in
      `ts/drawer-kit/utils/moduleNotifications.ts` — additive DNA
      growth; the file's existing exports are untouched.
- [ ] Each definition declares `problems`, `emptyPrompt`, `isEmpty`,
      `resolveStatus` per the canonical 5-state resolution
      (AdminWorkstationDrawerPrinciples-v1 → Module Status Model).
- [ ] Read-only relation summaries get a lightweight definition over count
      data (the `tierFeaturesModule` precedent) — no problems, status
      follows platform status.
- [ ] No status logic anywhere else. Shells and steps never compute status.

## 4. REST endpoints

Precedent: the Category route family (S6 Phase B), mirroring the Service
grammar under `compuzign/v1`.

- [ ] New controller in `src/Modules/Admin/Http/`, registered from
      `AdminModule::register()`. One registration line.
- [ ] Follow the established grammar exactly:
      `GET /admin/<entities>` (list, `?platform_status=` bin scoping) ·
      `POST /admin/<entities>` (create, born `disabled`) ·
      `PUT /admin/<entities>/{id}/<module>` (save draft) ·
      `POST …/<module>/settle` · `POST …/<module>/revert` ·
      `PATCH …/{id}/status` (engine transition; invalid → 422) ·
      `POST …/{id}/restore` (server resolves `previous_platform_status`) ·
      `DELETE …/{id}` (only from trashed; guards → 409 with payload).
- [ ] Same `permission_callback` policy as the service family.
- [ ] Public-surface gates (if any) applied fail-closed, with a
      byte-identical parity check on the public response before merge.

## 5. Frontend API layer + station hook

Precedent: `useCategoryStation` plan (S6 Phase C); `useServiceStation`
`modules: {…}` shape; `stationPrimitives.ts`.

- [ ] Types in `ts/api/types/admin.ts`, fetchers in
      `ts/api/endpoints/admin.ts` — additive only.
- [ ] One `ts/hooks/use<Entity>Station.ts` delivering the S4 contract:
      `modules: { <key>: ModuleState }` via `evaluateModule`,
      draft-preferred data, `hasDraft`, `canPublish`, loading flags, and
      handlers for every mutation. Every mutation calls `onRefresh`.
- [ ] DNA boundary: the hook owns **every** endpoint call. Nothing under
      `ts/components/admin/schema/` imports a fetcher — grep it.
- [ ] List surfaces use `useApi` against the list fetcher directly (the
      `useAdminCatalog` pattern); no bespoke list hook.

## 6. EntitySchema (station manifest)

Precedent: `entities/category.ts` plan (S6 Phase D.4); existing
service/tier/promotion manifests. Contract: architecture doc §9.

- [ ] New `ts/components/admin/schema/entities/<entity>.ts` exporting one
      `EntitySchema`: id, labels, identity, `lifecycle`
      (participation + declared status inventory), `shells`, `actions`,
      `placements`.
- [ ] Manifest keys mirror backend module/endpoint keys **exactly**. A
      backend module without a matching manifest entry is a review-blocking
      finding.
- [ ] Related stations' shells register in this manifest's `shells` record
      under their registry key — the same shared shell object, never a copy
      (S4 related-stations rule).
- [ ] One line in `schema/entities/index.ts` to join the `ENTITIES`
      registry.
- [ ] The manifest must satisfy `EntitySchema` with **zero edits to
      `schema/types.ts`**. If it can't, that's a gap (§15), not a type
      patch.

## 7. Shell bindings

Precedent: `bindings/category.tsx` plan (S6 Phase D.3); tier/promotion
bindings. Contract: architecture doc §4–§6.

- [ ] New `ts/components/admin/schema/shells/bindings/<entity>.tsx` —
      one `ShellSchema` per module, using **only** the two archetypes
      (`overview`, `child`) and existing Platform Elements.
- [ ] Each binding: `dna:` references its `ModuleDefinition`; header
      (title/icon/scopeClass); content elements with `bind` closures (data
      access only — `when` is data-driven presence, never mode logic);
      footer + Action Group (the standard `edit` / `discard-draft` pair for
      details; `view` for gateways).
- [ ] Per-module editors are new components in
      `ts/components/admin/editors/` on the existing `cz-tf-*` controls,
      wired through `editor.render` in the `ShellEditSession` contract.
      Editing is module-level inside `InlineEditorShell` — permanently.
- [ ] Zero `custom` elements expected; any use is logged per the
      escape-hatch policy.
- [ ] Icons: add entries to `schema/icons.tsx` (`MODULE_ICONS`, and
      `NAV_ICONS` if the entity gets navigation). Registry growth only.

## 8. Table schemas

Precedent: `tables/category.tsx` plan (S6 Phase D.5); service travel
tables. Contract: architecture doc §9 `TableSchema`.

- [ ] New `ts/components/admin/schema/tables/<entity>.tsx` — catalog
      columns + row actions; travel preset (`archived`/`trashed`, and `bin`
      if the entity joins the Bin workstation's consolidated pane).
- [ ] Every pill comes from the `presentation.ts` chokepoint
      (`TRAVEL_PILL` on travel surfaces). **No local pill maps.**
- [ ] No JSX beyond `cell`/`icon` projections. Selection is surface state,
      never schema.
- [ ] Wire the schemas into the manifest's `placements.table` /
      `placements.travel`.

## 9. Workstation registration

Precedent: S6 Phase E — the "adding a workstation = one registry entry"
promise.

- [ ] `WorkstationId` union in `ts/api/types/admin.ts` grows by exactly the
      members the entity needs (prefer one; travel surfaces via the Bin
      pane, not hidden routes, per the D8 precedent).
- [ ] One entry in `ts/components/admin/schema/workstations.ts` (label,
      group, `iconId`, surface kind). Catalogs that open drawers register
      `{ kind: 'component' }`; pure tables may use `{ kind: 'entity-table' }`.
- [ ] `WorkstationRouter` and `Sidebar` need **zero changes**. If they do,
      stop — that's a gap.

## 10. Drawer assembly

Precedent: `CategoryViewStep` / `CategoryCreateStep` plans (S6 Phase F);
`ServiceViewStep`. Contracts: AdminWorkstationDrawerPrinciples-v1 (all
locked), ServiceDrawerModuleArchitecture-v1 §8 (footer decision table),
§16 (module build checklist).

- [ ] View step: station hook → assemble one `ShellBinding` per module →
      `EntityDrawer entity={<ENTITY>}` renders `placements.drawer`.
      **Zero hand-written `.drawerModule` JSX** — this is the budget grep.
- [ ] Drawer shell placement declares exactly two groups, `details` and
      `connections`. These mandatory base groups remain fixed in
      `EntitySchema.placements.drawer`; Manager is never added as a shell
      placement.
- [ ] If the station has applicable relation providers, resolve them through
      the typed relation-provider registry. Show the optional terminal Manager
      tab only when at least one provider is writable and declares a management
      capability. Read-only providers never create the tab by themselves.
- [ ] Manager is supplied as a station-level workspace outside `EntitySchema`:
      no Manager entity, lifecycle, shell, module, overview card, extra Edit
      step, nested `EntityDrawer`, or nested provider tabs/modules.
- [ ] Edit overlay: step-owned `editingSection`, working draft + original
      snapshot, `InlineEditorShell` around the binding's `editor.render`.
- [ ] Footer via `setFooter`: copy the split-button/Publish/Cancel grammar
      and the terminal-action close-guard bypass from the service decision
      table — do not re-derive it.
- [ ] Create step: New-state modules, locally-owned create-step notes,
      Save creates via the station POST (born `disabled`), then reopens the
      view step. Child/gateway modules render Locked pre-creation.
- [ ] Step chrome (confirm modals, save feedback) goes through
      `EntityDrawer`'s `children`/`trailing` slots — surface content, out
      of schema.

## 11. Connections / transit

Precedent: the Package Summary gateway; the Category services flow (S6 D4).

- [ ] Related entities appear in the Connections tab as **shells in
      `connections` or `summary` mode** — never embedded foreign drawers.
- [ ] Cross-station navigation is transit: a `view` footer action whose
      handler (surface-delivered, never schema) opens the target station's
      **real** drawer via `openAction`, passing the full `initialStepData`
      that drawer expects. If the payload is missing, fetch it — never fork
      a reduced drawer.
- [ ] Refresh propagation flows both ways (editing the target refreshes the
      origin's counts/summaries on return).

## 11a. Dynamic Station Manager providers

- [ ] Source entities retain canonical data ownership. A provider must not
      expose destination content or lifecycle fields as generic Manager
      controls.
- [ ] Each provider declares stable identity, station scope, loader, row
      projection, health/status evaluation, destination opener and truthful
      capabilities.
- [ ] Read-only providers omit draft/save behavior. Writable providers own
      draft creation, dirty detection, validation, persistence and projection/
      availability rules.
- [ ] Provider storage remains provider-owned. Do not create a generic
      cross-provider Manager envelope and do not claim cross-provider atomic
      Save. The coordinator reports provider-level success/failure.
- [ ] Manager owns one composite in-memory editing session keyed by provider,
      one visible Save/Cancel surface and no persistent business truth.
- [ ] Manager → Details, Manager → Connections, Close, Back and Cancel all use
      the unified guarded-exit path. Never hide a dirty draft by changing tabs.
- [ ] Details/Connections use standard ActionShell width. Manager may request
      the explicit wider ActionShell panel mode; leaving Manager restores the
      standard mode. Do not infer width from body markup or CSS `:has()`.
- [ ] Package onboarding reuses `PackageManagerSchema`, GET/POST, explicit
      decisions, deterministic identity, provisional/missing reconciliation and
      projections through its provider adapter. Keep the current Connections
      entry until Manager parity is complete.
- [ ] Promotion initially registers read-only identity, health and destination
      routing only. Never map Promotion priority, `is_featured`, schedule,
      headline, campaign fields, pricing, module drafts or lifecycle into
      generic Manager capabilities.

## 12. Collection placement (repeated cards)

Precedent: v1.2 amendment (architecture doc §7 detail-list ruling + §8
Collection placement); Category services collection (S6 Phase F.3).

- [ ] A "list of cards" is **one shell repeated by a placement**, declared
      as `placements.collections.<name> = { module, mode: 'summary' |
      'card', footer: […] }`. It is never a new mode, renderer, or shell
      variant.
- [ ] One shell, one binding, one mode — always. The owning surface builds
      the N `ShellBinding`s (from station hooks) and maps the existing
      archetype renderer inside `<ModeProvider mode={slot.mode}>`.
      Cardinality never enters the shell or mode layer.
- [ ] Slot `footer` re-selects from the shell's declared Action Group —
      select-only, never invent.
- [ ] Entry via the summary-gateway pattern: a `metrics` shell placed
      `mode: 'summary'` in Connections with a `view` action transiting to
      the collection surface; each card's `view` transits onward.
- [ ] No shared collection helper until a **second** migrated consumer
      exists (Governance Rule).

## 13. Snapshot validation

Precedent: S6 Phase G.1–G.2.

- [ ] `scripts/mode-renderer-snapshot.mjs` in compare mode: **zero drift,
      zero new entries** (machine proof no element × mode renderers were
      added). If you legitimately added an element by amendment, its
      per-mode render cases ship with it.
- [ ] `scripts/module-state-snapshot.mjs`: add fixture rows for every new
      `ModuleDefinition` (complete-active, pending-draft, incomplete,
      not-configured, platform-inactive as applicable); `--update` once;
      **all existing rows byte-identical**.

## 14. Build & regression checks

- [ ] Typecheck clean; no new `any` leaks beyond established patterns.
- [ ] Budget grep: no new files under `ts/components/admin/schema/` except
      the entity's manifest/bindings/tables; no diffs to the locked
      renderer/contract files; no new `ShellMode` or `PlatformElementId`
      members; `presentation.ts` untouched.
- [ ] Behavioural walk of the full lifecycle: create → publish →
      edit/draft → discard → settle → disable → archive → restore → trash →
      guarded delete → delete. Pills obey the Presentation Status Contract
      (Active/Pending/Disabled only; travel labels only on travel
      surfaces; **no Draft pill ever**).
- [ ] Public-surface parity (byte-identical where gates default to
      no-ops); existing drawers and inline flows unaffected.
- [ ] Each phase lands as its own green commit: backend dark → API dark →
      schema dead-code → surfaces live — so any layer reverts
      independently until the surfaces land.

## 15. Gap Protocol (locked)

If any step forces work outside this guide's allowed additions —
a new archetype, mode, element, renderer, or a change to a locked file:

1. **Stop.** Do not work around it, do not absorb it quietly.
2. Document the blocker: what was attempted, which contract blocks it, and
   why no existing extension point expresses it.
3. Propose the **smallest** amendment via the Amendment Log in
   [SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md) §14.
4. The onboarding's gap report is the only sanctioned source of new
   abstractions. New concepts require evidence from real consumers — two
   for promotion of an escape hatch, one non-hypothetical consumer for an
   element.

---

## Amendment Log

| Date | Amendment | Notes |
|---|---|---|
| 2026-07-07 | v1 — guide written | Generalised from the S6 Category onboarding blueprint at architecture handoff; S1–S5 complete, v1.2 (Collection placement) amended. |
