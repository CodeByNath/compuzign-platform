# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main` = `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6` (unchanged).
- Review head: `48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8` on new branch `review/package-bundle-settings-pool-and-tier-card-count` (branched from `main@2b62f20f`, 1 commit ahead).
- Source push: **NOT APPROVED**
- Auditor verdict carried over: **Proceed with safeguards — two live count projections remain wrong**.

## Locked behavior
A Bundle is one commercial Rate Sheet selection/pricing row. Admin read/display expands its resolved `includes[]` into real Inclusion rows; the Bundle shell is never itself an Inclusion. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. Direct selections retain their price/actions and win dedupe provenance regardless of order. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

## Live validation — 2026-08-30
Read-only production check after full reload, reopening Packages, and reselecting OMNIA.

**Passing on `2b62f20f…`**
- OMNIA summary: Categories 3 / Services 3 / Inclusions 3.
- Details renders the three real Bundle-supplied inclusions, not `Foundation Bundle`.
- All three Bundle-only Price values render exact text **Included in bundle**.
- Bundle-only rows have no false actions.
- Connections > Family Group > OMNIA now reports **Services 3**.
- Connections > Foundation reports Inclusions 3.
- KAIROS/APTOS remain unchanged.

**Still failing**
1. **Settings > Family Groups > OMNIA** (`pcg_f72dc62213047feb`, `CZPGHG2ZV`) still reports **Services 0**. This is independently wrong even though the same entity in Connections and the OMNIA summary both report 3.
2. The **Package Omnia Basic Tier tab and focused detail metric** both still report **1 included feature**. That count is the commercial Bundle selection shell, but the admin label says Included features and the accepted display projection resolves **3 real inclusions**. Both surfaces must report **3** for current data.

## Next Claude instruction
### Settings Family Group card
Make the Settings Family Groups list consume the same canonical `familyComposition`/resolved Service count already producing OMNIA Services 3 in the summary and Connections card. Do not leave Settings on a separate raw/dependents count path. Reuse shared projection logic; dedupe stable Service identity; do not hard-code 3. Genuine empty groups remain 0.

### Tier included-features count
For the Package Tier selector card and focused Tier detail metric, count the same deduped real Inclusion display projection used by Details—not raw commercial selection rows and not the Bundle shell. One Bundle resolving three unique children must display **3 included features** in both locations. Direct+Bundle and Bundle+Bundle overlaps must remain deduped by authoritative `(rate_sheet_id, item_id)`; direct-only and genuine empty Tier behavior must remain correct. This is display/count semantics only: do not change Bundle pricing or persistence.

## Non-change boundary and acceptance
Do not alter pricing/totals, Bundle authoring, persistence/schema, row actions, wording, layout, Connections (now correct), family summary (correct), KAIROS/APTOS data, or unrelated stations.

Add regressions for:
- Settings and Connections showing the same canonical Family Group Service count;
- Tier tab/detail count matching the deduped Details inclusion rows for Bundle-only and overlap cases;
- genuine empty counts remaining 0.

Report root cause, changed files, tests, review SHA, and deployment state here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.

## Claude Report — round 5 — 2026-08-30

**Root cause 1 — Settings still Services 0.** Round 4's fix only touched
the `'focused'` filter's row (`connectedFamilyRow`, which does correctly
receive `familyComposition`). But Family Groups **defaults to the `'all'`
filter**, and its own, separate pool-building call —
`ordered.flatMap((candidate) => projectFamilyConnectionRows(candidate))`
— still passed no composition at all, for every filter value. This was a
genuinely separate bug from round 4's, not the same one resurfacing.

**Fix 1.** The pool projection now passes the focused Family's own loaded
`familyComposition` to its matching row only:
`projectFamilyConnectionRows(candidate, candidate.id === family?.id ?
familyComposition : null)`. Every other pool row has no composition
available to reuse (the workspace only ever loads one Tier Group's
composition at a time) and correctly falls back to `dependents.services`,
exactly as before — no new fetch, no batch composition load.

**Root cause 2 — Tier card/detail "1 included feature".**
`toTierOccupantCard()`'s "Included features" metric read
`detail.inclusions_override.length` — the occupant's own raw commercial
selection list, where a Bundle-backed selection is deliberately ONE row
(that field also feeds the Features editor module and the Publish
completeness check — confirmed via `tier-occupant-inclusions-bundle-
contract.ts`, which locks that behavior; left completely untouched).

**Fix 2.** The card metric now reuses `projectTierInclusions()` — the
exact same deduped real-inclusion projection Details already
renders — over `detail.rate_sheet_selections`, so the card, the focused
Tier detail panel (which renders this same card item, per
`TierDetailPanel.tsx`'s own doc comment), and Details can never disagree
again. `TierResolvedRateSheetSelection` already structurally satisfies
`DeckSelection`, so no data reshaping was needed.

**Regression coverage.**
- `tier-settings-contract.ts`: new source-text check proving the `'all'`
  pool's own call site passes composition for the matching candidate —
  the exact path that stayed on Services 0 after round 4's fix.
- `tier-occupant-card-drawer-unification-contract.ts`: three new cases —
  a Bundle-only Tier reports 3 (not 1, not hardcoded), an ordinary
  direct-selections-only Tier still reports its real count (proving the
  non-Bundle case is unaffected), and an empty Tier reports a genuine 0.
- Ran the full existing suite including every other consumer of
  `toTierOccupantCard()` (`tier-edition-admin`, `tier-edition-switch`,
  `tier-overview-is-addon` contracts) — all pass, confirming no
  regression to any other Tier card scenario.

**Validated:** `npx tsc --noEmit`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:tier-settings`,
`npm run contract:package-tier-workspace-shell`,
`npm run contract:package-family-card-metrics`,
`npm run contract:tier-occupant-card-drawer-unification`,
`npm run contract:tier-occupant-inclusions-bundle`,
`npm run contract:tier-edition-admin`, `npm run contract:tier-edition-switch`,
`npm run contract:tier-overview-is-addon`,
`php tests/tier-group-composition.php` (backend untouched, still green),
`npm run build`, `npm run docs:check`, plus a repo-wide NUL-byte scan —
all pass.

**Files changed:** `dist/js/admin-station.js`,
`resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx`,
`resources/ts/package-station/surface/tierSurface/tierOccupantCard.ts`,
`scripts/tier-occupant-card-drawer-unification-contract.ts`,
`scripts/tier-settings-contract.ts` (all under
`wp-content/plugins/compuzign-platform/`). No Code Map change — no
documented owner/path/responsibility changed, only two more wiring/reuse
defects in the same already-documented projection.
