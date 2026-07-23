# Package Tier Workspace Product Repair

## Date

2026-07-23

## Scope

A product-completeness repair of the Tier Workspace lower deck and its registered drawers delivered in 011: the Rate Sheet setup lifecycle, the Rate Sheet row drawer's presentation architecture, the workspace's first-use and empty states, lower-deck placement, Details/Connections responsibilities, and Settings naming and gating. The upper Focus/Grid engine, the Admin Station shell, the Package Station command layer, and every endpoint were preserved unchanged; no persistence authority moved.

## Goal

Browser use showed 011 was structurally connected but not product-complete: Rate Sheet setup looked like a title-only write and could apparently be run twice; the row drawer's View mode was read-only form inputs rather than an entity composition; the starting state silently selected data while creation was unreachable at zero Families; Connections nearly duplicated Details; and Settings named one entity three ways. The goal was to make each surface honest and complete without rebuilding anything 011 got right.

## What Changed

**Rate Sheet setup lifecycle.** The audit established the command was already domain-correct: `initialiseRateSheet` submits a titled empty sheet, and the manager commit (`PackageManagerSchema::commitConfiguration`) materialises a row per live relationship item ($0.00, "Per item", ×1). The drawer was dishonest about it. `RateSheetSetupContent` is now stage-driven by the pure `entity-drawers/rate-sheet/rateSheetSetupModel.ts`: the form previews the eligible live rows setup will connect (count, distinct supplying Services, capped list); success is an explicit in-drawer state showing the configured result with a Done close — never a silent auto-close; a configured sheet renders a passive already-configured state with no form. `RateSheetSetupDrawerHost` supplies the sheet summary and eligible rows from its own fresh station read.

**Duplicate-attempt protection and refresh.** The observed "run it twice" was stale wall visibility plus instant close, never duplicate persistence — the command loads fresh manager state per run and refuses with `already-configured`. Protection is layered: the wall's `+ Rate Sheet` action disappears after its `onSaved` refetch, and a click inside the stale window opens the drawer's passive state. `onMutationComplete` fires on success before close, so the originating wall refreshes through the existing bridge — no timers, no optimistic UI.

**Row drawer composition.** `RateSheetRowDrawerContent` became a real `EntityDrawer` composition over the new `RATE_SHEET_ROW_ENTITY` manifest (`entity-drawers/schema/entities/rateSheetRow.ts` + `bindings/rateSheetRow.tsx`): Overview places Row Overview + Commercial Terms read modules; Connections places Source & Provenance + Connection Status (including which Tiers select the row). Only Commercial Terms edits — `editors/RateSheetRowEditor.tsx` inside `InlineEditorShell`, exactly unit price / per / quantity / group. Identity appears once as a restrained "Identity references" field. Status and notes come from three new rate-sheet-row `ModuleDefinition`s in `drawer-kit/utils/moduleNotifications/package.ts`; both snapshot suites stayed byte-identical. The host derives Tier usage from the stable station read so the row model stays identity-stable across incidental re-renders and the draft never resets mid-edit.

**Starting and empty states.** Auto-selection of the first Family and Tier stays (the documented engine convention), now restated by the deck's labelled "Focused scope" line. Zero Families renders one first-use panel whose single action is the registered Package Family creation — previously unreachable because the deck was hidden. Details states are pure and state-aware (`resolveTierDetailsEmptyState`): no-Tier with/without sheet, no sheet, and no selections each explain what exists and the next valid action.

**Details vs Connections.** Details remains the focused Tier's compact operational inclusion list (row View/Edit). Connections became the coverage view: sheet summary, providers, groups, then only the rows that explain coverage — unresolved ("Needs attention") and rows the focused Tier does not select — View-only, via the pure `partitionConnectionsRows`. Tier-selected rows are counted, never re-listed.

**Settings.** The pure `projectWorkspaceSettings` gates and names the actions: Package Family (exact name everywhere — the "Family Group" aliases were removed; kept in Settings per 011's approved placement and described honestly as station-wide), Rate Sheet setup only while unconfigured, Rate Sheet Group only once the sheet exists, plus an always-present sheet status line. The shared create form button reads "Create Package Family".

## Final Architecture

Unchanged from 011's chain — authoritative hook → pure projection → registered kit → native identity intent → registered thin adapter → host-neutral composition → station command → manager endpoint → `onSaved` wall refresh — with the pure decision layer widened: `rateSheetProjection.ts` additionally owns `partitionConnectionsRows`, `resolveTierDetailsEmptyState`, and `projectWorkspaceSettings`; `rateSheetSetupModel.ts` owns the setup stages and eligibility preview.

## Decisions and Invariants

- Row materialisation is the backend commit's single authority; the client never restates it — the setup drawer previews and reports it.
- A creation surface whose success changes visible state must show that result; setup's success stage is the template — no silent auto-close.
- A configured singleton renders passive states, never a second create form.
- View mode is composed read modules; readOnly/disabled inputs are contract-banned in the row composition, and the editor may touch only the four command-patchable fields.
- One entity, one name: "Package Family" exactly (contract-scanned).
- Connections never re-lists Tier-selected rows; Details owns operating on them.

## Validation

`npx tsc --noEmit`, `npm run build`, and `npm run docs:check` clean. Extended contracts pass: package-tier-workspace (partition, empty-state, and Settings gating/naming assertions) and rate-sheet-row-drawer (EntityDrawer composition, editor field allowlist, setup stages, naming scan, wider forbidden-import list); rate-sheet-row command, tier-occupant-admin, manager-coordinator, service-catalogue-projection, and TS tier-pricing-parity pass; mode-renderer (22) and module-state (37) snapshots byte-identical; all six PHP tests pass; `git diff --check` clean. `active-package-read-only-provider` and `package-relation-provider` still fail at transform time under `npx tsx` (top-level-await CJS limitation) — the pre-existing runner issue recorded in 010/011; both scripts are untouched here. No WordPress browser runtime was available: the browser checklist (setup flow, repeated attempt, wall refresh, row drawer modes, dirty close, filters, coverage sections, Settings visibility, first-use, narrow layouts, hard-refresh persistence) remains outstanding. At this record's creation the repair exists as an uncommitted working tree (4 new source files, ~16 modified source/contract files, 5 Code Maps, rebuilt dist); nothing committed or pushed.

## Deferred Work

- The outstanding browser checklist above, once a WordPress runtime is available.
- A decision on the documented tsx/vite-node contract-runner split (carried from 010).

## Related History

[011 — Package Tier Workspace Lower Deck and Rate Sheet Row Drawer](011-package-tier-workspace-lower-deck.md) (the milestone this repairs); [010 — Admin Station Drawer Organisation Pass](010-admin-station-drawer-organisation.md) (the shared drawer chrome and the contract-runner note).
