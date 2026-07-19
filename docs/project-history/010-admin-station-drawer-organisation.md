# 010 — Admin Station Drawer Organisation Pass

Status: closed (immutable). The blueprint below was written before implementation; the completion records after it were appended per phase during this one milestone.

## Original problem

The four Admin Station drawers (Category, Package Family, Service, Tier) are connected and visually consistent, but the coordination layer has grown maintenance hotspots: two controllers and one station hook above 500 lines, a 467-line multi-domain notification-rules file, and duplicated guarded-close / lifecycle-runner / dismissal machinery repeated across controllers. This is a controlled internal organisation pass — no UI redesign, no architecture rebuild, no runtime behaviour change.

## Baseline (recorded before any implementation change)

File sizes (lines) of the audited hotspots at commit `7e5c670`:

| File | Lines | Verdict |
|---|---|---|
| `entity-drawers/service/useServiceDrawerController.ts` | 542 | mixed: editing machine + lifecycle + exit flow + bindings |
| `admin-station/stations/service/useServiceStation.ts` | 537 | mixed: fetch + pure derivations + actions |
| `hooks/usePackageStation.ts` | 496 | coherent station pattern; one duplicated derivation (rate-sheet label resolution) |
| `drawer-kit/utils/moduleNotifications.ts` | 467 | one shared engine + seven independent domain rule groups |
| `entity-drawers/tier/useTierDrawerController.ts` | 409 | mixed: navigation + editing + bin travel + derived model |
| `drawer-kit/utils/moduleStatus.tsx` | 349 | SECTION-indexed, coherent — not a target |
| `entity-drawers/category/useCategoryDrawerController.ts` | 297 | coherent but carries duplicated chrome machinery |
| `hooks/useCategoryStation.ts` | 260 | clean — not a target |
| `entity-drawers/package-family/usePackageFamilyDrawerController.ts` | 258 | coherent but carries duplicated chrome machinery |
| `hooks/usePackageFamilyStation.ts` | 162 | clean — not a target (named in the brief as a hotspot; the audit disproves that) |

Baseline validation, all run on the clean tree:

- `npx tsc --noEmit` — pass.
- `npm run build` — pass; `admin-station.js` 34.69 kB, `CategoryDrawerContent-ZZG5c1Au.js` 142.73 kB (shared chunk), `admin.js` 170.92 kB.
- TS contracts: `manager-coordinator`, `tier-pricing-parity`, `tier-occupant-admin` pass via `npx tsx`; `active-package-read-only-provider`, `package-relation-provider` use top-level await and pass via `npx vite-node` with a minimal alias-only config (the project vite config's preact preset crashes under Node 26's CJS Vite API — runner issue, not code).
- Snapshots: `mode-renderer-snapshot` 22 cases byte-identical; `module-state-snapshot` 37 cases byte-identical.
- PHP contracts (PHP 8.5.6 CLI, no WordPress runtime): all six `tests/*.php` pass, including the 49-route baseline.
- Cycles (`npx madge --circular resources/ts`): exactly 4 — three in `components/admin`, one in `admin-station/presentation` (templateKits ↔ ServiceCategoryCarousel). This is the documented baseline; no new cycle is acceptable.
- Bundle closure of the `admin-station` entry (134 modules): zero `components/admin` modules, zero `StepContext`; exactly one each of `EntityDrawer`, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, `EntityActionFooter`, `CanonicalEntityFooter`; all four `entity-drawers/*/…DrawerContent` compositions reachable. Command Centre adapters (`CategoryViewStep`, `ServiceViewStep`, `ServiceTierStep`, `serviceManagerDrawers`) all mount the same compositions.
- WordPress browser runtime: **not available — no runtime checks were performed, here or in any phase.**

## Current architecture (confirmed from source)

```text
card/carousel action → StationSurfaceHost → AdminStationDrawerContext
  → AdminStationDrawer (single shell, no entity switch)
    → drawerRegistry → entity host adapter (native id, no coercion)
      → entity-drawers/<entity>/<Entity>DrawerContent (shared composition)
        → use<Entity>DrawerController (coordination, renders nothing)
          → authoritative station hook (the only write boundary)
```

