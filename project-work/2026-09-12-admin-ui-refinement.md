# Admin UI Refinement

## Status
- **READY FOR BUILDER**
- Builder: Claude Code
- Reviewer: ChatGPT independent auditor
- Auditor verdict: **Proceed with safeguards**
- Production `main`: `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`
- Working branch: `admin-ui-refinement`

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

## Acceptance boundary
Admin presentation/refinement only unless a separately evidenced defect requires more. No customer UI changes, persistence migrations, identity changes, pricing/resolver changes or capability removal. Final acceptance requires Reviewer inspection of the complete branch diff plus final live Admin validation before production approval.