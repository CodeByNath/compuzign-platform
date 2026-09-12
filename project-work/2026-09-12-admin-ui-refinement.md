# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`
- Topic branch: `admin-ui-refinement`, currently through `d85544a4`
- **No merge/push to `main` until final Reviewer approval.**

## Scope
One Admin UI work item. Preserve architecture, pricing, identity semantics, persistence, lifecycle authority, customer UI and customer flows. No backfill, migration-on-read, or new maintenance mechanism.

## Completed candidate
Current topic branch is 9 clean commits ahead of `main`, with merge base exactly current production. Implemented:
- Promotions hidden from navigation only; Maintenance diagnostics moved to bottom; **Per values** removed from Rate Sheet overview and the directly affected contract updated.
- Family connection metrics use **Tiers / Service Categories / Services / Inclusions**; redundant internal-ID captions hidden while underlying IDs remain.
- Responsive Package Home order is Family -> Tier selector/tabs -> Tier occupant using existing 1100/767 breakpoints.
- Focused inclusion and connection details now present Platform IDs; Tier System internal ID hidden; Build Your Own heading/spacing corrected.
- Inclusion-list Platform ID now comes through the existing Package read/projection path; no minting/backfill/write-on-read was added.

## Service Overview decision
Reviewer independently checked the evidence. The retired Command Centre was already removed by `34c8175b` on 2026-07-23. The currently inspected Tier drawer Service connection is live parent-Service presentation, not proven retired. **Do not remove it.** This requirement is satisfied as an investigation/no-delete outcome unless Nath identifies a different concrete component.

## One final required safeguard
Correction B currently renames a Bundle-child response key inside `PackageManagerSchema::projectTierRateSheetWith()` from existing `cz_platform_id` to `platform_id`.

Do not make an unnecessary compatibility-breaking rename for this presentation task. Preserve the existing `cz_platform_id` key and, if `TierLowerDeck` needs the normalized form, add/project `platform_id` alongside it (or otherwise consume it without removing the old key). The list must still display the existing Platform ID. No persistence or identity changes.

Then rebuild generated output and run final validation: `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, relevant focused contracts/PHP projection tests, and `contract:admin-station-css` baseline comparison.

Commit this safeguard on `admin-ui-refinement`, push only that topic branch, record the exact SHA/results here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main`.

## Final safeguard — resolved

Commit `d85544a4`, pushed. `PackageManagerSchema::projectTierRateSheetWith()`'s Bundle-child `includes[]` entry now carries BOTH keys: `cz_platform_id` preserved exactly as it was (no rename, no removal), and `platform_id` added alongside it for `TierLowerDeck` to read. `TierResolvedRateSheetSelection`/`DeckSelection`'s `includes[]` TS type documents both keys. No persistence or identity change — `platform_id` is a read-only projection of the same value `cz_platform_id` already carried.

**Validation:** `npx tsc --noEmit` clean; `npm run build` succeeds (no dist diff — this commit is PHP + type-comment only, no runtime/bundle change); `npm run docs:check` passes; PHP tests `rate-sheet-bundle` (96 checks), `tier-rate-sheet-price-option`, `commercial-leg-resolution`, `commercial-leg-timeline`, `composable-edition-catalogue-projection`, `tier-edition-price-projection`, `legacy-contact-override-repair`, `tier-pricing-parity` all pass; `contract:package-tier-workspace`, `contract:tier-rate-sheet-catalogue-bundle`, `contract:tier-occupant-inclusions-bundle`, `contract:tier-connections`, `contract:rate-sheet-tool` all pass; `contract:admin-station-css` reports the same 6 pre-existing baseline failures (unrelated `cz-rate-sheet-tool__*` classes), unchanged from before this branch's work began.

Topic branch is now 10 clean commits ahead of `main` (`d8f3bba5..d85544a4`), merge base exactly current production. All three reviewer corrections and the one final safeguard are resolved or recorded as open-for-decision (Service Overview). Ready for final review/approval.