Shared systems, each singular: `EntityDrawer` renderer, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, module `ActionFooter`, record-level `EntityActionFooter`/`CanonicalEntityFooter`, and the `moduleNotifications` evaluate engine. Identities: Category/Service numeric, Package Family string `group_id`, Tier stable string `occupant_id`.

## Confirmed duplication

1. **Guarded-close machinery** — `bypassRef` + `pendingContinuationRef` + `evaluateExit` + `bridge.setCloseGuard` wiring + guarded tab select + `resolveExit` + `closeBypassingGuard`: implemented three times, near-verbatim, in the Service, Category, and Package Family controllers. Tier deliberately differs (`window.confirm`) and is excluded.
2. **`saveOk` auto-dismiss timer effect** — four copies (Service/Category/PF 3000 ms, Tier 2500 ms).
3. **Split-dropdown outside-click dismissal effect** — four verbatim copies.
4. **`runLifecycle` wrapper** (+`actionError`) — byte-identical in Category and Package Family but for the entity label in the fallback message.
5. **Rate-sheet relationship label resolution** (`decorated_label ?? resolved.label/question ?? '(missing source)'`) — duplicated between `usePackageStation.tierView` and `useTierDrawerController.tierDetail`.
6. **`moduleNotifications.ts`** — not duplication but seven independent domain rule groups (service, package/package-manager, tier, promotion, category, category-group, package-family) sharing one file with the generic engine.

## Archive/restore grid audit (Phase 3 decision: SKIP)

There is no repeated archive/trash/restore **grid presentation** to consolidate:

- The Admin Station card walls render only `scope: 'current'` bindings (`surfaceBindings.ts`); no archived/trashed wall exists.
- The only in-drawer travel presentation is `entity-drawers/tier/TierBinList.tsx` — single implementation, and its conflict prompts (swap / retarget / discard-drafts) are genuinely Tier-specific.
- Command Centre's bin is already consolidated: one shared `EntityTable` fed by per-entity `placements.travel.bin` schema presets (`BinStation.tsx`). Category, Service Category Group, and Service panes share the renderer and keep entity-specific authority.
- Package Family archived/trashed presentation in Command Centre (`PackageFamiliesSection`/`PackageFamilyCards`) is host-specific presentation outside the drawer system; merging it with Admin Station cards would change bundle boundaries for no behavioural gain.

Inventing `ArchiveRecordGrid`/`ArchiveRecordCard` components would create a third presentation system, violating the "no second systems" invariant. Phase 3 is therefore explicitly skipped on evidence.

## Extraction blueprint

### Phase 2 — notification rules by domain

Convert `drawer-kit/utils/moduleNotifications.ts` into a directory whose barrel preserves the existing import specifier (`@/drawer-kit/utils/moduleNotifications` and the relative `../utils/moduleNotifications` used inside drawer-kit — ~30 importers, zero of which change):

```text
drawer-kit/utils/moduleNotifications/
├── shared.ts        ModuleNote, NoteContext, ModuleState, ModuleDefinition,
│                    noteCount, lifecycleTail, evaluateModule, evaluateModuleNotes
├── service.ts       overview/inclusions/faqs modules + get*Notes generators
│                    (keeps the type-only import of stations/service/types — cycle-safe)
├── package.ts       packageModule, packageManagerItem/Summary modules, getPackageNotes
├── tier.ts          tierModule, tierOverview/Features/Faqs modules, getTierNotes
├── promotion.ts     promotionOverviewModule (+ PromotionOverviewLike)
├── category.ts      categoryOverviewModule, categoryServicesModule,
│                    serviceCategoryGroupOverviewModule (Category-owned taxonomy, one level up)
├── packageFamily.ts packageFamilyOverviewModule, packageFamilyRelationshipsModule
└── index.ts         re-exports everything — public surface unchanged
```

