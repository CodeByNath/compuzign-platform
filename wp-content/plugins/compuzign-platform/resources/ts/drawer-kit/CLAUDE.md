# Drawer Kit — Shared Drawer Presentation

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/drawer-kit/` is the entity-agnostic presentation layer every Admin Station drawer renders through. It owns drawer content structure and appearance; it never owns persistence, validation, lifecycle or domain rules — those stay with the owning station.

- `EntityDrawer.tsx`, `entityDrawerHost.ts` — the composition bridge a station host supplies.
- `ReadBlock.tsx`, `ActionFooter.tsx` — the module read card and its card-level footer.
- `EntityActionFooter.tsx` — the record footer grammar (split action, overflow menu, tones). `CanonicalEntityFooter.tsx` is the `platformStatus` policy layer over it.
- `InlineEditorShell.tsx` — the module edit session: header, body, save/cancel footer, dirty-discard confirm.
- `DrawerTabs.tsx` — the two-tab Overview/Connections bar. Deliberately not configurable.
- `schema/` — the shell/element renderer contract (`ShellSchema`, `ShellSlot`, `ShellEditSession`, `TableSchema`).
- `fields/` — **the one Admin drawer field system**. See below.
- `ui/`, `utils/` — async section, skeleton, status pill, module notifications.

The stylesheet is `resources/css/modules/drawer-kit.css`, built as its own Vite entry and enqueued ahead of the Admin Station sheet. `.cz-admin-station` is its only live root.

## The field system

`fields/` and the `cz-tf-*` classes are the single field system for every Admin Station drawer and editor. Do not create another one, and do not restyle controls from a feature stylesheet.

- `fields/types.ts` — `AdminFieldType` (text, number, email, tel, search, select, textarea, checkbox), `AdminFieldSize` (small, default, large), `AdminFieldDef`, `AdminFieldBinding`.
- `fields/AdminField.tsx` — renders one definition. The only place that decides which element and which classes a field type gets.
- `fields/AdminFieldGroup.tsx` — wrapper, label, hint, error, required marker.

CSS contract: one wrapper `.cz-tf-field`, one label `.cz-tf-label`, one hint `.cz-tf-hint`, one error `.cz-tf-error`, one control base `.cz-tf-control`. Types specialise the base (`.cz-tf-input`, `.cz-tf-select`, `.cz-tf-textarea`, `.cz-tf-checkbox`); sizes are `--sm` / `--lg` on the base; states are declared once on the base. Eight types × three sizes are built from shared tokens and shared primitives — never as separate implementations.

Editors pass field data into `AdminField`. An editor that hand-authors `<div class="cz-tf-field"><label class="cz-tf-label">…<input class="cz-tf-input">` is a defect.

## Boundaries

Consumers import from `@/drawer-kit`. The kit renders entity data; it must not import station mutation hooks or call endpoints. Colour, shape and rhythm come from the Admin Station token file — the kit defines no tokens of its own.

Feature stylesheets must not declare `border`, `border-radius`, `height`, `min-height`, `outline`, `box-shadow`, `background` or `color` on an `input`, `select`, `textarea`, `label` or a `cz-tf-*` class. The Admin Station CSS contract script enforces this from the enforcement phase onward.

Read [Admin Station Styles](../../../../../../docs/code-map/admin-station-styles.md), [Admin Station Drawer](../../../../../../docs/code-map/admin-station-drawer.md), [Drawer System](../../../../../../docs/code-map/drawer-system.md), and the locked [Admin Station Field System](../../../../../../docs/architecture/admin-station-field-system-v1.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.
