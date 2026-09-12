# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: Codex
- Reviewer: ChatGPT independent auditor
- Verdict: **Proceed with safeguards**
- Production base: `fc878fb703e9590d03132940aa0e7b19893135d4`

## Scope
Refine the existing Admin Station UI only. Preserve platform architecture, persistence, pricing, identity, lifecycle authority, customer flows, and customer-facing presentation.

Refine existing Admin presentation through its current tokens and shared primitives: shell scale, spacing, hierarchy, depth/elevation, typography, radii, borders, shadows, navigation, cards, panels, lists/tables, status presentation, buttons and interaction states, drawer/modal presentation, and responsive composition.

Do not create a second design system, field system, button system, drawer system, card system, or status system. Reuse existing `--station-*`, `--cz-*`, and `cz-tf-*` authorities.

## Required reading
Before source edits read root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/admin-station.md`, `docs/code-map/admin-station-styles.md`, and the Station/Drawer lifecycle contract.

Admin Station remains presentation/control only. Hosting does not transfer Service or Package persistence/lifecycle authority.

## Phase 1 only
1. Sync `Project-work-instructions` and verify branch hygiene.
2. Use one topic branch for this work.
3. Audit current Admin presentation source and CSS ownership first; record intended files/surfaces and risks here.
4. Implement only the first coherent visual-foundation pass: shared Admin tokens plus shell/surface/spacing/type/depth primitives used across multiple Admin surfaces.
5. Keep behaviour unchanged; no broad source refactor and no customer-facing redesign.
6. Run focused checks plus `npm run contract:admin-station-css`, relevant build, and docs check if documentation/ownership changes.
7. Push the candidate to the topic branch, update this file to **AWAITING REVIEWER REVIEW** with exact SHA, changed files and validation, then stop.

`main` push is not approved.

## Phase 1 audit and intended pass
- Existing token sheet owns palette, shape and rhythm; base sheet owns shell and shared presentation, responsive sheet owns breakpoints, drawer-kit owns fields/content. Preserve those boundaries.
- Intended source: `admin-station-tokens.css` and `admin-station.css` under `resources/ts/admin-station/styles/`; affected Styles Code Map and rebuilt Admin CSS.
- Refine shared home spacing, heading hierarchy, card surface depth and light/dark neutral treatment. Keep control dimensions, status mapping, drawer placement, scroll/focus behaviour and all TypeScript/PHP unchanged.
- Risks: shared tokens affect multiple Admin surfaces and drawer fields; check both themes, existing CSS contract and build. Preserve responsive breakpoint/layout rules.
- Branch audit: `admin-ui-refinement`, `noop`, `noop2` all pointed to production base. Verified both noop branches are ancestors of `main` and removed them remotely; reuse `admin-ui-refinement` as the sole topic.

## Builder handoff — Phase 1
- Candidate pushed: `admin-ui-refinement` at `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`, based on production `fc878fb703e9590d03132940aa0e7b19893135d4`. No main push or deployment.
- Changed files (plugin-relative unless stated): `resources/ts/admin-station/styles/admin-station-tokens.css`, `resources/ts/admin-station/styles/admin-station.css`, `dist/css/admin-station.css`, repository `docs/code-map/admin-station-styles.md`.
- Result: 10px shared control corners, quieter light neutral/border/overlay treatment, theme-aware shallow depth for group/category cards, token-driven heading hierarchy, 16px home block gutters. No TS/PHP, field-system, lifecycle, navigation or customer-source changes.
- Passed: TypeScript (`npx tsc --noEmit`), build, 98 station-tabset checks, docs check (119 documents / 48 maps), `git diff --check`. Build changed only the Admin CSS bundle.
- CSS contract: six existing unused Rate Sheet selector failures (`group-create`, `import-basket`, `import-columns--pair`, `import-group`, `import-group-chips`, `import-group-title`, all prefixed `cz-rate-sheet-tool__`). Reproduced identical failures by running the contract against `main` stylesheet content with unchanged source emitters; no new failures. Kept unrelated cleanup outside this pass.
- Visual evidence: inspected temporary static CSS fixtures in headless Chrome, light desktop 1280×900 and dark narrow 390×844. Desktop foundation reads consistently; narrow screenshot clips, so responsive verification is inconclusive. These are representative markup fixtures, not mounted live WordPress/customer validation. Reviewer must assess responsive/live appearance before acceptance.
- Branch hygiene: only main, coordination, and this topic remain in local/tracking refs. Source tree clean after candidate commit. Stopped for independent review; later phases and production push remain unapproved.
