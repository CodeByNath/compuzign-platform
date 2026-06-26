# Service Drawer Module Architecture — v1

Canonical specification for the **completed Service drawer modules**:

- **Service Overview**
- **Included Features**
- **Common Questions**

This document reflects the final, implemented architecture and is the **canonical behavioural / implementation reference** for the drawer module system (structure, component hierarchy, shared components, notifications, state management, lifecycle, workflows, footer actions, category flows). It is the entry point for understanding how a drawer module is built, and the template for migrating the Commercial modules next.

Companion documents — each owns exactly one concern; this document cross-references them rather than restating:
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — **canonical owner** of the drawer state machine, the Same-Module=Same-Shell / Temporary Disabled rules, and the 5-state module status model.
- [DrawerModuleSystem-v1.md](DrawerModuleSystem-v1.md) — **canonical owner** of the CSS presentation layer and class reference.

Scope note: only the three Service modules above are documented here. Commercial (Package Summary, Promotions), Transit, and ReadBlock surfaces are out of scope until migrated.

---

## 1. Module Structure

Every Service drawer module is a single `.drawerModule` card with three regions, always in this order:

```
.drawerModule
├─ .drawerModule__header     icon · heading (title + subtitle) · status slot
│  └─ (ModuleNotificationPanel renders here when open, below the header)
├─ .drawerModule__body       fields / chips / list / empty state
└─ .drawerModule__footer     module actions (Edit, Discard Draft)
```

The frame is identical across every state (New, Locked, View, Edit). State changes content, metadata, and action availability — never the shell. See *Same Module = Same Shell* and the *Temporary Disabled Rule* in the Principles doc.

Service Overview additionally carries the `drawerOverview service` scope on its root for its field/label/value system:

```html
<div class="drawerModule drawerOverview service">
```

Included Features and Common Questions use `.drawerModule` alone. Full class reference: DrawerModuleSystem-v1.

### Header layout

`.drawerModule__header` is a flex row: `icon → heading (flex:1) → status slot`.

- **Icon** — `.drawerModule__icon` (40×40 accent container) wrapping a 20×20 `.drawerModule__icon-svg`. Variant hook per module:
  - Service Overview → `.drawerModule__icon--overview` (document glyph)
  - Included Features → `.drawerModule__icon--features` (badge/check glyph)
  - Common Questions → `.drawerModule__icon--faqs` (question-mark glyph)
- **Heading** — `.drawerModule__heading` column:
  - `.drawerModule__title` — module name, strong weight. May contain an inline `.drawerModule__count` badge when items exist.
  - `.drawerModule__subtitle` — one-line description, faint/small.
- **Status slot** — `.drawerModule__status`, holding the `ModuleStatusPill`. Adds `.drawerModule__status--dim` (opacity 0.45) in a dim/pending state.

### Title / subtitle pattern

| Module | Title | Subtitle |
|---|---|---|
| Service Overview | `Service Overview` | General information about your service. |
| Included Features | `Included Features` ( + count badge) | Add and manage the features included in this service. |
| Common Questions | `Common Questions` ( + count badge) | Add questions and answers for this service. |

---

## 2. Component Hierarchy

The render tree from the drawer shell down to the shared leaf components. The same module occupies the same drawer position across View and Edit — in Edit, `InlineEditorShell` replaces the view card's content; it is not a separate module or position.

```
ActionShell                              drawer shell — header · tabs · body · footer slots · step manager
│   (opened via openAction({ mode:'drawer', steps:[…] }); provides stepData, setFooter, setCloseGuard, close)
│
├─ ServiceCreateStep                     New + Locked states (pre-creation)
│   ├─ .drawerModule  Service Overview        New     ── header → ModuleStatusPill
│   │     └─ (Edit) InlineEditorShell → ServiceOverviewEditor   (Save = createService)
│   ├─ .drawerModule  Included Features       Locked  ── header → ModuleStatusPill   (Edit disabled)
│   └─ .drawerModule  Common Questions        Locked  ── header → ModuleStatusPill   (Edit disabled)
│         each module: ModuleNotificationPanel renders below header when its panel is open
│
└─ ServiceViewStep                       View + Edit states (post-creation)
    ├─ Service tab
    │   ├─ ServiceOverviewViewCard   → ModuleStatusPill + ModuleNotificationPanel
    │   │     └─ (Edit) InlineEditorShell → ServiceOverviewEditor
    │   ├─ ServiceInclusionsViewCard → ModuleStatusPill + ModuleNotificationPanel
    │   │     └─ (Edit) InlineEditorShell → ServiceInclusionsEditor
    │   └─ ServiceFaqsViewCard       → ModuleStatusPill + ModuleNotificationPanel
    │         └─ (Edit) InlineEditorShell → ServiceFaqsEditor
    ├─ Commercial tab                (Package Summary, Promotions — out of scope until migrated)
    └─ Footer (via setFooter):
          split button [ Disable | Enable | Move to Trash ] · chevron → { Archive, Move to Trash }
          Publish · Cancel
```

