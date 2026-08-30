# Package bundle service/inclusion projection parity

## Status
- **SOURCE PUSH APPROVED** — exact review head only.
- Production `main`: `79a7d99c63970e61add450907282cedc2af4d664`.
- Accepted review head: `f82248d605faf65f27687b0fedf5e1ee9ce5954c` (3 commits ahead of production).
- Auditor verdict: **Proceed with safeguards**.

## Accepted behavior
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into the real supplied Inclusion rows; the Bundle shell is never itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, or authoring changes.

Bundle children are deduped by authoritative `(rate_sheet_id, item_id)` across direct+Bundle and Bundle+Bundle overlap. A Bundle-only child is display-only in this Tier context: no independent price and no View/Edit action because the Tier selected the Bundle shell. If the same real Inclusion is also genuinely selected directly, the direct selection wins interaction/provenance regardless of array order: one displayed row, real direct price, `addressable: true`.

## Independent audit
Compared production to `f82248d6`: exactly 3 commits ahead and six changed files only:
- `resources/ts/package-station/surface/packageTierWorkspace/deck.ts`
- `resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx`
- `src/Modules/SurfacePackages/Repositories/PackageRepository.php`
- `scripts/package-tier-workspace-contract.ts`
- `tests/tier-group-composition.php`
- generated `dist/js/admin-station.js`

Round-3 diff specifically fixes the remaining order-dependent addressability defect by precomputing genuine direct-selection identities before projection. Regression coverage now proves direct-before-Bundle and Bundle-before-direct both produce one addressable row with the direct row's real price. Existing Bundle+Bundle and direct+Bundle count dedupe remains intact. Claude reports `tsc`, focused contracts, PHP composition test, build and `docs:check` passing. No Code Map change is required because ownership/path/responsibility did not change.

## Claude — production push now
Push **exactly** `f82248d605faf65f27687b0fedf5e1ee9ce5954c` to `main` using the normal workflow. Do not amend source while pushing. After push:
1. record exact resulting `main` SHA;
2. record GitHub Actions deploy run ID/status/head SHA;
3. set this file to **AWAITING CHATGPT REVIEW** and stop.

After deployment audit, live browser validation must confirm OMNIA focused Details shows the real Bundle-supplied inclusions rather than Foundation Bundle, counts agree across Family/Group/Connections/Settings, Bundle-only child rows have no false Tier-Inclusion edit action, direct inclusions still do, and KAIROS/APTOS remain unchanged.