Rule files derive state only; no React. Renderers stay `ModuleStatusPill`/`ModuleNotificationPanel`. One validation-infrastructure edit: `scripts/module-state-snapshot.mjs` bundles the old file path as its esbuild entry; it changes to `moduleNotifications/index.ts`. Snapshot output must stay byte-identical.

### Phase 4 — Service controller

`useServiceDrawerController` stays the public coordinator with an unchanged return shape (presentation files consume `ServiceDrawerController` = `ReturnType<…>`; zero presentation edits). Extract:

- `entity-drawers/shared/drawerChrome.ts` — the shared machinery (new): `useAutoDismiss` (timer), `useOutsideClickDismiss`, `useGuardedClose(bridge, evaluate)` returning `{ guard, resolveExit, closeBypassingGuard }`, and `useLifecycleRunner(closeBypassingGuard, entityLabel)` for Phase 6.
- `entity-drawers/service/useServiceModuleEditing.ts` — module edit state machine: `editingSection`, drafts/originals, dirty checks, `catDesc`/`localCategories`/`createInlineCategory`, open/save/cancel handlers, `saveCurrentModule`, `saving`/`saveErr`/`saveOk`.
- `entity-drawers/service/useServiceLifecycle.ts` — record advancement: toggle/settle/publish/archive/trash handlers that fold station results into the local record.
- `entity-drawers/service/useServiceExitFlow.ts` — exit dialogs and continuations: `evaluateExit` state ref, exit dialog state, save-and-proceed / discard / settle / close-without-settling / new-service prompt handlers, composed on `useGuardedClose`.

Shell bindings and derived display values remain in the coordinator (they are the assembly).

### Phase 5 — Tier controller

`useTierDrawerController` stays the coordinator; same return shape; `slotOccupied` stays exported from it (TierBinList imports it). Extract:

- `entity-drawers/tier/useTierModuleEditing.ts` — section drafts + open/save/cancel.
- `entity-drawers/tier/useTierBinTravel.ts` — archive/restore/trash/delete + `binPrompt` + inline delete confirm.
- `entity-drawers/tier/tierDetailModel.ts` — the pure derived model (`tierDetail` construction incl. rate-sheet catalogue + shell bindings factory inputs, footer model), taking handlers as arguments.
- `entity-drawers/shared/rateSheetLabels.ts` — `resolveRelationshipLabel` shared with `usePackageStation` (both call sites updated here as one dedupe).

Tier keeps its `window.confirm` guard and `beforeunload` protection exactly as-is. Occupant identity untouched.

### Phase 6 — Category and Package Family controllers

Adopt `useGuardedClose`, `useAutoDismiss`, `useOutsideClickDismiss`, `useLifecycleRunner` from `drawerChrome.ts`. Confirm-dialog handlers stay per-entity (short, entity-named station methods — forcing a shared abstraction would obscure them). Return shapes unchanged. No new per-entity files; these two controllers shrink in place.

### Phase 7 — station hooks