Data and status flow into the view cards from `useServiceStation` (see *State Management*). The pill and panel are shared, module-agnostic leaves (see *Shared Components*).

---

## 3. Shared Components

Reusable drawer components and their contracts. These are module-agnostic — Commercial modules reuse them unchanged.

| Component | Responsibility | Contract (key props / API) |
|---|---|---|
| `ActionShell` | Drawer shell: header, tabs, body and footer slots, multi-step management | Opened via `openAction({ mode:'drawer', title, steps })`. Exposes through step `ctx`: `stepData`, `setStepData`, `setFooter`, `setCloseGuard`, `close`. |
| `InlineEditorShell` | Edit-state carrier; wraps a module editor and provides the Save / Cancel actions | Props: `title`, `onSave`, `onCancel`, `saving`, `saveErr`, `isDirty`; children = the module editor. |
| `ModuleStatusPill` | Renders the status pill from a status + the module's notes; clickable when notes and `onOpen` are present. No module-specific logic. | Props: `status`, `notes: ModuleNote[]`, `onOpen?`. Error notes → button with numeric badge; info-only notes → button, no badge; no notes → static span. |
| `ModuleNotificationPanel` | Renders the module's note list (plain, no severity icons) | Props: `notes: ModuleNote[]`. Renders nothing when empty. |
| `ServiceOverviewViewCard` / `ServiceInclusionsViewCard` / `ServiceFaqsViewCard` | Read-only module presentation: header + pill + panel + body + footer actions | Props: `status`, `notes`, `panelOpen`, `onTogglePanel`, module data, `hasDraft`, `onEdit`, `onDiscard`. Panel gate: `panelOpen && notes.length > 0`. |
| `ServiceOverviewEditor` / `ServiceInclusionsEditor` / `ServiceFaqsEditor` | Edit-mode form for the module's working draft | Controlled via `draft` + `onChange`. Overview additionally: `categories`, `catDescription`, `onCatDescriptionChange`, `onCategoryCreated`. |

`ModuleNote` shape and semantics are defined in *Notification System*.

---

## 4. Notification System

### Components

Two presentation components, both module-agnostic (see *Shared Components* for contracts):

**`ModuleStatusPill`** interprets the note array only — it contains no module-specific logic:

| Condition | Render |
|---|---|
| `noteCount(notes) > 0` (error notes) **and** `onOpen` | `<button>` with numeric marker badge (error count) |
| `notes.length > 0` (info only) **and** `onOpen` | `<button>`, no badge |
| no notes | static `<span>` |

The label/class come from `PILL_META[status]` (`active` / `disabled` / `pending-dim` / `pending-full`), falling back to a `Pending` pill.

**`ModuleNotificationPanel`** renders a plain list of note messages (`.cz-module-notes` / `.cz-module-notes__item`). No severity icons or row colours; renders nothing when empty.

### Panel open gate

The panel is gated on `panelOpen && notes.length > 0` — **not** on error count. Deliberate: info-only note sets (e.g. "Edit and add features.") must still open the panel even though they contribute zero to the badge.

### Notification ownership

**Modules own their notes.** Each module computes its own `ModuleNote[]` and passes both `notes` and an `onOpen` toggle to its pill, and renders its own `ModuleNotificationPanel`. The pill and panel are shared dumb components; the meaning lives with the module.

- **View step** (`ServiceViewStep`) — notes are generated by pure functions in `components/admin/utils/moduleNotifications.ts` (`getOverviewNotes`, `getInclusionsNotes`, `getFaqsNotes`), surfaced through `useServiceStation` as `overviewNotes` / `inclusionsNotes` / `faqsNotes`.
- **Create step** (`ServiceCreateStep`) — notes are local arrays owned by the step, gated by local state (see *Create New Service Workflow*).

