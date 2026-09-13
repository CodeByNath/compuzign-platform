# Admin UI Refinement

## Status
- **READY FOR BUILDER**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d85544a4142c440c75fe3a25096bbcc759fa2aa5`
- Topic branch: `admin-ui-refinement`

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
