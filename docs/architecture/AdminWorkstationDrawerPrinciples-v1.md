# Admin Workstation Drawer Principles — v1

Reference implementation: Service Catalog only.
Does not cover Transit Hub, Packages, Promotions, Requests, CRM, or any other workstation.

---

## A Drawer Is a System

A drawer consists of:

- **Header** — title, navigation controls, close action
- **Tabs** — e.g. Service / Commercial; separates logical content areas within the drawer
- **Body** — contains the drawer modules
- **Footer** — primary and secondary actions

The drawer body contains modules. Modules are persistent.

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
/* .cz-sv-module--locked {
  pointer-events: none;
} */
```
Applied `pointer-events: none` to the entire module shell. Disabled. Violates the rule — state must not be applied to the shell.

**Rule 2 — removed (action opacity override):**
```css
/* .cz-sv-module--locked .cz-sv-overview-block__edit {
  opacity: 1;
} */
```
Applied `opacity: 1` to the action control inside a locked module, overriding `.cz-admin-btn:disabled { opacity: 0.45 }`. Removed. The locked state must let the disabled button styling communicate unavailability — it must not force the action to appear active.

The correct implementation:
- The `disabled` attribute is set on the action button only.
- The shell renders normally — visible, laid out, readable.
- `.cz-admin-btn:disabled { opacity: 0.45; cursor: not-allowed; }` handles all visual disabled state for the action control.
- No CSS rule targets the module shell with a state class.

This is the reference behavior for all future drawer modules. Any CSS rule that targets the module shell with a state class, or overrides disabled button styling from a shell-level selector, must be treated as a violation of this principle.

---

## Reference Implementation

The Service Catalog is the reference implementation for Drawer Principle v1.

### Key Files

**Drawer system (outer shell)**
`resources/ts/components/admin/ActionShell.tsx`
Header, body, footer, step management. Opened via `openAction()` with `mode: 'drawer'`.

**Edit state shell**
`resources/ts/components/admin/InlineEditorShell.tsx`
The Edit state carrier. Wraps each module's editor component and provides Save / Cancel actions. All three modules use the same shell for their Edit state.

**Module state machine**
`resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx`

- `ServiceViewStep` — View/Edit state machine. `editingSection: 'overview' | 'inclusions' | 'faqs' | null` drives which module (if any) is in Edit state.
- `ServiceCreateStep` — New/Locked state rendering. Service Overview = New (blank, edit enabled). Included Features and Common Questions = Locked (shell visible, edit disabled).

**Module editor content**
- `resources/ts/components/admin/editors/ServiceOverviewEditor.tsx`
- `resources/ts/components/admin/editors/ServiceInclusionsEditor.tsx`
- `resources/ts/components/admin/editors/ServiceFaqsEditor.tsx`

**Drawer styles**
`resources/css/modules/admin.css`
Contains the `.cz-sv-module--locked` class and the temporarily disabled shell-state rule documented above.

---

## Inheritance

Any future module entering the drawer system must follow these principles and inherit drawer behavior rather than inventing new drawer rules.

The pattern to follow:

1. A module has a fixed shell structure.
2. States affect content and actions, not the shell.
3. Edit state is delivered through `InlineEditorShell`.
4. Locked state disables only the action control — the shell stays visible and laid out.
5. New state shows placeholder content — the shell is fully rendered.