### Info vs Error behaviour

`ModuleNote.type` is `'error' | 'warning' | 'info'` (`warning` reserved/unused).

- **`error`** — counts toward the numeric badge (`noteCount` filters `type === 'error'`). A blocking completeness gap (missing title, missing label, missing answer).
- **`info`** — never counts toward the badge; appears in the panel only. Guidance or lifecycle waiting states. The pill is still a clickable button when only info notes exist.

### Current notification content

**Service Overview — `getOverviewNotes`**
- Errors: `Title missing`, `Category not selected`, `Description missing` (excerpt is excluded from the completeness gate).
- Info (only when complete): `Waiting for service activation` (platform not active), or `Draft saved — settle to publish` (draft exists), or `Changes ready to settle` (module pending).

**Included Features — `getInclusionsNotes`**
- Empty module → info `Edit and add features.`
- Unlabelled features → error `N feature(s) … no label`.
- Complete → info activation / draft / pending notes.

**Common Questions — `getFaqsNotes`**
- Empty module → info `Edit and add questions.`
- Missing question / missing answer → error notes.
- Complete → info activation / draft / pending notes.

---

## 5. Module Status & Pending/Complete Lifecycle

The 5-state lifecycle (`not-configured`, `pending-dim`, `pending-full`, `active`, `disabled`), its resolver utilities, the lifecycle-vs-relationship rule, and `pending-dim` detection are defined canonically in the Principles doc → *Module Status Model*. This document does not restate the model; it records only how the modules consume it.

- Backend `module_status` per module is `not-configured` | `pending` | `settled`; the service carries `platform_status` (`active` | `disabled` | `archived` | `trashed`). Resolution into the 5-state UI status lives in `moduleStatus.tsx` (`resolveOverviewStatus`, `resolveTierStatus`, `resolvePackageStatus`).
- **Pending → Complete boundary:** a module reads **Pending** while required fields are missing (`pending-dim`) or complete-but-unpublished (`pending-full`); it becomes **Active** only when complete **and** `platform_status === 'active'`.
- Notification state tracks the same boundary the Edit-button enablement uses: the "next action" prompt appears precisely when the module is editable (service exists) but empty.

---

## 6. View Mode & Edit Mode

Each module has a **View** card and an **Edit** editor. They are the same module — Edit is the View module rendered through `InlineEditorShell`, never a separate UI (Principles → *Same Module = Same Shell*).

- **View** — `ServiceOverviewViewCard`, `ServiceInclusionsViewCard`, `ServiceFaqsViewCard`. Read-only; footer exposes `Edit` (and `Discard Draft` when a draft exists). Pill + panel surface notifications.
- **Edit** — `editingSection` (`'overview' | 'inclusions' | 'faqs' | null`) selects which module is open. The matching editor is wrapped by `InlineEditorShell`, which carries **Save / Cancel**.

### Inline editor workflow

1. `openXEditor()` snapshots the current draft into editor state and an `*Original` snapshot for dirty detection, sets `editingSection`, and closes any open note panel.
2. The editor edits local draft state via `onChange`.
3. `isEditorDirty` compares working draft vs original to drive the Save button.
4. **Save** (`handleSaveX`) persists via `useServiceStation`, clears editor state, returns to View.
5. **Cancel** (`handleCancelEdit`) discards all editor state and returns to View without persisting.

Close-guard behaviour for dirty/pending editors is documented in *State Management*.

---

## 7. State Management

Ownership of every piece of drawer state. Commercial modules inherit this division.

