# Admin Workstation Drawer Principles — v1

**Scope — two layers, different reach:**

- **Drawer Header & Navigation Contract**, **Drawer Tab Contract**, **Dynamic Station Manager Contract**, and **Presentation Status Contract** (below) are **platform-wide**. They are the locked contract for **every admin drawer** — Service, Package, Promotion, and any future drawer. These sections are the canonical owner of drawer header titles, the single left control, the reserved right slot, the fixed `Details | Connections` base tabs, the optional terminal `Manager` workspace, and the operational-vs-presentation state distinction with its pill vocabulary.
- **Module state machine / lifecycle** (New / Locked / View / Edit, status model) — reference implementation is **Service Catalog only**. It does not yet cover Transit Hub, Packages, Promotions, Requests, or CRM as built surfaces, though those drawers must adopt the platform-wide contract above.

For the drawer module CSS system, class reference, and legacy audit: [DrawerModuleSystem-v1.md](DrawerModuleSystem-v1.md)

For the completed Service modules' full implemented behavioural architecture (notifications, footer actions, category selector/description workflows, view/edit/inline-editor behaviour): [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — the canonical spec and Commercial-migration template.

---

## A Drawer Is a System

A drawer consists of:

- **Header** — a static workspace label, a single left navigation control, and a reserved right slot. Governed by the *Drawer Header & Navigation Contract* below.
- **Tabs** — fixed base tabs `Details | Connections`, followed only when capability-gated by the terminal `Manager` workspace. Governed by the *Drawer Tab Contract* below.
- **Body** — contains the drawer modules.
- **Footer** — primary and secondary actions.

The drawer body contains modules. Modules are persistent.

---

## Drawer Header & Navigation Contract

> **Platform-wide and locked.** Applies to every admin drawer. The header describes the **workspace/location, not the current record.**

### Header title is the workspace, not the record

The header title is a **static workspace label** that names *where the user is*, never the name of the record being edited:

| Drawer | Header label |
|---|---|
| Service drawer | `Service` |
| Package / Tier drawer | `Package` |
| Promotion drawer | `Promotion` |
| (future drawers) | the workspace noun, e.g. `Bundle`, `Campaign` |

The record name lives **inside the body**, as a module value or a body-level name element — never in the header. A drawer must surface the record name somewhere in its body before its header is allowed to drop the record name.

### No status dot in the header

The header carries **no status dot**. Status is a module concern and lives only in the module status pills. The header is label-only.

### Single left control — Back *or* Close, never both

The header has exactly **one** navigation control, on the left:

- **Back** — shown when a previous drawer exists (a nested/pushed drawer).
- **Close** — shown when this is a root drawer (no previous drawer).

The two are mutually exclusive. A drawer never shows Back and Close at the same time. Closing remains available from the footer; removing the header Close from a nested drawer must not remove its ability to close.

### Right side reserved

The right side of the header is **reserved for a future action centre**. It is rendered but left visually empty for now. Do not place actions there yet.

### InlineEditorShell is the reference header

The inline editor (`InlineEditorShell`) is the canonical reference for the header pattern and already conforms:

- **Back** (single left control)
- **Module title** (e.g. `Service Overview`, `Tier Overview`)
- **Live Editor** badge
- **No tabs**

An inline editor names the *module* it is editing (not the workspace and not a tab set), carries the Live Editor badge, and has no tab bar.

---

## Drawer Tab Contract

> **Platform-wide and locked.** Applies to every non-editor drawer. Inline editors have no tabs.

### Fixed base tabs: `Details | Connections`

Every non-editor drawer uses these two mandatory base tabs, in this fixed order:

- **Details** — always the **current workspace's own** modules (what I am editing).
- **Connections** — always the **related entities** (what this is connected to).

This replaces the earlier per-drawer `Service / Commercial`, `Packages / Promotions`, `Promotion / Service Details` labels, which were workspace-specific and overloaded (e.g. "Commercial" meant *related* in the Service drawer but *own* in the Tier drawer). `Details / Connections` normalises by **role**, not by layer:

