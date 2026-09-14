# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed with safeguards**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Reviewed topic head: `f3c3d284001340c3af12df0e3ebbc2d1ab85654c`

## Goal
Package Home only. Refine accordion-row background colors in the **Connections** and **Settings** panels.

### Connections panel
- Family Group
- Groups
- Rate Sheet

### Settings panel
- Family Groups
- Tier Groups
- Rate Sheets
- Maintenance

**Background color only.**

## User clarification from live screenshots
The visual intent is now explicit:
- the **default/resting row must be the darker state**;
- **hover must be the lighter / more highlighted state**;
- hover must never make the row look less highlighted than default.

The screenshots show the current candidate doing the opposite: default is the lighter/elevated surface and hover drops to the darker/base surface. That is visually backwards.

## Reviewer audit
The topic is correctly scoped to the shared Package Home accordion owner. The actual source confirms:
- `.cz-tier-deck__accordion-section` = `var(--station-surface-elevated)` at rest;
- `.cz-tier-deck__accordion-trigger:hover` = `var(--station-surface)` on hover.

That makes hover darker than default, exactly matching the defect in Nath's screenshots. The Builder's comment also explicitly says the change intentionally reversed the prior “lighten on hover” rule, which is not the intended result.

No architecture issue exists; this is a bounded visual correction only.

## Blocking correction
On the same topic branch:
1. Make the **default/resting accordion row darker**.
2. Make **hover lighter/more highlighted**.
3. Change background color only.
4. Keep the same narrow Package Home accordion selectors; do not alter typography, borders, radius, spacing, icons, actions, focus treatment, accordion behavior, routing, or data.
5. Restore/update the nearby comment so it describes the actual rule: hover highlights/lightens, never visually recedes.
6. Rebuild generated CSS and rerun the same focused checks.

Use the existing two surface tokens unless source inspection proves a different existing token pair is required; the visual direction must be darker default -> lighter hover.

## Next action
Builder: apply only this correction on `package-home-accordion-row-backgrounds`, push the updated topic branch, record the new exact SHA and validation evidence here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` yet.
