# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: Claude Code
- Reviewer: ChatGPT independent auditor
- Auditor verdict: **Proceed with safeguards**
- Production `main`: `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`
- Working branch: `admin-ui-refinement` (pushed through `7785885b`)

## Scope and workflow
This remains one Admin UI work item. Preserve platform architecture, persistence, pricing, identity, lifecycle authority, customer flows and customer-facing presentation.

Phase 1 visual foundation is already on `main` at `d8f3bba...` and deployed. Its outstanding live-responsive validation is deferred into the final work-item validation rather than blocking the remaining annotation work.

Claude must first turn the requirements below into a concise phased to-do list in this file, then execute the phases sequentially. Each completed phase gets its own commit on `admin-ui-refinement`. **Do not push/merge any of these new commits to `main`.** Keep the whole candidate on the topic branch. After all phases are committed and builder validation passes, update this file with phase commits/tests and set `AWAITING REVIEWER REVIEW`, then stop. Reviewer audits the complete branch before any final production push is approved.

## Studio annotation to-do

### Navigation / overview
- Temporarily hide **Promotions** navigation only; preserve underlying capability/data/routes.
- Move **Maintenance — Read-only diagnostics** to the bottom of settings.
- Hide **Per values** from overview presentation only.

### Package-family connections
- All three family connection drawers must show exactly: **Tiers / Service Categories / Services / Inclusions**, replacing Services / Rate Sheet rows / Tier selections.
- Hide long internal IDs in family, group and tier-group connection tables where Platform ID is already shown. Preserve internal IDs in data.

### Responsive Package Home
- Responsive order, including grid view: family selector/shell -> tier tabs/selector -> tier-occupant shell.
- In family shell two-column responsive state, put description/status/metrics beneath selector on left and remove metrics top border.
- Determine breakpoint from where current layout first breaks; do not invent an arbitrary breakpoint.

### Tier occupants / retired connection
- Remove old **Service Overview** presentation from Default tiers, Add-ons and Build Your Own.
- First prove it belongs to the retired service-related tier system; remove only associated dead presentation code, not valid stored relationships/data.

### Platform-ID presentation rule
- Focused tier-inclusion details: show Platform ID; hide Inclusion ID and Rate Sheet row ID.
- Inclusion connection details: show Platform ID for applicable linked records.
- Inclusion list rows: show Platform ID; hide internal ID under inclusion name.
- Hide Tier System ID from tier-system overview.
- Hide small internal IDs from family/tier-group list presentations where Platform IDs already appear.
- Remove duplicate Platform ID beneath Rate Sheet name when the same ID has its own column.
- General rule: Platform IDs visible for humans; internal IDs retained invisibly for system use.

### Build Your Own
- Add spacing between **Build Your Own** tier and its section heading.
- Heading must be exactly **Composable Occupant**; remove the subordinate/not-one-of-5 explanatory suffix.

## Phased to-do (Claude build plan)
Grounded against current `admin-ui-refinement` code (base `d8f3bba5`). One commit per phase on `admin-ui-refinement`; no pushes to `main`.

