# Package Home — Connections / Settings Accordion Row Backgrounds

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production `main`: `64a8e772085b19b0f907460ca2c31d868e779438`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1032 — **Success**

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

## Production / deployment evidence
- Nath fast-forwarded `main` to `64a8e772085b19b0f907460ca2c31d868e779438` (the exact approved candidate, verified byte-identical — no source change since review) and pushed.
- GitHub Actions "Deploy to Hostinger" run [#1032](https://github.com/CodeByNath/compuzign-platform/actions/runs/34863036567) completed with conclusion **success** for that SHA.
- Confirmed separately: this SHA does not include the unrelated `admin-station-logout-redirect` branch — the two are independent siblings off `cf7d7f2b`, and this candidate touches only the two accordion CSS files.

## Live validation requested — Nath
Please check on the live Package Home:
- **Connections panel** (Family Group, Groups, Rate Sheet accordion headers) and **Settings panel** (Family Groups, Tier Groups, Rate Sheets, Maintenance accordion headers): resting/default row should read the lighter/elevated surface, hover should settle to the darker/base surface — matching the direction from your screenshots.
- Nothing else changed: accordion open/close, row content, actions, and everything inside each panel should look and behave exactly as before.

Reply pass/fail here (or in chat) and I'll close this out.
