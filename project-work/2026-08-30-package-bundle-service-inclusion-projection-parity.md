# Package bundle service/inclusion projection parity

## Status
- **READY FOR CLAUDE**
- Production `main` = `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`.
- Deploy run `33305089972` / run #918 = `completed/success`, exact `head_sha=2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards — two live count projections remain wrong**.

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