1. **Nav/overview** — `admin-station/register.ts`: set `showInHeader:false, showInMenu:false` on the `promotions` nav row (destination/capability untouched). `TierSystemSettings.tsx`: move `maintenanceGroup` to the end of `allGroups`. `RateSheetTool.tsx` (`FocusedRateSheetRead`): drop the "Per values" field block + its now-unused memo.
2. **Package-family connection vocabulary + ID hiding** — Only one structured connection shell exists for Family (`drawer/schema/bindings/packageFamily.tsx`'s `packageFamilyRelationshipsShell`, "Services / Rate Sheet rows / Tier selections"), echoed in 2-3 prose strings (`usePackageFamilyDrawerController.ts`, `PackageFamilyDrawerDialogs.tsx`, `moduleNotifications/packageFamily.ts`) — not three separate drawers as literally worded. Will replace this vocabulary everywhere it renders for Package Family with Tiers / Service Categories / Services / Inclusions, wiring in the existing `TierGroupComposition` (`familySummary.ts`'s `buildFamilyCompositionMetrics`, already used by `PackageFamilySummary`) rather than inventing a new data shape. Separately, stop rendering the internal-id caption (`TierDeckRowIdentity`'s `reference`) wherever a Platform ID column (`PlatformIdField`) already appears in the same row, for family/tier-group/rate-sheet connection rows (`TierConnectionRow.tsx`, `connectionNavigation.ts` projections) — data fields stay, only the redundant visible caption goes.
3. **Responsive Package Home** — `admin-station-responsive.css`: at the existing `max-width: 1100px` breakpoint (already the component's own earned breakpoint — 240+500+260px column minimums), reorder so `.cz-tier-workspace__family` stacks above tabs/detail, and move the two-column family-shell's description/status/metrics block under the selector in column 1 instead of beside it in column 2, clearing `.cz-tier-workspace__family-metrics`'s `border-top` in that state. Repeat the Family-first order at the `767px` single-column breakpoint. No new breakpoint introduced.
4. **Tier occupants "Service Overview"** — **Findings contradict the premise.** The Connections-tab "service" module in `drawer/tier/TierDrawerContent.tsx` is shared as-is by Default, Add-on, and Build-Your-Own occupants; it reads the live parent Service via `serviceConnectionBinding`, is documented in `package-station/CLAUDE.md` as part of the current locked Details/Options/Connections/Support model, and is covered by an active `npm run contract:tier-connections` check. No doc or data path shows it tied to a retired system. Per the doc's own instruction ("first prove it belongs to the retired system; remove only dead code"), **no removal will be made in this phase** — flagging back to Reviewer/Nath for either a more specific pointer to the intended dead component, or to drop this to-do item.
5. **Platform-ID presentation** — six sites, all presentation-only (existing `platform_id` fields threaded into display where not already bound, never new identity data): (a) `tierInclusion.tsx` focused overview — drop "Inclusion ID"/"Rate Sheet row ID", add Platform ID (thread `row.platform_id` through `tierInclusionRecord.ts`); (b) same file's connection shells — relabel identity to Platform ID, bind `source_service_platform_id` / `rateSheet.platform_id`; (c) `TierLowerDeck.tsx` inclusion rows — switch caption from `sourceId`/`itemId` to a new `platformId` on `DeckInclusion`/`deck.ts` projection; (d) `TierSystemSettings.tsx` — delete the "Tier system ID" content entry, keep the existing Platform ID entry; (e) `TierConnectionRow.tsx` family/tier-group list rows — suppress the internal-id caption where `PlatformIdField` already renders (shares phase-2's fix point, kind-scoped); (f) `connectionNavigation.ts`'s `projectRateSheetPoolRows` — stop repeating Platform ID as the name-adjacent caption (`reference`), keep the dedicated Platform ID column.
6. **Build Your Own heading** — `PackageTierWorkspace.tsx` line ~394: change heading text to exactly `Composable Occupant` (current: "Composable occupant — subordinate to this Tier system, not one of the 5 Tiers"). Add spacing via a scoped CSS rule (`.cz-tier-workspace__composable .cz-tier-workspace__panel-label`) since the wrapper currently has no margin/gap rule at all — scoped to avoid affecting the label's other reuse sites (`TierComposableMiddleShell.tsx`, `TierNavigation.tsx`).

## Build results

Six commits on `admin-ui-refinement` (base `d8f3bba5`), pushed to origin:

1. `c80ddbe8` — Nav/overview: Promotions nav hidden (`showInHeader`/`showInMenu: false`, destination/capability untouched); Maintenance moved to the end of `allGroups`.
2. `5fa28a0f` — Family connection shell relabeled to Tiers/Service Categories/Services/Inclusions via the existing `buildFamilyCompositionMetrics`/`PackageFamilyItem.composition` (zero new fetch); redundant internal-id caption hidden (CSS-only) on every `TierConnectionRow` kind (family/tier-group/group/rate-sheet) — this one fix also satisfies to-do items 5e and 5f below.
3. `b5560e48` — Responsive Package Home: Family now leads Tier Tabs/the focused Tier (both the ≤1100px and ≤767px breakpoints, via `order: -1`, no new breakpoint), including Grid view and the empty/no-system states. Family shell's two-column state collapsed back to its base single-column stack (description/status/metrics beneath the selector), and the metrics block's inner top border cleared in that state.
4. `3e640363` — Platform-ID presentation: inclusion overview (Platform ID replaces Inclusion ID/Rate Sheet row ID), inclusion connection shells (Platform ID replaces Service ID/Rate Sheet ID), Tier System overview (Tier system ID row removed).
5. `00ba13b3` — Build Your Own: heading is now exactly "Composable Occupant"; scoped spacing added above the tier shell.
6. `7785885b` — `npm run build` output for all of the above.

**Validation performed:** `npx tsc --noEmit` (clean after every phase), `npm run build` (succeeds), `npm run docs:check` (passes, no doc/path changes needed), and the specific contracts each touched area owns — `contract:tier-settings`, `contract:package-family-capability`, `contract:package-tier-workspace`, `contract:package-tier-workspace-shell`, `contract:drawer-module-entry`, `contract:tier-system-drawer`, `contract:tier-instance-tool`, `contract:tier-connections`, `contract:tier-catalogue-overview-presentation`, `contract:tier-rate-sheet-catalogue-bundle`, `contract:tier-occupant-inclusions-bundle`, `contract:composable-tier-admin-ux` — all pass. `contract:admin-station-css` reports the same 6 failures (all `cz-rate-sheet-tool__import-*`/`group-create` classes) that already exist on `main`/pre-change `admin-ui-refinement` — confirmed via `git stash`, unrelated to this work, not touched.

### Three items NOT done — need Reviewer/Nath decision

- **"Hide Per values"** (to-do item under Navigation/overview) — `scripts/rate-sheet-tool-contract.ts:339` locks `focusedRead.includes('Per values')` as part of the Rate Sheet focused overview's required field set. Removing the field would require rewriting that locked assertion, which is out of bounds. Left unchanged.
- **"Remove old Service Overview presentation"** (Tier occupants / retired connection) — investigated first, per the to-do's own instruction to prove retirement before removing anything. The Connections-tab "service" module (`drawer/tier/TierDrawerContent.tsx`) shared by Default/Add-on/Build-Your-Own reads the LIVE parent Service, is documented as part of the current locked Details/Options/Connections/Support model, and is covered by an active `contract:tier-connections` check — nothing found ties it to a retired system. No removal made; needs either a more specific pointer to the actually-intended dead component, or this to-do item dropped.
- **"Inclusion list rows: show Platform ID"** (Platform-ID presentation, item 5c) — `TierLowerDeck.tsx`'s inclusion rows still show the internal `sourceId`/`itemId`, not Platform ID. `surface/packageTierWorkspace/deck.ts`'s own header comment locks its projection to inventing zero fields beyond category; every other field is carried through `rate_sheet_selections` untouched, and the backend projection that builds it (`PackageStationSchema::evaluateTierPricing()`) never emits the row's `platform_id` today. Surfacing it here needs a backend field addition — beyond this pass's frontend-presentation scope, so flagged back rather than decided unilaterally.

## Acceptance boundary
Admin presentation/refinement only unless a separately evidenced defect requires more. No customer UI changes, persistence migrations, identity changes, pricing/resolver changes or capability removal. Final acceptance requires Reviewer inspection of the complete branch diff plus final live Admin validation before production approval.