# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **READY FOR BUILDER**
- Builder: **Claude / Codex as assigned by Nath**
- Reviewer: **ChatGPT independent auditor**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`

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
