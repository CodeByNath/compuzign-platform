# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d85544a4142c440c75fe3a25096bbcc759fa2aa5`
- Topic branch: `admin-ui-refinement` @ `9617c0ed` (pushed)

## Scope lock
This remains the same Admin UI work item. All previously accepted items stay accepted and must not be reopened. Preserve architecture, pricing, identity semantics, persistence, lifecycle authority, customer UI/flows. No backfill, migration-on-read, new maintenance path, or unrelated refactor.

## Live validation — accepted
Nath/browser validation confirms these pass: Promotions hidden; Maintenance at bottom; Per values removed; Family metrics use Tiers / Service Categories / Services / Inclusions; redundant internal IDs hidden where Platform ID is intended; responsive Family -> Tier selector/tabs -> occupant order in Focus/Grid; Family description/status/metrics stack correctly; focused inclusion/connection Platform-ID presentation; Tier System/Tier Group/standalone Rate Sheet duplicate-ID cleanup; Build Your Own heading **Composable Occupant**, explanatory sentence removed, spacing checked; default/add-on/BYO drawers and full responsive breakpoint matrix checked.

### Corrected identity requirement
**Focused tier -> lower deck -> inclusions list must NOT show Platform ID.** Live currently matches this requirement. Do not re-add it.

## Three live defects only
1. **Remove/hide the old Service Overview connection from individual Tier occupants** — Nath confirmed it is still visible in Default, Add-on, and Build Your Own drawers and now identifies this live presentation as the obsolete one to remove. Remove only that old Tier-occupant presentation. Do not remove Service-owned data, valid Service relationships, persistence, APIs, or other Service Station capability.
2. **Restore the Family shell bottom border** at the responsive Package Home layout. Keep the accepted responsive ordering/stacking unchanged.
3. **Replace the current Family status pill with the correct package-card status pill design, without the dot.** Reuse the established package-card pill/presentation; do not create another status system.

## Builder workflow
Start from current production `d85544a4`, update/reuse `admin-ui-refinement`, and implement only the three defects above. Inspect the current Tier drawer source first so the Service Overview removal is presentation-only and phase-bounded. Validate focused contracts/build/docs and responsive CSS. Record exact changed files, commit SHA(s), and test results here. Push only `admin-ui-refinement`, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` until Reviewer approves.

## Build results — commit `9617c0ed` on `admin-ui-refinement` (pushed, branch head from `d85544a4`)

**1. Service Overview removal** — `TierDrawerContent.tsx`'s `tierGroups` composes the individual-tier screen (shared verbatim by Default, Add-on, and Build Your Own — same component, same array); its `'connections'` group rendered `PlacedShell` over `serviceOverviewShell`/`c.serviceConnectionBinding()`. That group entry is deleted; `TierDrawerGroupId` (`tierDrawerTypes.ts`) drops `'connections'`, now `'details' | 'options' | 'support'`. The separate parent-level Tier System Connections tab (`c.overviewTab === 'connections'`, same shell/binding, a different screen) is untouched — it is the aggregate's own Service relationship, not the per-occupant one Nath flagged. Grepped for every other reference to the removed group id/tab (`tierTab`, `openTierPanel`, contract scripts) — none exist elsewhere.

**2. Family shell bottom border** — `.cz-tier-workspace__family` (the bordered `<aside>` — Family scope + summary) already carries a full `border: 1px solid` from its unconditional shared-panel rule in `admin-station.css`, and grep found no rule in either stylesheet, at either earned breakpoint (≤1100px, ≤767px), that strips or zeroes it; the compiled `dist/css/admin-station.css` matched source exactly, so this wasn't a stale-build issue either. Unable to find a static-CSS cause for a missing edge. Applied a defensive, targeted fix: `admin-station-responsive.css` now restates `border-bottom: 1px solid var(--station-border)` on `.cz-tier-workspace__family` explicitly inside both breakpoints, alongside its existing `order`/`grid-column` rules — no ordering/stacking property touched. **Flagging this one for extra scrutiny in live validation** — if the border is still missing after this, the cause is something this session's static read didn't surface (may need a live DOM/computed-style inspection rather than another source-only pass).

**3. Family status pill** — `PackageFamilySummary.tsx` called `<StationStatusPill status={summary.status} />` with no `pillVariant`, defaulting to `'station'` (the dotted presentation). `CategoryGroupCard.tsx` and `ServiceConnectionsLane.tsx` are the two existing callers using `pillVariant="module"` (`ModuleStatusPill`'s no-dot reading) — confirmed as "the established package-card pill." Family summary now passes `pillVariant="module"` to match; no second status system added.

**Validation run:** `npx tsc --noEmit` clean; `npm run build` succeeded (dist rebuilt, committed); `npm run docs:check` passed (119 Markdown files, 48 Code Maps, 22 history records); full Package/Tier Station contract suite passed (`contract:package-family-capability`, `package-tier-workspace`, `package-tier-workspace-shell`, `tier-connections`, `tier-settings`, `tier-system-drawer`, `drawer-module-entry`, `tier-instance-scope`, `tier-instance-tool`, `tier-overview-is-addon`, `tier-catalogue-overview-presentation`, `composable-tier-admin-ux`, `tier-edition-admin`, `tier-edition-switch`, `tier-edition-move-to-bin`, `tier-customer-policy-draft`, `tier-inclusions-customer-policy-merge`, `tier-catalogue-declaration-scope`, `tier-lifecycle-menu`, `supported-action-footer`); `regression:entity-action-footer-menu-only` passed. `contract:admin-station-css` retains the same six pre-existing unrelated baseline failures (`cz-rate-sheet-tool__*` classes), no new regression. `regression:tier-occupant-lifecycle`, `tier-edition-lifecycle`, and `tier-publish-timeout` throw a pre-existing `TypeError` (`d.audienceGroups.length` on undefined) that reproduces identically on unmodified `d85544a4` (verified via `git stash`) — not caused by this change, out of this ticket's scope.

**Changed files:** `resources/ts/admin-station/styles/admin-station-responsive.css`, `resources/ts/package-station/drawer/tier/TierDrawerContent.tsx`, `resources/ts/package-station/drawer/tier/tierDrawerTypes.ts`, `resources/ts/package-station/presentation/package-tier-workspace/PackageFamilySummary.tsx`, plus rebuilt `dist/css/admin-station.css` and `dist/js/admin-station.js`.
