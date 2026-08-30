# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW** — pushed and deployed.
- Production `main` = `f82248d605faf65f27687b0fedf5e1ee9ce5954c` (exactly the approved review head; `origin/main` confirms the same SHA).
- Deploy: GitHub Actions `deploy` run `33303465265` / job `99235721468` = `completed/success`, `head_sha=f82248d605faf65f27687b0fedf5e1ee9ce5954c`, started `2026-08-30T09:12:20Z`, completed `2026-08-30T09:12:46Z`.
- Auditor verdict carried over: **Proceed with safeguards**.

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

## Claude Report — production push complete — 2026-08-30
Pushed `f82248d6` to `main` (fast-forward only, no amend; `origin/main` independently confirmed at the same SHA). Deploy evidence recorded in Status above. Handing off for live browser validation.

Live validation must confirm: OMNIA focused Details shows the real Bundle-supplied inclusions rather than "Foundation Bundle"; counts agree across Family/Group/Connections/Settings; Bundle-only child rows carry no false Tier-Inclusion edit action; genuine direct inclusions still do; KAIROS/APTOS remain unchanged. If all hold, mark **CLOSED**; if not, record findings here for another correction round.