- `admin-station/stations/service/derive.ts` (new, flat sibling per the station's local CLAUDE.md): pure derivations extracted from `useServiceStation` — inclusions/faqs status resolution, note contexts, publish gate, package summary block, publish-modal summaries. The hook keeps fetch/state/actions and composes the derivations. Public `ServiceStation` contract unchanged; station CLAUDE.md audit metadata replaced.
- `hooks/usePackageStation.ts` — only the Phase 5 label-helper adoption; otherwise confirmed coherent, left alone.
- `hooks/useCategoryStation.ts`, `hooks/usePackageFamilyStation.ts` — confirmed clean; not modified.

### Phase 8 — consolidation audit

Grep-verify: no duplicate notification/status/editor/footer/archive systems; no endpoint calls from presentation; no entity logic in `AdminStationDrawer`/`EntityActionFooter`/`CanonicalEntityFooter`; no identity coercion; no stale imports/comments/dead transitional files; madge cycle count still 4; bundle closure checks repeated; bundle sizes compared with baseline.

### Phase 9 — documentation, build, commit

Update Code Maps (`drawer-system.md`, `entity-drawer-recovery.md`, `admin-station-drawer.md`, `service-station.md` if touched), the service-station CLAUDE.md, and this document's completion record. Rebuild `dist`. One commit on `main`; no push.

## Files explicitly not modified

- Shell/registry: `AdminStationDrawer.tsx`, `AdminStationDrawerContext.tsx`, `drawerRegistry.tsx`, `drawerTypes.ts`, host adapters (`PackageFamilyDrawerContent` host, `CategoryDrawerHost`, `ServiceDrawerHost`, `TierDrawerHost`).
- Shared renderers: `EntityDrawer.tsx`, `DrawerTabs.tsx`, `InlineEditorShell.tsx`, `ActionFooter.tsx`, `EntityActionFooter.tsx`, `CanonicalEntityFooter.tsx`, `ModuleStatusPill.tsx`, `ModuleNotificationPanel.tsx`, `ReadBlock.tsx`, `moduleStatus.tsx`, schema elements/shells/types.
- Presentation compositions: all `*DrawerContent.tsx`, `*DrawerDialogs.tsx`, `*DrawerFooter.tsx`, `TierBinList.tsx`, editors, schema bindings/entities/tables.
- Authority/API: `api/**`, `stations/service/{api,types,index}.ts`, `useCategoryStation.ts`, `usePackageFamilyStation.ts`, `usePromotionStation.ts`, `useServiceCategoryGroupStation.ts`, `stationPrimitives.ts`.
- All `components/admin/**` (Command Centre), all CSS, all PHP.

## Invariants (verified after every phase)

Single shell / single renderer chain unchanged; no entity switch in `AdminStationDrawer`; no second drawer/notification/editor/status/footer system; native identities uncoerced (numeric Category/Service, string `group_id`, stable `occupant_id` — never a slot name); presentation calls no endpoints; controllers render nothing; stations remain the sole write boundary; no new global event bus; no universal entity schema; no duplicated lifecycle implementation; Overview/Connections tabs, pills, panels, inline editing, Save/Cancel, dirty detection, guarded close, Publish/Settle, Enable/Disable, Archive/Trash, Restore/Delete, Tier swap/retarget/conflict flows, targeted wall refresh, loading/error/disabled states, responsive drawer, and Command Centre behaviour all preserved.

## Validation plan (per phase)

`npx tsc --noEmit`; `npm run build`; `git diff --check`; `git status --short`; the five TS contracts (tsx / vite-node as recorded above); both snapshot suites (byte-identical required); PHP contract tests where the phase could touch shared behaviour; madge cycle check (must stay 4); bundle-closure checks after structural phases. Full suite again at Phase 8/9.

## Rollback points

Each phase ends with the full tree green before the next begins; a phase's change set is its file list above, so `git checkout -- <phase files>` reverts a phase cleanly until the single Phase 9 commit. Snapshot baselines (`scripts/__snapshots__/*.json`) are never regenerated — drift fails the phase.

## Completion criteria

Behaviour preserved; hotspot controllers reduced along the boundaries above; notifications organised by domain with an unchanged public surface; no archive-grid consolidation (proven unnecessary); shared systems still singular; identities unchanged; all available validation green; Code Maps and this history document match the implementation; `dist` rebuilt; one commit on `main`; nothing pushed.

---

## Phase completion records

### Phase 1 — blueprint and baseline: COMPLETE

Audit performed on the files listed above plus the drawer kit, compositions, hosts, registry, surface bindings, and Command Centre bin surfaces. Baseline validation recorded in full above; working tree was clean at start (`7e5c670`). No implementation change was made before this record.

### Phase 2 — notification rules by domain: COMPLETE

Executed exactly as planned: `moduleNotifications.ts` (467 lines) became the seven-file directory plus barrel; every module definition, helper, comment block, and backward-compatible generator moved verbatim into its domain file. Zero consumer edits — all ~30 importers resolve the directory barrel through their existing specifiers. One validation-infrastructure edit as planned: `scripts/module-state-snapshot.mjs` entry path now points at `moduleNotifications/index.ts`. No deviation from blueprint. Resulting sizes: `shared.ts` 108, `service.ts` 87, `category.ts` 99, `tier.ts` 72, `package.ts` 50, `promotion.ts` 45, `packageFamily.ts` 43, `index.ts` 12.

Validation: `tsc` pass; build pass (modules moved between the `admin.js` and shared `CategoryDrawerContent` chunks, net size unchanged — chunk hash rotation is expected when the module count changes); **module-state snapshot 37 cases byte-identical and mode-renderer snapshot 22 cases byte-identical**, proving runtime notification behaviour unchanged; all five TS contracts pass; cycle count still exactly 4 (same cycles); `git diff --check` clean.

### Phase 3 — archive/restore grid consolidation: SKIPPED (as blueprinted)

The audit evidence in the blueprint stands: no repeated archive/trash/restore grid presentation exists inside the drawer system. `TierBinList` is the single in-drawer travel surface (genuinely Tier-specific conflict flows); Command Centre's bin already renders through one shared `EntityTable` with per-entity travel presets; the Admin Station renders no archived/trashed walls. Creating `ArchiveRecordGrid`/`ArchiveRecordCard` components would introduce a second presentation system for zero deduplication. No files changed in this phase.

### Phase 4 — Service controller organisation: COMPLETE

`useServiceDrawerController` (542 lines) became a 194-line coordinator composed from `useServiceModuleEditing` (243), `useServiceLifecycle` (85), and `useServiceExitFlow` (132), with the shared machinery in the new `entity-drawers/shared/drawerChrome.ts` (126: `useAutoDismiss`, `useOutsideClickDismiss`, `useGuardedClose`, `useLifecycleRunner` — the last consumed in Phase 6). The coordinator's return shape is byte-compatible with the previous contract (`ServiceDrawerController = ReturnType<…>`), so `ServiceDrawerContent`, `ServiceDrawerFooter`, and `ServiceDrawerDialogs` are untouched.

Deviations from blueprint: none structural. Two recorded equivalences: (1) the original's `exitStateRef`-plus-effect pattern became a render-time ref assignment inside `useGuardedClose` — both deliver the latest committed state to the guard at event time; (2) the exit flow's Settle continuation is late-bound through a ref because the exit flow and lifecycle hooks reference each other (settle → lifecycle; archive/trash → guard bypass).

Validation: `tsc` pass; build pass (shared chunk 143.68 kB, +0.95 kB from the hook-module split — recorded); both snapshots byte-identical; cycle count still 4; `git diff --check` clean.

### Phase 5 — Tier controller organisation: COMPLETE

`useTierDrawerController` (409 lines) became a 203-line coordinator composed from `useTierModuleEditing` (127), `useTierBinTravel` (73), and the pure `tierDetailModel.ts` (133 — `buildTierDetail`, `buildTierFooterModel`, and the relocated `slotOccupied`, re-exported from the controller so `TierBinList`'s import path is unchanged). The rate-sheet relationship label duplication was collapsed into `entity-drawers/shared/rateSheetLabels.ts` (13 lines), adopted by both `usePackageStation.tierView` and the tier detail model. Occupant identity, the `window.confirm` guard, `beforeunload` protection, swap/retarget/pending-drafts conflicts, and the popular-tier reconciliation are all verbatim.

Deviations from blueprint: the tier lifecycle handlers (settle / enable-disable / revert, ~35 lines) stayed in the coordinator rather than getting their own file — after editing and bin travel moved out they are a small coherent block, and a fourth file would be symmetry for its own sake. Save feedback (`saveErr`/`saveOk`) stayed coordinator-owned deliberately: editing, lifecycle, and bin travel all report through the one channel, exactly as before.

Validation: `tsc` pass; build pass (shared chunk 144.29 kB); both snapshots byte-identical; tier-pricing-parity, tier-occupant-admin, manager-coordinator, active-package-read-only-provider, and package-relation-provider contracts all pass; cycle count still 4; `git diff --check` clean.

### Phase 6 — Category and Package Family organisation: COMPLETE

Both controllers adopted the shared chrome in place — `useGuardedClose` (replacing the hand-rolled bypass/continuation/dirty-ref machinery), `useAutoDismiss`, `useOutsideClickDismiss`, and `useLifecycleRunner` (which now owns `actionError`) — shrinking `useCategoryDrawerController` 297 → 262 and `usePackageFamilyDrawerController` 258 → 223 with unchanged return shapes. As blueprinted, the confirm-dialog handlers (publish/discard/trash/delete) stayed per-entity: they are short and wire entity-named station methods, and a shared abstraction would obscure them. No new per-entity files. Numeric Category identity and string `group_id` untouched.

Validation: `tsc` pass; build pass (shared chunk 143.39 kB — 0.9 kB smaller than Phase 5 from the machinery dedupe); both snapshots byte-identical; cycle count still 4; `git diff --check` clean.

### Phase 7 — station-hook cleanup: COMPLETE

`useServiceStation.ts` (537 lines) split its pure projections into the flat sibling `derive.ts` (163 lines: `resolveInclusionsStatus`, `resolveFaqsStatus`, `derivePendingModules`, `deriveCanPublish`, `derivePackageSummary`, `deriveInclusionsSummary`, `deriveFaqsSummary`), leaving the hook at 461 lines holding only fetch/state/actions plus composition. The public `ServiceStation` contract is unchanged; `derive.ts` imports `./types` and neutral drawer-kit resolvers only, so the station's cycle-safety rules hold. The station's local CLAUDE.md audit metadata and file inventory were replaced accordingly. As blueprinted from the audit: `usePackageStation` needed only the Phase 5 label-helper adoption; `useCategoryStation` and `usePackageFamilyStation` were confirmed clean and were not modified (the brief's naming of `usePackageFamilyStation.ts` as a hotspot was disproven by the audit — 162 coherent lines).

Validation: `tsc` pass; build pass; both snapshots byte-identical; cycle count still 4; `git diff --check` clean.

### Phase 8 — final consolidation audit: COMPLETE

- Exactly one definition each of `EntityDrawer`, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, `EntityActionFooter`, `CanonicalEntityFooter` — all in `drawer-kit/`.
- No entity branch in `AdminStationDrawer`, `EntityActionFooter`, or `CanonicalEntityFooter`; no identity coercion in any host adapter (grep-verified).
- The only `.tsx` in the drawer scope importing an endpoint is `CategoryDrawerHost.tsx` — the host adapter's documented record-resolution read, pre-existing and unchanged by this pass; shared presentation components call no endpoints.
- Orphan scan (`madge --orphans`): every orphan is a pre-existing `components/admin`/fixture module outside this pass's change set (several are exercised by contract scripts, which madge does not see); none of the files added or touched here is orphaned. Removing the pre-existing orphans is out of scope and deferred.
- Bundle closure of the `admin-station` entry (150 modules after the split): zero `components/admin`, zero `StepContext`, all singular renderers, all four compositions reachable; the four Command Centre adapters still mount the shared compositions.
- Cycles: exactly 4, identical to baseline.
- `dist` reconciled: stale per-phase `CategoryDrawerContent-*` chunks (Vite `emptyOutDir: false`) removed; the committed old-hash chunk deleted; both entries reference the single current chunk.
- Full suite re-run on the final tree: `tsc`, build, all five TS contracts, both snapshots (byte-identical), all six PHP contracts (incl. the 49-route baseline), `git diff --check` — all pass.
- Bundle drift vs baseline (recorded, expected module-count overhead from the split): shared chunk 142.73 → 144.00 kB, `admin.js` 170.92 → 171.85 kB, `admin-station.js` unchanged at 34.69 kB; CSS byte-identical.

### Phase 9 — documentation, build, commit: COMPLETE

Code Maps updated and link-verified: `lifecycle-system.md` (moduleNotifications directory + `derive.ts`), `drawer-system.md` (controller composition, `entity-drawers/shared/` chrome, notification directory), `entity-drawer-recovery.md` (per-entity hook composition + shared machinery), `service-station.md` (state-layer siblings). The station-local CLAUDE.md was replaced in Phase 7. `dist` rebuilt from the final tree. Work committed on `main`; nothing pushed.

## Final inventory

**Files added** (12):
`drawer-kit/utils/moduleNotifications/{shared,service,package,tier,promotion,category,packageFamily,index}.ts`,
`entity-drawers/shared/{drawerChrome,rateSheetLabels}.ts`,
`entity-drawers/service/{useServiceModuleEditing,useServiceLifecycle,useServiceExitFlow}.ts`,
`entity-drawers/tier/{useTierModuleEditing,useTierBinTravel,tierDetailModel}.ts`,
`admin-station/stations/service/derive.ts`.

**Files removed** (1): `drawer-kit/utils/moduleNotifications.ts` (content moved verbatim into the directory; `slotOccupied` moved from the Tier controller into `tierDetailModel.ts` with a stable re-export).

**Files modified** (7 source + 1 script): the four drawer controllers, `useServiceStation.ts`, `usePackageStation.ts` (label-helper adoption only), `stations/service/CLAUDE.md`, `scripts/module-state-snapshot.mjs` (entry path only). Plus dist artifacts and the four Code Maps.

**Resulting hotspot sizes** (baseline → final, lines): `useServiceDrawerController` 542 → 194 (+3 focused hooks 460), `useServiceStation` 537 → 461 (+`derive.ts` 163), `useTierDrawerController` 409 → 203 (+3 modules 333), `moduleNotifications` 467 → 8 domain files (largest 108), `useCategoryDrawerController` 297 → 262, `usePackageFamilyDrawerController` 258 → 223, `usePackageStation` 496 → 494. Line counts are reported, not the success measure — the boundaries are the point: editing machines, lifecycle advancement, exit flows, bin travel, pure derivations, and shared chrome each live in one place, and duplicated machinery has a single implementation.

## Preserved invariants (verified at Phase 8)

One drawer shell, one renderer chain, one pill/panel/editor/footer system; no entity switch in the shell; native identities uncoerced (numeric Category/Service, string `group_id`, stable `occupant_id`); presentation calls no endpoints; stations remain the sole write boundary; no new global event bus, universal schema, or duplicated lifecycle; every runtime behaviour listed in the blueprint's invariants section (tabs, pills, panels, inline editing, dirty/guarded close, publish/settle, enable/disable, archive/trash/restore/delete, tier swap/retarget/conflicts, targeted wall refresh, loading/error states, responsive drawer, Command Centre compatibility) is served by the same code paths, now organised.

## Remaining hotspots and deferred work

- `usePackageStation.ts` (494) and `moduleStatus.tsx` (349) remain the largest files; both are coherent (station pattern; SECTION-indexed policy module) and were deliberately left.
- Pre-existing orphaned modules in `components/admin` (e.g. `editors/CategoryOverviewEditor.tsx`, `LoginGate.tsx`) predate this pass and were not removed — proving them unused requires checking script/PHP references beyond this scope.
- `docs/code-map/service-station.md` remains slightly over the 600-word map cap (it was before this pass; this pass added one short sentence).
- The contract-runner situation is undocumented in the repo: three TS contracts run under `npx tsx`, two (top-level await) need `vite-node` with an alias-only config because the project vite config's preact preset fails under Node 26's CJS Vite API. Worth a follow-up decision.

## Runtime checks not performed

No WordPress browser runtime was available: drawer open/close, editing, lifecycle flows, notification pills/panels, archive/restore, tier swap/retarget, and Command Centre surfaces were **not** exercised in a browser. Behaviour preservation rests on: verbatim logic moves, unchanged controller return contracts consumed by unchanged presentation files, byte-identical module-state and mode-renderer snapshots, the five TS and six PHP contract suites, and TypeScript across the whole tree.

## Final commit

All work landed as a single commit on `main`, directly on top of baseline `7e5c670`, subject "refactor: organise the Admin Station drawer coordination layer (history 010)". Not pushed. A commit cannot embed its own hash — identify it as the sole successor of `7e5c670` (`git log --oneline -1` at close).
