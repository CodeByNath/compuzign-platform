# Admin UI Refinement

## Status
- **READY FOR BUILDER**
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