| Owner | Holds | Notes |
|---|---|---|
| **`useServiceStation`** (data layer) | Station data; resolved statuses (`overviewStatus` / `inclusionsStatus` / `faqsStatus`); generated notes (`overviewNotes` / `inclusionsNotes` / `faqsNotes`); mutations (`saveOverview` / `saveInclusions` / `saveFaqs`, `settleModules`, `publishService`, `toggleActive`, `archiveStation`, `trashStation`, `revert*`); loading flags (`loading.status`, …) | Single source of truth for persisted data and lifecycle. Calls `onRefresh` after every mutation. |
| **Step-level UI state** (`ServiceViewStep` / `ServiceCreateStep`) | `editingSection`; working drafts `overviewDraft` / `inclusionsDraft` / `faqsDraft` + `*Original` snapshots; `catDesc` / `catDescOriginal`; panel-open flags; `saving` / `saveErr` / `saveOk`; `exitDialog`; `splitOpen`; create-step `draft`, `localCategories`, `newSvcFields` | Transient, view-only. Never the source of truth for persisted data — it stages edits for Save. |
| **Drawer shell state** (`ActionShell` via step `ctx`) | `stepData` (handoff payload incl. `service`, `packages`, `allCategories`, `onRefresh`, `openAction`); `setStepData`; `setFooter`; `setCloseGuard`; `close` | The drawer owns navigation and the footer/guard slots; steps push into them. |
| **Refresh / `onRefresh`** | Parent catalog refetch (`ServiceCatalogWorkstation` → `useAdminCatalog().refetch`), passed down as `onRefresh` | Invoked by `useServiceStation` mutations and by create/trash/archive flows. The catalog query excludes archived/trashed, so the active list self-filters. `refreshKey` re-triggers refetch on remount. |
| **Close guards** | Registered once via `setCloseGuard`, reading `exitStateRef` (avoids stale closures) | Blocks close on: dirty editor → `unsaved`; new-never-published + draft → `new-service-draft`; active + pending modules → `pending`. Terminal actions (Archive / Move to Trash) bypass via `closeWithoutGuard()`. |
| **Footer state** | Footer JSX pushed via `setFooter` inside an effect | Recomputed when its reactive inputs change (`tab`, `platformStatus`, `splitOpen`, `loading.status`, `canPublish`, status). The footer is derived, not independently stateful. |
| **Notification ownership** | Per-module note arrays (see *Notification System*) | View step: `moduleNotifications.ts` generators via `useServiceStation`. Create step: local arrays gated by local state. The shared pill/panel hold no note state. |

---

## 8. Footer Actions (Service tab)

The footer is rendered into the drawer shell via `setFooter`. For live states (`platform_status` ∈ {`active`, `disabled`}):

### Split button

A primary action plus a chevron-opened dropdown.

- **Primary action** (label by state):
  - `active` → **Disable**
  - `disabled` + previously published → **Enable**
  - new never-published (`disabled` + overview never settled) → **Move to Trash**
  - Disabled only while `station.loading.status`.
- **Chevron** — opens the dropdown. Always enabled except during loading. Never disabled merely because the primary "Move to Trash" path applies; there is always at least one secondary action.
- **Dropdown actions** — each gates itself:
  - **Archive** — disabled until the service has been published at least once (`!hasBeenPublished`). Disabled items show a muted, `not-allowed` style.
  - **Move to Trash** — always available, except **hidden** when it is already the primary action (new never-published), to avoid duplication.

### Publish / Cancel

- **Publish** — gated on `canPublish` (and not loading). Independent of `platform_status`.
- **Cancel** — closes the drawer (subject to the close guard).

### Terminal-action state reset

`Archive`, `Move to Trash`, and the new-service exit-dialog trash all call `closeWithoutGuard()` rather than `ctx.close()`. These are terminal: bypassing the guard prevents a stale `isNewNeverPublished` + draft condition from re-triggering the exit dialog and trapping the drawer on the now-archived/trashed service. After the action, `onRefresh` re-fetches the catalog (which excludes archived/trashed), and the drawer closes to a clean state.

---

## 9. Locked Module Behaviour

The rule that state attaches to the action control and never to the shell is owned by the Principles doc → *Temporary Disabled Rule*. The CSS hook `.drawerModule--locked` (intentionally empty) is documented in DrawerModuleSystem-v1 → Rule 4. Behaviourally, in the Create drawer:

- Included Features and Common Questions are **Locked** — their content cannot be edited until the service exists.
- The shell renders normally; only the `Edit` button carries the `disabled` attribute (`.cz-admin-btn:disabled` communicates unavailability).
- No CSS rule alters the shell based on lock state.

---

## 10. Create New Service Workflow (`ServiceCreateStep`)

The Create drawer renders the three modules pre-creation:

