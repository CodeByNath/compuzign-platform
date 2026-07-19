# CompuZign Architecture — Decision Record — v1

**Status:** Historical architecture decision record
**Scope:** Decisions established during the schema-driven workstation milestone
**Current authority:** [Platform Architecture Standards](platform-architecture-standards-v1.md) and [Code Maps](../code-map/000-README.md)

> Paths and implementation examples below are preserved as milestone evidence.
> Confirm current placement in the Code Maps and source.

One-page ADR: why the platform works the way it does. Each entry is
**Decision → Rationale → Consequence**. All ten are locked; they change only
through the Amendment Log in
[SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md) §14.

Detailed specifications: [SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md)
(layers, shells, modes, placements) ·
[StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) (lifecycle) ·
[AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) (drawer contracts) ·
[S6-CategoryOnboardingBlueprint-v1.md](S6-CategoryOnboardingBlueprint-v1.md) (proof by onboarding).

---

### 1. The Station owns the DNA

**Decision.** All business truth — lifecycle, state, ownership, references,
relationships, actions, notifications, data contracts — lives in the Station
(backend + `ModuleDefinition`/`evaluateModule` + station hooks).
**Rationale.** The v1.1 correction: schema was never the DNA. There must be
exactly one place where a module's behaviour is defined, or every new
surface re-derives it and the copies drift (the four near-identical
`resolveStatus` closures the audit found).
**Consequence.** The organism is never recreated. Shells regenerate freely;
`moduleNotifications.ts` and `StationLifecycle.php` need zero changes when
presentation evolves. New entities grow DNA; they never grow framework.

### 2. A shell never owns business logic

**Decision.** Shells receive DNA through one delivery object
(`ShellBinding`) and present it. A shell never computes status, derives
notes, owns business truth, or calls endpoints; handlers live in station
hooks; schemas declare intent only.
**Rationale.** One-way flow (Station → Shell) is what makes shells reusable
across entities and surfaces; any business logic in a shell forks the truth
per surface.
**Consequence.** Two shell archetypes (Overview, Child) cover every module
on the platform. Binding a new module is configuration. Business logic
appearing in a shell is a review-blocking defect, not a style issue.

### 3. Mode changes the viewpoint, not the shell

**Decision.** A mode (`details · connections · edit · summary · table ·
card`) is the viewpoint a shell is seen through. Surfaces (drawer, page) are
not modes. Element presentation lives in exactly one element × mode
renderer registry.
**Rationale.** v1.0 mixed surfaces and viewpoints and produced a permanent
ambiguity class ("is X a mode or a place?"); separating them (finding 13)
removed it. One registry means one answer to "how does this element render
here".
**Consequence.** The same shell appears everywhere it's needed without
rewrites. A missing (element, mode) renderer means "absent in that
viewpoint" — never a hand-written exception.

### 4. Placement decides where a shell appears

**Decision.** Groups/placements (`ShellSlot`: module + mode + optional
density/footer) decide where shells appear and in which mode — drawer tabs,
commercial groups, collections, workstations.
**Rationale.** With behaviour in the Station and rendering in modes, "where"
is the only remaining question, and it deserves its own declared layer
rather than prop branching in steps.
**Consequence.** Moving or re-footering a shell is a manifest edit. The
Drawer Tab Contract is encoded as exactly two placement groups
(`details`/`connections`) — a schema cannot express a violation.

### 5. Collection Placement owns repetition

**Decision (v1.2).** A repeated-card surface ("detail-list") is one shell in
the `summary` (or `card`) viewpoint, repeated by a Collection placement; the
surface owns the N bindings. One shell receives one binding and one mode —
always. `detail-list` is a surface nickname, never a schema term.
**Rationale.** A `detail-list` mode would own zero renderers (a pure alias
of `summary`) and would need cardinality awareness — which is DNA delivery,
not viewpoint. Exactly the ambiguity class decision 3 eliminated.
**Consequence.** No seventh mode, no new renderer. Collections are declared
(`placements.collections`), footers are re-selected per placement
(select-only), and a shared collection helper waits for a second consumer.

### 6. Connections are transit, not embedded drawers

**Decision.** Related entities appear as shells in `connections`/`summary`
mode; navigation to them is a `view` action that opens the target station's
real drawer with its full payload (the summary-gateway pattern).
**Rationale.** Embedding a foreign drawer forks that station's UI and
inevitably ships a reduced, drifting copy. Every station already has one
canonical drawer; transit reuses it.
**Consequence.** One drawer per station, ever. Cross-station surfaces must
have (or fetch) the full `initialStepData` — never a slimmed-down fork.

### 7. Presentation status is derived, never raw lifecycle

**Decision.** The engine stores operational states
(`draft/active/disabled/archived/trashed`); pills render only derived
presentation states (Active / Pending / Disabled). `draft` presents as
Pending; archived/trashed appear only on travel surfaces; there is no Draft
pill. One chokepoint (`schema/presentation.ts`) owns every mapping.
**Rationale.** Storage vocabulary and admin-facing meaning are different
things; rendering raw lifecycle leaks transition mechanics into the UI and
multiplies pill maps (two definitions for one mapping was a real S3b bug).
**Consequence.** Local pill maps are banned. The contract is encoded in
renderers, not offered as a schema knob — violations are unexpressible.

### 8. WordPress is the storage and relationship layer

**Decision.** WP owns persistence (posts, terms, meta, term relationships).
It never owns business lifecycle; station meta never duplicates what WP
already stores (names, slugs, relationships).
**Rationale.** WP's primitives are reliable storage but its native
states/flows don't model the platform's lifecycle; duplicating WP-owned
fields into meta creates two sources of truth.
**Consequence.** Stations layer a consolidated meta envelope over WP
records, read/written through one Support class per entity, with lazy
defaults so unmigrated data keeps today's behaviour (rollback stays
trivial).

### 9. CompuZign owns the business lifecycle

**Decision.** `StationLifecycle.php` is the single transition engine —
status vocabulary, legality, and computation for every travel transition,
across three participation models (canonical, travelling-instance,
shell-occupant). Stations persist results themselves.
**Rationale.** One engine means one set of rules (restore lands `disabled`,
drafts block destructive writes, delete only from trashed) instead of
per-entity reimplementations that disagree.
**Consequence.** The engine never changes for a new entity. New lifecycle
constants outside the engine, or status writes outside the transition
table, are defects. Guard decisions (pending-drafts, legacy-occupied) bind
platform-wide.

### 10. New concepts require evidence from real consumers

**Decision.** No new archetype, mode, element, or renderer without a real,
non-hypothetical consumer; escape-hatch (`custom`) promotion needs two;
shared helpers wait for the second migrated consumer; the onboarding gap
report is the only sanctioned source of new abstractions.
**Rationale.** Every abstraction added ahead of evidence in v1.0 turned out
wrong (nine module wrappers, the `PresentationMode` list, the detail-list
mode). Evidence-first kept the inventory at two archetypes and six modes
through five migration phases and a new entity.
**Consequence.** The default answer to "should we generalise this?" is
*not yet*. Blockers go through the Gap Protocol and the Amendment Log —
never absorbed as one-off workarounds, never pre-built on speculation.

---

## Amendment Log

| Date | Amendment | Notes |
|---|---|---|
| 2026-07-07 | v1 — ADR written | Recorded at architecture handoff; consolidates decisions locked across S0–S5, v1.1, v1.2, and the lifecycle engine migration. |
