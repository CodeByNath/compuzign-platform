# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production base: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Approved topic head: `64a8e772085b19b0f907460ca2c31d868e779438`
- Verdict: **Proceed**

## Goal
Package Home only. Change background direction for accordion rows in Connections and Settings.

**Must preserve:** all existing content, typography, borders, radius, spacing, icons, focus treatment, actions, accordion behavior, routing, data, and Package authority.

**Must change only:**
- resting/default row → `var(--station-surface-elevated)`;
- hover → `var(--station-surface)`.

This is Nath's clarified direction from the screenshots: lighter/elevated at rest, darker/base on hover.

## Independent reviewer audit — 2026-09-15
Reviewer independently inspected the pushed candidate against production base rather than relying on the Builder report.

GitHub compare `cf7d7f2b...64a8e772` is ahead by 3 commits, behind by 0, with exactly two net changed files:
- `wp-content/plugins/compuzign-platform/resources/ts/admin-station/styles/admin-station.css`
- `wp-content/plugins/compuzign-platform/dist/css/admin-station.css`

Authoritative source at approved head confirms:
- `.cz-tier-deck__accordion-section` → `background: var(--station-surface-elevated);`
- `.cz-tier-deck__accordion-trigger:hover` → `background: var(--station-surface);`
- adjacent comment now describes that exact direction.

The final commit changes only those token values/comment in source plus rebuilt generated CSS. No architecture, persistence, identity, routing, lifecycle, or interaction behavior changed.

Builder-reported checks all passed:
- `npx tsc --noEmit`
- `npm run build`
- `npm run contract:package-tier-workspace`
- `npm run contract:package-tier-workspace-shell`
- `npm run contract:tier-connections`
- `npm run contract:tier-settings`
- `npm run docs:check`

## Next action
Builder may move **only exact reviewed candidate `64a8e772085b19b0f907460ca2c31d868e779438`** to `main` and run the normal deployment pipeline. Any source change invalidates this approval.

After production push, record the exact `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, add the concise live-validation request for Nath, and stop. Nath performs the live browser validation.
