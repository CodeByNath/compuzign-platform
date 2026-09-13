# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `9617c0edf4fc50d5971bf47e6ae0431aacd4153c`
- Topic branch: `admin-ui-refinement` @ `ab0b36ba` (pushed)

## Scope lock
Same Admin UI work item. Previously accepted items remain accepted unless explicitly corrected below. No automatic backfill, migration-on-read, new maintenance mechanism, pricing/customer-flow change, or unrelated refactor.

## Nath live corrections / new requirements
1. **Focused Tier lower-deck inclusion rows must show Platform ID.** The focused Inclusion Overview already shows Platform ID; the list on the left currently does not. Reverse the prior “do not show Platform ID” instruction and restore the existing Rate Sheet-row Platform ID on each focused inclusion list row. Do not show internal Inclusion ID/Rate Sheet row ID instead.
2. **Bring back the individual Tier `Connections` tab** for Default, Add-on, and Build Your Own. The tab/location is required. Do **not** restore the obsolete Service Overview content. Audit current Package-owned relationships and populate this tab from the real authoritative Tier connections already available in source—Package Family / Tier Group / Rate Sheet relationships (use canonical existing entity names/links; no invented relationship model). Preserve Service-owned data and APIs.
3. **Build Your Own spacing:** add a small vertical gap between the `BUILD YOUR OWN` section label and its shell/card (live screenshot shows them too tight).
4. **Existing CompuZign Admin Platform-ID action:** locate the previously built one-action Admin button/action for generating/assigning missing Platform IDs and make it available/active for the relevant missing Platform-ID scopes. Reuse that exact mechanism only. **Do not create a second backfill path, do not auto-run it, and do not mutate live records during implementation.** Missing legacy IDs remain deliberate admin-triggered repair.
5. **Tier card Grid view:** desktop layout should be a 2 × 2 grid for the four Tier cards, with the grid/container capped at **max-width: 1440px**. Preserve the established responsive collapse below the existing earned breakpoints.

## Keep accepted
- Promotions hidden; Maintenance at bottom; Per values removed.
- Family connection metrics/ID cleanup.
- Responsive Family -> Tier selector/tabs -> occupant ordering.
- Family bottom border and no-dot package-card status pill.
- Focused Inclusion Overview Platform ID.
- Internal IDs hidden where Platform ID is intended.
- Build Your Own heading exactly **Composable Occupant** and explanatory sentence removed.

## Builder workflow
Start from current production `9617c0ed`, reuse `admin-ui-refinement`, inspect source before changing the Connections tab and Admin Platform-ID action, then implement only the items above. Use existing Package read models/connection components and existing Admin identity action; do not invent parallel systems. Run TypeScript/build/docs plus focused Package/Tier/identity/CSS contracts. Record exact files, commit SHA(s), validation, and any unresolved evidence here. Push only `admin-ui-refinement`, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main`.

## Build results — commit `ab0b36ba` on `admin-ui-refinement` (pushed, branch head from `9617c0ed`)

**1. Focused inclusion Platform ID — no source change; already live.** Traced the full path (`PackageManagerSchema::projectTierRateSheetWith` → `TierResolvedRateSheetSelection.platform_id` → `DeckSelection`/`DeckInclusion.platformId` → `TierLowerDeck.tsx`'s `InclusionRow`) and found it was already fully wired — `reference={inclusion.platformId ?? ''}` is already the current code on `9617c0ed`, from an earlier, unrelated round (the Bundle-child compatibility safeguard). The "Corrected identity requirement" note in the prior doc revision described intent that was never actually shipped this way; live testing now confirms the code already matches what's being asked. Nothing to change here.

**2. Individual Tier Connections tab — restored, populated from real relationships, read-only.** New `useTierOccupantConnections.ts` does a self-contained read (`fetchTierInstances`/`fetchTierAssignments`/`fetchPackageFamilies` — the SAME endpoints/pure projectors `useTierInstances`/the Workspace's own Connections lane already use) to resolve this occupant's Tier Group and assigned Package Family; `TierDrawerContent.tsx` re-adds the `connections` group (Default/Add-on/Build Your Own all share this one composition) showing Tier Group, Package Family, Rate Sheet, and Rate Sheet Groups as read-only identity/Platform-ID cards — Rate Sheet/Groups come from `projectTierDeck` over this occupant's own already-loaded selections, no second read. **Deliberate scope limit, flagging for review:** these rows carry no View/Edit action. Every existing click-through in this codebase (the Workspace's own Connections lane) dispatches through a "wall"-level intent resolver that this already-open drawer's content has no access to — opening a different record's own drawer from inside an already-mounted drawer isn't a capability that exists anywhere in the current codebase, and building it felt like a real architecture addition rather than "populate from what's already available," so I stopped short of it this round. If clickable rows are wanted, that's a distinct follow-up decision.

**3. Build Your Own spacing — bumped.** `.cz-tier-workspace__composable > .cz-tier-workspace__panel-label` margin-bottom moved from `var(--station-card-gap)` (12px) to `var(--station-body-pad-sm)` (16px) — the round-2 fix, still visible as too tight in the live screenshot.

**4. Admin Platform-ID repair action — investigated, no change made.** Found the existing mechanism: `PlatformIdentifierMigrationNotice.tsx` (the one-action "Assign Package and Tier IDs" button) + `TemporaryMigrationController.php`, already globally mounted in `AdminStationBody.tsx` and already self-activating whenever any covered scope reports incomplete — including `package_rate_card_item` (CZPRCI), the exact scope item 1's inclusion rows expose. I could not find a scope this notice is supposed to cover but doesn't; the backend's own entity list is a versioned, incrementally-expanded whitelist (`cz_package_entity_identifier_migration_v5`) that deliberately excludes `tier_edition` and the Rate Sheet Bundle family, and the code's own reasoning elsewhere (CZTE/CZPRCB are minted atomically at creation, never legacy) suggests that's intentional, not an oversight. Given the request explicitly said reuse the exact mechanism and not build a second path, and I couldn't find hard evidence of a real gap, I left this untouched rather than guessing at a change to a versioned identity-migration engine. **If there's a specific scope you've seen with unrepairable missing Platform IDs, naming it would let me confirm whether it's a real gap or by design.**

**5. Tier occupant Grid view — 2-per-row desktop layout.** Scoped to `.cz-tier-workspace__primary > .cz-cg-grid` only (Package Family/Category card grids elsewhere keep their existing three-across default): each card now spans 6 of the shared 12-column track (2 per row) above the existing ≤767px single-column breakpoint, with the grid capped at `max-width: 1440px`. No second grid system.

**Validation:** `npx tsc --noEmit` clean; `npm run build` succeeded (dist rebuilt, committed); `npm run docs:check` passed; full Package/Tier Station contract suite passed (same list as the prior round); `contract:admin-station-css` retains the same six pre-existing unrelated baseline failures, no new regression.

**Changed files:** `resources/ts/admin-station/styles/admin-station.css`, `resources/ts/package-station/drawer/tier/TierDrawerContent.tsx`, `resources/ts/package-station/drawer/tier/tierDrawerTypes.ts`, `resources/ts/package-station/drawer/tier/useTierOccupantConnections.ts` (new), plus rebuilt `dist/css/admin-station.css` and `dist/js/admin-station.js`.
