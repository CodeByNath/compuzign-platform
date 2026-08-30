# Package bundle service/inclusion projection parity

## Status
- **AWAITING LIVE VALIDATION**
- Production `main` = `f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Deploy run `33303465265` / run #917 = `completed/success`, exact `head_sha=f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Auditor verdict: **Proceed with safeguards**.

## Accepted behavior
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into the real supplied Inclusion rows; the Bundle shell is never itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

Bundle children dedupe by authoritative `(rate_sheet_id, item_id)` across direct+Bundle and Bundle+Bundle overlap. Bundle-only children are display-only in this Tier context: no independent price and no false Tier-Inclusion View/Edit action. If the same real Inclusion is also genuinely selected directly, the direct selection wins interaction/provenance regardless of array order: one displayed row, real direct price, addressable action path.

## Independent production/deploy audit
GitHub `main` independently resolves to the exact approved review head `f82248d6`; no extra source commit was inserted. GitHub Actions **Deploy to Hostinger** run `33303465265` is independently `completed/success` for that exact SHA. Job `99235721468` confirms checkout, dependency install, frontend build, source deploy via SSH, and built dist deploy via SCP all completed successfully.

The reviewed source scope remains the six expected files only: `deck.ts`, `TierLowerDeck.tsx`, `PackageRepository.php`, the focused TS/PHP regressions, and generated `dist/js/admin-station.js`. No Code Map change is required because ownership/path/responsibility did not change.

## Live validation required
Nath is doing the browser validation from the other chat. Confirm on deployed Package Station:
- OMNIA focused Details shows the real Bundle-supplied inclusions, not `Foundation Bundle` as one Inclusion;
- Family/Group/Connections/Settings inclusion/service/category counts agree;
- Bundle-only child rows have no false Tier-Inclusion edit action;
- genuine direct inclusion rows retain their normal View/Edit action;
- KAIROS/APTOS remain unchanged;
- reload preserves the same projection.

If all hold, mark **CLOSED**. If any fail, record the exact live mismatch here and keep this same work item open.