| Drawer | Details (own) | Connections (related) |
|---|---|---|
| Service | Service Overview, Included Features, Common Questions | Package Summary, Promotions, … |
| Package / Tier | Tier modules (Tier Overview, Features, Questions) | Service context, Promotions, … |
| Promotion | Promotion modules | Service / Package context |

### Optional terminal tab: `Manager`

`Manager` is an optional third station-level workspace tab. When present, the
canonical order is permanently:

`Details | Connections | Manager`

It appears only when at least one registered relation provider for the current
station exposes a **writable management capability**. Read-only providers do
not create the tab by themselves. Once a writable provider makes Manager
available, read-only providers may contribute relationship-health and
destination-routing rows to the same workspace.

Manager is a workspace role, not an entity viewpoint. It has no `EntitySchema`,
no `EntityDrawer`, no shell placement and no lifecycle. It is never an
`EntityDrawer` inside another `EntityDrawer`, and providers do not create nested
Manager tabs or Manager modules.

### Order never changes; only the active tab changes

The base tab order is **permanently** `Details | Connections`; optional Manager
is always terminal. Drawers must **not** reorder tabs by entry point. When a
drawer is opened from a connection (a promotion, a package, another related
entity), the order stays the same and **Connections is simply made the active
tab**. Any "selected tab moves to the front" logic is removed.

This gives a predictable drawer everywhere: the first tab is always what the
station owns, the second is always what it is connected to, and optional
Manager is always last. `Details` always represents the workspace named in the
header.

---

## Dynamic Station Manager Contract

The Dynamic Station Manager is the optional station-level workspace for
managing how registered relationships participate in the current station. It
opens directly as a working surface: no overview card, no extra Edit step and
no module-card lifecycle around the workspace.

### Ownership

- The source entity owns canonical data.
- Each relation provider owns its relationship persistence, validation and
  projection/availability rules.
- Dynamic Station Manager discovers providers, renders their declared
  capabilities and coordinates one composite in-memory editing session.
- Manager owns no generic cross-provider storage envelope and never claims a
  cross-provider atomic save. A visible Save may coordinate provider saves,
  but success and failure remain provider-specific.

Provider capabilities may include grouping, ordering, visibility,
availability, decorated labels, priority or provider-specific fields only when
the provider truthfully owns those relationship concerns. Manager must never
take ownership of source content, destination internals, entity lifecycle or
pricing/Cost Builder logic.

### Workspace presentation

Manager uses a dashboard/workspace layout with dense relationship rows,
capability-driven controls, health/notification summaries and direct links to
the existing destination drawers. It has no overview card, nested provider
tabs, nested provider modules or provider-created presentation system.

### Width

Details and Connections use the standard drawer width. Manager may request an
explicit wider ActionShell panel mode. Width remains owned by `ActionShell`,
not body markup or CSS `:has()` discovery, and returns automatically to the
standard mode when Manager is left or the drawer closes.

### Guarded navigation

Manager → Details, Manager → Connections, drawer Close, Back and Manager Cancel
must all use one guarded-exit contract. Dirty provider drafts are never silently
hidden in memory. The user must Save, keep editing or explicitly discard before
the requested navigation continues.

Infrastructure debt (recorded for the Manager infrastructure phase):
`ActionShell` currently invokes `config.onBack` directly, bypassing its close
guard. Back must be routed through the unified guarded-exit path before a dirty
Manager workspace ships.

### First providers

- **Package** is the first writable provider. `PackageManagerSchema`, its GET,
  `has_configuration`, atomic POST, deterministic identities, provisional
  reconciliation, missing-source preservation, explicit decisions and consumer
  projections remain Package-provider-owned. The current direct Connections
  entry remains until Manager-tab parity is complete.
- **Promotion** initially participates only as a read-only provider of stable
  identity, health and destination routing. Promotion priority,
  `is_featured`, schedule, headline, campaign fields, pricing, module drafts and
  lifecycle remain Promotion-owned and must not become generic Manager controls.