- **Service Overview** — New state. Shell visible, `Edit` enabled, blank placeholder values. Editing opens `ServiceOverviewEditor` inside `InlineEditorShell`; **Save creates the service** (`createService`), then the drawer closes and re-opens as `ServiceViewStep` for the new service.
- **Included Features / Common Questions** — Locked state. `Edit` disabled until the service exists.

### Create-step notifications (locally owned)

The step owns local note arrays gated by simple local state:

- **Service Overview**: `overviewComplete` (title + description + category all present) ?
  `Waiting for service publication.` : `Edit and create a service.` (info)
- **Included Features**: `Waiting for service activation.` (info) — fixed, because its Edit is always disabled here.
- **Common Questions**: `Waiting for service activation.` (info) — fixed, for the same reason.

The "Edit and add features." / "Edit and add questions." prompts are owned by the **view step** generators and appear once the service exists and the module Edit button is enabled. Notification state is thus keyed to the same condition that enables the Edit button.

On creation, the new service's resolved categories (with descriptions) are carried into the view drawer so the editor preloads correctly.

---

## 11. Service View Workflow (`ServiceViewStep`)

After creation (or via the catalog), the service opens in the view drawer:

- All three modules render their View cards with persisted data and interactive `ModuleStatusPill` + `ModuleNotificationPanel`.
- Each module's `Edit` opens its editor via `InlineEditorShell`; Save persists through `useServiceStation`.
- Footer split button + Publish drive lifecycle (*Footer Actions*).
- `useServiceStation` owns the data layer (*State Management*): status resolution, note generation, save/settle/revert, toggle active, archive, trash, and `onRefresh` propagation to the catalog.

---

## 12. Category Selector Workflow

The category control lives in `ServiceOverviewEditor`. It is a single inline workflow with two mutually exclusive modes driven by one `isAdding` flag.

### Normal mode (`isAdding === false`)

A `<select>`:

- First option: `Browse categories` — `disabled hidden` placeholder. It is the field value when nothing is selected (`value = ''`), shows muted via `cz-tf-select--unset`, and is **never** a selectable item.
- Middle: existing categories.
- Last option: `+ Add category` — a dedicated action row. Because the select's value is never the add sentinel, this row never receives the selection checkmark; selecting it enters add mode reliably from any starting value (including the empty state).

Selecting an existing category loads that category's description into the controlled description field (*Category Description Workflow*).

### Add mode (`isAdding === true`, entered only via `+ Add category`)

- The selector is **replaced in place** by a text `<input>` (`cz-tf-input`, accent focus styling), auto-focused.
- There is no separate create panel; the modes never coexist.
- The description editor reveals once the first character of the name is entered.
- **Commit** (Enter, or blur when moving to the description) creates the category immediately via `createServiceCategory`, selects it (real persisted `category_id`), and returns to normal mode. A re-entrancy guard prevents double creation; an empty name simply exits add mode. If the typed name matches an existing category, its real description is loaded rather than overwritten.
- **Escape** exits add mode and restores the previously selected category's description.

**Immediate creation is intentional.** Category creation is not deferred to module Save, so `category_id` is always a real persisted ID before the service is saved — keeping the parent save handlers and validation unchanged.

---

## 13. Category Description Workflow

The category description is a property of the **selected category**, edited inline beneath the selector, and persisted through the module's existing Save/Cancel — not its own save UI.

- The description `<textarea>` is **controlled by the parent** via `catDescription` + `onCatDescriptionChange`. The editor holds no description state of its own.
- It is visible whenever a category is selected (normal mode), or once a name character is typed (add mode).
- The parent (`ServiceCreateStep` / `ServiceViewStep`) holds `catDesc` and `catDescOriginal`:
  - Initialised when the editor opens, from the selected category's description.
  - **Module Save** persists via `updateServiceCategory(category_id, { description })` **only when** `catDesc.trim() !== catDescOriginal.trim()`, then commits the new original. A separate API call from the service/overview save, integrated into the same Save action.
  - **Module Cancel** resets `catDesc` to `catDescOriginal`, discarding the change.
- The API response updates the local category list in place so the saved description renders immediately and reloads correctly.

**Reload correctness:** category lists must carry `description`. `normalizeAdminCategories` and `AdminCatalogResponse.categories` include `description`, so `allCategories` reflects persisted descriptions and the editor preloads them on reopen.

---

## 14. Architectural Decisions (implementation record)

