# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Corrected topic head: `64a8e772085b19b0f907460ca2c31d868e779438` (on `package-home-accordion-row-backgrounds`, supersedes `cd2f76bf292e4c5c05a841f017fd43cc89ce51bc`)

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

## Builder correction result (round 3)

Applied exactly the blocking correction, on the same topic branch:
- `.cz-tier-deck__accordion-section` (resting/default) → `var(--station-surface-elevated)`
- `.cz-tier-deck__accordion-trigger:hover` → `var(--station-surface)`
- Reworded the adjacent comment to state this direction plainly, dropping the previously-rejected "lighten on hover, never darken" framing entirely (not just its values).

Nothing else touched — no typography, border, radius, spacing, icon, action, focus, accordion behavior, routing, or data change.

**Verification of net direction:** `git diff f3c3d284 64a8e772 -- resources/ts/admin-station/styles/admin-station.css` shows the color values are byte-identical to the very first topic commit (`f3c3d284`) — only the comment wording changed this round. So the live token pairing after this commit is: resting = `--station-surface-elevated`, hover = `--station-surface`, exactly as `f3c3d284` originally shipped and exactly as this round's correction specifies.

**Flagging for Reviewer:** this is the third direction instruction on this same pair of tokens (round 1: elevated/base as originally submitted → round 2 corrected it to base/elevated → round 3 now corrects back to elevated/base). Recommend confirming the direction against the actual live screenshot one more time before merge, since the last two rounds each reversed the prior one entirely.

Commit: `64a8e772085b19b0f907460ca2c31d868e779438` on `package-home-accordion-row-backgrounds` (pushed).

### Checks run (all passed)
- `npx tsc --noEmit`
- `npm run build` (dist/css/admin-station.css rebuilt)
- `npm run contract:package-tier-workspace`
- `npm run contract:package-tier-workspace-shell`
- `npm run contract:tier-connections`
- `npm run contract:tier-settings`
- `npm run docs:check`