---

## Presentation Status Contract

> **Platform-wide and locked.** Applies to every workstation — Service, Package, Promotion, Tier, and future Bundles, Subscriptions, Case Studies, Categories, and any module that follows. This section is the canonical owner of the operational-vs-presentation state distinction and the drawer/module pill vocabulary.

**The lifecycle engine stores operational states. The drawer renders presentation states. Presentation is derived from lifecycle state, module state, and notifications — never from raw lifecycle values alone.**

### Two vocabularies

| Layer | Vocabulary | Canonical owner |
|---|---|---|
| Engine — operational (travel) states | `draft` · `active` · `disabled` · `archived` · `trashed` | [StationLifecycleEngine-v1.md](StationLifecycleEngine-v1.md) |
| Drawer — presentation states | **Active** · **Pending** · **Disabled** | this contract |

Operational states are implementation states. They must never be exposed directly as drawer/module status pills. Drawer/module status pills communicate presentation state only, and the only presentation states are:

| Presentation | Meaning |
|---|---|
| **Active** | Live, configured, no actionable issues |
| **Pending** | Requires attention — drafts, incomplete modules, unpublished changes, waiting states. Full opacity when action is required; reduced opacity (dim) when informational |
| **Disabled** | Intentionally turned off. Never entered automatically — it results only from an explicit user action: a direct disable, or a restore (the engine's universal restore landing state) |

### Derivation examples

| Situation | Presents as |
|---|---|
| `draft` — never published | **Pending** |
| `not-configured` — blank slate | **Pending** |
| Module has unpublished / pending changes | **Pending** |
| Module requires attention (missing fields, review needed) | **Pending** |
| Live / enabled | **Active** |
| Disabled by the user (or landed by restore) | **Disabled** |

### Pill vs panel

The **status pill** communicates only the presentation state. The **notification panel** communicates the reason — *why* a module is Pending ("Promotion Overview has unpublished changes", "Common Questions not configured", "Publish to make this promotion live"). The **module lifecycle** is the engine data underneath. Users never reason about "draft" vs "pending draft" vs "settled" — they see Active / Pending / Disabled and open the panel for the why.

### Archived / Trashed are travel states

`archived` and `trashed` are travel states, not presentation states. They must **never** appear as drawer/module status pills. They may appear only on dedicated travel surfaces, where naming the travel state is the surface's purpose:

- Bin / Trash / Archived views (including the occupant bin and in-drawer bin rows)
- Lifecycle history
- Audit / history displays

Restore out of these states follows the engine's rules unchanged: restore lands `disabled`, never `active` (StationLifecycleEngine-v1 → transition table) — which is why a freshly restored record presents as **Disabled**, not Pending or Active.

### Enforcement

Both shared pill renderers enforce the vocabulary: `ModuleStatusPill` (`PILL_META`) and `renderModuleStatus` (`STATUS_PILL_MAP`) know only Active / Pending / Disabled and fall back to a Pending pill for any unknown or raw status. There is no "Draft" pill anywhere on the platform. The five-state model (→ *Module Status Model* below) is the internal resolver vocabulary that implements this contract.

Conformance audit (2026-07-05): Service, Tier and the catalog/summary pills conform via the shared renderers. The one violation found — `ServicePromotionStep.tsx` list rows rendering a raw `Draft` pill — was fixed (`STATUS_PILL`: draft presents as Pending). Its bin rows, `ServiceTierStep`'s occupant-bin cards (`BIN_PILL`), and the Bin/Archived/Trashed workstations name `Archived` / `Trashed` as data labels on travel surfaces, per this contract.

---

## Modules

Modules are persistent across drawer states.

Drawer states do not create new module layouts.
Drawer states do not create new UIs.

Drawer states only affect:

- Content
- Metadata
- Action availability

A module remains the same module across all states.

---

## Drawer States

Four states were discovered through the Service Catalog implementation.

### New

Module rendered in the service creation drawer (`ServiceCreateStep`). The shell is visible. The edit action is enabled. Content is an empty placeholder — the service does not yet exist.

Applies to: **Service Overview** in the create context only.

### Locked

Module rendered in the service creation drawer where the module has no content and cannot be edited until the service itself is created. The shell is visible and laid out normally. The edit action is disabled. The shell does not change.

Applies to: **Included Features** and **Common Questions** in the create context.

### View

Module rendered in the service view drawer (`ServiceViewStep`) with `editingSection === null`. Content is populated from persisted service data. The edit action is enabled.

Applies to: **all three modules** in the view context.

### Edit

Module rendered in the service view drawer with the matching `editingSection` value set. The module's editor is loaded inside `InlineEditorShell`. This is not a separate UI — it is the same module rendered through a different content layer.

Applies to: **all three modules** individually when their edit action is triggered.

---

## Module State Table

| Module | New | Locked | View | Edit |
|---|:---:|:---:|:---:|:---:|
| Service Overview | ✓ | — | ✓ | ✓ |
| Included Features | — | ✓ | ✓ | ✓ |
| Common Questions | — | ✓ | ✓ | ✓ |

---

## Core Rules

### Same Module = Same Shell

Edit is not a separate module.

Edit is the same module rendered through `InlineEditorShell`.

`InlineEditorShell` carries the Save / Cancel actions and wraps the module's editor component. The module remains in the same drawer position across all states. Only the visible content changes.

### Action State Belongs to the Module Action

The shell remains visible and readable in all states.

The shell does not become disabled.
The shell does not change layout.

Only the module action changes state. Action state examples:

- Edit enabled
- Edit disabled
- View enabled
- View disabled

The action state must affect only the action control. It must not affect:

- Module shell
- Module content
- Module metadata
- Module layout

---

## Temporary Disabled Rule

**State must not be applied to the shell. State must be applied to the module action only.**

During implementation of the Locked state for the Service Catalog create drawer, two CSS rules violated this principle and have been corrected.

**Rule 1 — disabled (shell-level pointer-events):**
```css
/* .drawerModule--locked {
  pointer-events: none;
} */
```
Applying `pointer-events: none` to the entire module shell is a violation of this rule. The shell must not receive state-based CSS. This pattern is explicitly disabled.

**Rule 2 — removed (action opacity override):**
Any rule that forces `opacity: 1` on an action control inside a locked module — overriding `.cz-admin-btn:disabled { opacity: 0.45 }` — is also a violation. The disabled button styling must communicate unavailability on its own.

The correct implementation:
- The `disabled` attribute is set on the action button only.
- The shell renders normally — visible, laid out, readable.
- `.cz-admin-btn:disabled { opacity: 0.45; cursor: not-allowed; }` handles all visual disabled state for the action control.
- No CSS rule targets the module shell with a state class.

The locked state modifier in the current system is `.drawerModule--locked`. It is intentionally left as an empty ruleset — it exists as a selector hook for future targeting if needed, but carries no shell-altering styles.

This is the reference behavior for all future drawer modules. Any CSS rule that targets the module shell with a state class, or overrides disabled button styling from a shell-level selector, must be treated as a violation of this principle.

---

## Reference Implementation

The Service Catalog is the reference implementation for Drawer Principle v1.

The files below are the state-machine essentials cited by this document. For the **complete drawer module file index**, see ServiceDrawerModuleArchitecture-v1 → *Key Files (canonical index)*.

### Key Files

**Drawer system (outer shell)**
`resources/ts/components/admin/ActionShell.tsx`
Header, body, footer, step management. Opened via `openAction()` with `mode: 'drawer'`.

**Edit state shell**
`resources/ts/drawer-kit/InlineEditorShell.tsx`
The Edit state carrier. Wraps each module's editor component and provides Save / Cancel actions. All three modules use the same shell for their Edit state.

**Module state machine**
`resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx`

- `ServiceViewStep` — View/Edit state machine. `editingSection: 'overview' | 'inclusions' | 'faqs' | null` drives which module (if any) is in Edit state.
- `ServiceCreateStep` — New/Locked state rendering. Service Overview = New (blank, edit enabled). Included Features and Common Questions = Locked (shell visible, edit disabled).

**Module editor content**
- `resources/ts/entity-drawers/editors/ServiceOverviewEditor.tsx`
- `resources/ts/entity-drawers/editors/ServiceInclusionsEditor.tsx`
- `resources/ts/entity-drawers/editors/ServiceFaqsEditor.tsx`

**Drawer module CSS system**
`resources/css/modules/admin.css`
Contains `.drawerModule` (shared frame) and `.drawerOverview.service` (Overview-specific scope). See [DrawerModuleSystem-v1.md](DrawerModuleSystem-v1.md) for the full class reference and legacy audit.

---

## Module Lifecycle Pattern

Each module has up to three presentations. These are not separate modules — they are lifecycle views of the same module.

```
One Module
├─ Catalog Lifecycle      — card inside the drawer; coordinates module state
├─ Transit Lifecycle      — compact card in Transit Hub; presents and routes
└─ Management Surface     — full editing UI; opened by View actions from either lifecycle
```

**Catalog** coordinates. The Catalog lifecycle card shows the module's current status, exposes the edit or view action, and lives inside the drawer. It owns the module's state machine (New / Locked / View / Edit).

**Transit** presents. The Transit lifecycle card is a compact read-only summary used in the Transit Hub workstation. It shows values only — no editors, no inline editing, no publish UI, no drawer logic. It exposes an optional `onView` handler. When no handler is provided, the View button is disabled.

**Management** edits. The management surface is the full UI for editing or configuring module data. It is opened by View actions from either the Catalog or Transit lifecycle. It reuses existing drawer steps — it is not a new surface.

---

## Module Naming Convention

Module names, Catalog card labels, Transit component names, and management surfaces are tracked separately. The card label is a UI presentation choice and may differ from the module name.

| Module | Catalog Card Label | Transit Component | Management Surface |
|---|---|---|---|
| Service Overview | Service Overview | `ServiceOverviewTransitView` | Service Overview inline editor (`ServiceViewStep`) |
| Service Package | Package Summary | `PackageSummaryTransitView` | `PackageDetailStep` → `TierManageStep` |

**Rule:** Use the module name for the module itself. Use whatever label fits the UI context for the Catalog card. Name the Transit component after the Catalog card label (not the module name) until Transit Workstation is complete — at that point naming is reviewed holistically across all modules.

**Note on Service Package:** The Catalog card is labelled "Package Summary" because it presents a summary of the linked surface package. The module is Service Package. These are distinct. Do not use "Package Summary" as the module name.

### Future modules expected to follow this pattern

- Promotions
- Bundles
- Campaigns
- Subscriptions
- Case Studies

Each will have:

- A **Catalog lifecycle card** in the relevant drawer tab
- A **Transit lifecycle component** (`*TransitView`) for the Transit Hub
- A **management surface** — an existing or new drawer step, never duplicated

---

## Module Status Model

> **Canonical owner.** This section is the single source of truth for the five-state module status model and its resolvers. The pill vocabulary and the operational-vs-presentation state distinction are owned by the *Presentation Status Contract* above; the model here is the internal resolver vocabulary that implements that contract. Other drawer docs (ServiceDrawerModuleArchitecture-v1, DrawerModuleSystem-v1) reference these sections and must not restate the five-state table or resolver list.

### 5-State Lifecycle

All modules use the same five-state lifecycle. It implements the *Presentation Status Contract*: `not-configured`, `pending-dim`, `pending-full` all present as the Pending family; `active` / `disabled` present as themselves. Relationship vocabulary ("Linked", "Connected", "Associated") must never appear in status pills or dots.

| Status | Meaning | Visual |
|---|---|---|
| `not-configured` | No data exists; module is a blank slate | Faint dot · presents as "Pending" pill (renderer fallback — there is no dedicated pill) |
| `pending-dim` | Some data exists but required fields are missing | Orange dot · "Pending" pill · 0.45 opacity on status indicator |
| `pending-full` | All required data present but module is not yet published | Orange dot · "Pending" pill |
| `active` | All required data present and published | Green dot · "Active" pill |
| `disabled` | Module or tier is explicitly turned off | Red dot · "Disabled" pill |

### Lifecycle Status vs Relationship Status

These are distinct concepts that must never be conflated:

- **Lifecycle status** describes readiness and publication state. It maps to one of the five states above. All modules and their sub-components (tiers, cards, rows) use lifecycle status.
- **Relationship status** describes an association between two entities (e.g., "Linked", "Connected"). This is a data model concept, not a UI status concept.

**Rule:** A status pill or status dot always shows lifecycle-derived status (rendered per the *Presentation Status Contract*). Never show relationship vocabulary in a pill or dot. If an entity is linked but not yet configured, its status is `not-configured` — presenting as Pending, not "Linked".

### Resolver Utilities

Status resolution is centralised in `resources/ts/drawer-kit/utils/moduleStatus.tsx`:

- `resolveOverviewStatus(service, opts)` — Service Overview 5-state lifecycle
- `resolvePackageStatus(pkg)` — Package-level status (`not-configured` / `active` / `disabled`)
- `resolveTierStatus(tier, opts)` — Per-tier lifecycle using field-level completeness checks (`price`, `billing_cycle`)
- `renderModuleStatus(status)` — Renders dot + pill from any 5-state status string
- `statusDotColor(status)` — Returns the CSS colour variable for a status (for inline dot rendering outside `renderModuleStatus`)

### pending-dim Detection

`pending-dim` is triggered by field-level completeness, not a backend `configured` boolean. This allows partial detection within a single render pass.

For tiers: `pending-dim` when one of `price` / `billing_cycle` is present but not both.

---

## Drawer Contract Migration — Staging

Sequence for converging existing drawers onto the *Drawer Header & Navigation Contract* and *Drawer Tab Contract* above. This is staging only — it **references** the contract and does not restate it; the sections above are canonical. No stage touches data, routing, save/publish, status logic, PricingBuilder, or backend.

1. **`ActionShell` single left control.** Render exactly one left control (Back when a previous drawer exists, else Close) and a reserved-empty right slot, per *Single left control* and *Right side reserved*. Precondition: every nested (Back) drawer must keep a footer close so close capability is not lost.
2. **Body name presence.** Ensure each Package, Tier, and Promotion drawer surfaces its record name in the body before its header is relabelled (per *Header title is the workspace, not the record*). Service already satisfies this.
3. **Header → workspace label + drop status dot.** Replace record-name titles with the static workspace label and remove the header status dot, per *Header title is the workspace* and *No status dot in the header*. Start with the Service drawer.
4. **Tabs → `Details | Connections`.** Relabel by role (own → Details, related → Connections) and **delete entry-point reordering**, keeping fixed order with active-tab selection, per the *Drawer Tab Contract*.
5. *(defer)* Consolidate in-body secondary back buttons into the header contract.
6. *(defer)* Rename internal tab state keys to `details` / `connections`.

`InlineEditorShell` already conforms to the header contract (*InlineEditorShell is the reference header*) and needs no change.

---

## Inheritance

Any future module entering the drawer system must follow these principles and inherit drawer behavior rather than inventing new drawer rules.

The conceptual pattern:

1. A module has a fixed shell structure.
2. States affect content and actions, not the shell.
3. Edit state is delivered through `InlineEditorShell`.
4. Locked state disables only the action control — the shell stays visible and laid out.
5. New state shows placeholder content — the shell is fully rendered.
6. A module may have a Catalog lifecycle, a Transit lifecycle, and a management surface. These are not separate modules — they are presentations of the same module.

For the **actionable build checklist** (the concrete steps to construct a new module — frame, header, notifications, status, view/edit, state ownership, lifecycle actions), see ServiceDrawerModuleArchitecture-v1 → *Extension Guidelines & Commercial Migration Template*. This document owns the principles; that section owns the build steps.
