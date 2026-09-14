# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Topic branch: `package-home-accordion-row-backgrounds`, pushed at `f3c3d284001340c3af12df0e3ebbc2d1ab85654c`

## Goal
Package Home only. Refine accordion-row background colors in the **Connections** and **Settings** panels.

### Connections panel
Swap the current **default** and **hover** background colors for these row groups:
- Family Group
- Groups
- Rate Sheet

### Settings panel
Apply the same default/hover background-color swap to:
- Family Groups
- Tier Groups
- Rate Sheets
- Maintenance

**Change background color only.**

## Architecture / safeguards
`docs/code-map/package-settings.md` confirms Settings and Connections share the same accordion contract and connected-record row system. `TierConnectionRow.tsx` is the shared row implementation for Family Group, Tier Group, Group, and Rate Sheet rows; Maintenance reuses the accordion but is not a connected-record row.

This is a presentation-only refinement. Do not change:
- row content, typography, borders, radius, spacing, padding, icons, actions, status pills, or chevrons;
- accordion open/close behavior or `aria-expanded` / `aria-controls`;
- routing, drawer targets, filters, connected-record projections, identities, or persistence;
- hover behavior other than the requested background-color swap;
- unrelated Package Home panels or global row systems.

Prefer the narrowest existing selectors/tokens that already own these Package Home rows. Do not create a second accordion/row styling system.

## Builder task
1. Confirm housekeeping first: the completed `rate-sheet-unit-price-popover` topic is contained in `main`, delete the stale topic branch, and return to the two permanent branches before creating one new topic branch for this work.
2. Read the relevant Package Home / Settings / Connections source and styles before editing, including `TierAccordionSection.tsx`, `TierConnectionRow.tsx`, `TierSystemSettings.tsx`, the Connections presentation, and the owning stylesheet/selectors.
3. Identify the exact current default and hover background values/selectors for the affected rows.
4. Swap only those two background-color states for the listed Connections and Settings row groups. Leave every other visual/property byte-for-byte unchanged where practical.
5. Ensure the shared-row implementation does not accidentally change unrelated consumers. If one shared selector covers extra surfaces, scope the change to Package Home Connections/Settings rather than broadening the visual change.
6. Run focused TypeScript/build/CSS/contracts/docs checks appropriate to Package Home/Tier workspace.
7. Push only the topic branch, record exact SHA/files/tests and the exact selectors/tokens changed here, set **AWAITING REVIEWER REVIEW**, and stop.

No product implementation was performed by Reviewer.

## Builder result

### Housekeeping
- Verified `rate-sheet-unit-price-popover` was fully contained in `main` (`git merge-base --is-ancestor` confirmed) before deleting it, local and remote.
- Returned to `main` (synced with `origin/main`, still at `cf7d7f2b133f3354e617318773b6da2d60d2e610`) and branched `package-home-accordion-row-backgrounds` from there.

### Root cause / target found
`TierAccordionSection.tsx` is rendered **only** by `TierConnections.tsx` (Connections panel: Family Group, Groups, Rate Sheet) and `TierSystemSettings.tsx` (Settings panel: Family Groups, Tier Groups, Rate Sheets, Maintenance) — confirmed by grepping every consumer of the component. No other station or lane uses it, and the visually similar `DrawerGroupAccordion.tsx` (drawer-kit) uses its own distinct `cz-drawer-groups__*` class family, so there is no collision risk.

The single CSS owner of every one of those accordion "row groups" is one rule pair in `wp-content/plugins/compuzign-platform/resources/ts/admin-station/styles/admin-station.css`:
- `.cz-tier-deck__accordion-section` — the row group's **default** background (was `var(--station-surface)`)
- `.cz-tier-deck__accordion-trigger:hover` — the row group's **hover** background (was `var(--station-surface-elevated)`)

### Change made
Swapped exactly those two token values (lines ~3283–3314):
- default → `var(--station-surface-elevated)`
- hover → `var(--station-surface)`

Also corrected the adjacent code comment ("Lighten on hover, never darken…"), which documented the now-reversed rule, so it no longer misleads the next reader. No other property on these rules, and no other selector, was touched. `dist/css/admin-station.css` was rebuilt and included.

### Files changed
- `wp-content/plugins/compuzign-platform/resources/ts/admin-station/styles/admin-station.css`
- `wp-content/plugins/compuzign-platform/dist/css/admin-station.css` (build output)

### Checks run (all passed, from the plugin root)
- `npx tsc --noEmit`
- `npm run build`
- `npm run contract:package-tier-workspace`
- `npm run contract:package-tier-workspace-shell`
- `npm run contract:tier-connections`
- `npm run contract:tier-settings`
- `npm run docs:check`
- `npm run contract:admin-station-css` — fails with the same 6 pre-existing `cz-rate-sheet-tool__import-*` findings present on `main` before this change (verified via `git stash`); unrelated to this work.

### Note for Reviewer
The work order says "swap the current default and hover background colors," which I took literally: the two token values trade places. This intentionally reverses the accordion trigger's previous "lighten on hover, never darken" behavior — hover now reads as the base surface rather than the elevated one. Flagging this explicitly since it inverts a previously-documented design rule; if that reversal wasn't the intent, the fix is a one-line revert of the two token values above.