1. **Generic pill, module-owned notes.** `ModuleStatusPill` carries no module-specific logic. Each module computes its own `ModuleNote[]`. Keeps the pill reusable for Commercial modules unchanged.
2. **Panel gate on `notes.length`, not error count.** Info-only note sets must open the panel. View cards gate on `panelOpen && notes.length > 0`.
3. **Empty editable module emits a "next action" info note.** `getInclusionsNotes` / `getFaqsNotes` return an `Edit and add …` info note for empty modules instead of `[]`, so the pill is clickable and guides the user once editing is possible.
4. **Notification state mirrors Edit-button enablement.** Where Edit is disabled (locked create-step modules) the note is the waiting state; where Edit is enabled (view step) the note is the action prompt.
5. **Terminal actions bypass the close guard.** Archive/Trash use `closeWithoutGuard()` so the exit dialog cannot loop the drawer back onto an archived/trashed service.
6. **Split-button trigger is never disabled for lack of permission to one action.** Only individual dropdown actions gate themselves; the trigger opens whenever any action exists. Disabled actions render a visible disabled style (including the danger variant).
7. **Immediate category creation.** Categories are created on name-commit, not deferred, preserving a real `category_id` before service save and leaving the save architecture untouched.
8. **Single inline category workflow.** The separate create panel was removed; one `isAdding` flag makes create and edit-description mutually exclusive.
9. **Category description carried through normalization.** `description` is preserved end-to-end so saved values reload.

---

## 15. Key Files (canonical index)

The complete drawer module file index. Other docs cross-reference this table rather than maintaining their own.

| Concern | File |
|---|---|
| Drawer shell | `components/admin/ActionShell.tsx` |
| Edit shell | `components/admin/InlineEditorShell.tsx` |
| State machine / steps | `components/admin/workstations/ServiceCatalogWorkstation.tsx` (`ServiceCreateStep`), `ServiceViewStep.tsx` |
| Data layer | `hooks/useServiceStation.ts` |
| View cards | `components/admin/views/ServiceOverviewViewCard.tsx`, `ServiceInclusionsViewCard.tsx`, `ServiceFaqsViewCard.tsx` |
| Editors | `components/admin/editors/ServiceOverviewEditor.tsx`, `ServiceInclusionsEditor.tsx`, `ServiceFaqsEditor.tsx` |
| Pill / panel | `components/admin/ui/ModuleStatusPill.tsx`, `ModuleNotificationPanel.tsx` |
| Notes | `components/admin/utils/moduleNotifications.ts` |
| Status resolution | `components/admin/utils/moduleStatus.tsx` |
| Category API | `api/endpoints/admin.ts` (`createServiceCategory`, `updateServiceCategory`) |
| CSS | `resources/css/modules/admin.css` (`.drawerModule`, `.drawerOverview.service`, `.cz-footer-split*`, `.cz-module-notes*`) |

---

## 16. Extension Guidelines & Commercial Migration Template

This is the **single actionable checklist** for building any new drawer module. The Principles doc states the conceptual inheritance rule; DrawerModuleSystem states the CSS rule; both defer the build steps to this section.

When migrating Commercial modules (Package Summary, Promotion Configuration), inherit this architecture rather than reinventing it:

1. **Frame** — use `.drawerModule` (+ a module scope class only if a unique body system is required). No `.cz-sv-module` for new drawer modules (DrawerModuleSystem → Rule 3).
2. **Header** — icon + title/subtitle + `.drawerModule__status` holding `ModuleStatusPill`.
3. **Notifications** — own the module's notes; pass `notes` + `onOpen`; render `ModuleNotificationPanel` below the header; gate on `notes.length > 0`. Errors drive the badge, info drives guidance.
4. **Status** — use the 5-state lifecycle and `moduleStatus.tsx` resolvers (Principles → *Module Status Model*).
5. **View / Edit** — deliver Edit through `InlineEditorShell` with module Save/Cancel; keep View and Edit as one module in one drawer position.
6. **States** — Locked/New affect only the action control, never the shell (Principles → *Temporary Disabled Rule*).
7. **Lifecycle actions** — terminal actions (archive/trash/equivalent) bypass the close guard and refresh the data layer.
8. **State ownership** — persisted data and notes in the station hook; transient edit state at step level; footer/guard via the shell (*State Management*).
