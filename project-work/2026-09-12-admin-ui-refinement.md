# Admin UI Refinement

## Status
- **READY FOR BUILDER**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `9617c0edf4fc50d5971bf47e6ae0431aacd4153c`
- Topic branch: `admin-ui-refinement`

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
