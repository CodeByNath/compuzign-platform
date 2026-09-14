# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed with safeguards**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Reviewed topic head: `cd2f76bf292e4c5c05a841f017fd43cc89ce51bc`

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

## User clarification from screenshots
The screenshots show:
- default/resting row = dark/base surface;
- hovered Family Groups row = lighter/elevated surface.

Nath explicitly said the hover state becoming lighter is the wrong direction and **must be opposite**. Therefore the intended result is:
- **default/resting row = lighter/elevated surface**;
- **hover = darker/base surface**.

The earlier Reviewer instruction interpreted that screenshot backwards. This file now corrects that mistake.

## Reviewer audit
The current corrected topic `cd2f76bf` has **no net file diff from `main`**: its second commit cancels the first one. GitHub compare reports two commits ahead but `files: []`. Production/current source is still:
- `.cz-tier-deck__accordion-section` → `var(--station-surface)`;
- `.cz-tier-deck__accordion-trigger:hover` → `var(--station-surface-elevated)`.

That is exactly the visual behavior Nath rejected in the screenshots: dark at rest, lighter on hover.

The first topic commit `f3c3d284...` actually had the requested opposite direction. The architecture/scope was otherwise correct and narrow.

## Blocking correction
On the same `package-home-accordion-row-backgrounds` branch:
1. Set `.cz-tier-deck__accordion-section` default background to `var(--station-surface-elevated)`.
2. Set `.cz-tier-deck__accordion-trigger:hover` background to `var(--station-surface)`.
3. Background color only. Do not change typography, borders, radius, spacing, icons, actions, focus treatment, accordion behavior, routing, or data.
4. Update the nearby comment to describe the intended rule accurately; do not preserve the old “lighten on hover” wording because that is specifically what Nath rejected.
5. Rebuild generated CSS and rerun the same focused checks.

## Next action
Builder: restore that exact visual direction on the same topic branch, push the new topic head, record the exact SHA and validation evidence here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` yet.
