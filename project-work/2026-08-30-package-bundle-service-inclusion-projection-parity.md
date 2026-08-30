# Package bundle service/inclusion projection parity

## Status
- **SOURCE PUSH APPROVED** — exact review head only.
- Production base independently confirmed: `main@195896e0376c5b4988c4337f0ded769fb0c3bc09`.
- Accepted review head: `79a7d99c63970e61add450907282cedc2af4d664` (exactly 1 commit ahead, 5 changed files).
- Auditor verdict: **Proceed with safeguards**.

## Accepted root cause
Live OMNIA — Banking selects one self-priced Bundle Rate Sheet row. The Tier/pricing path already resolves it, but Package Family/Tier Group composition and the focused lower-deck projections previously recognized only Manager rows with `source_type === 'inclusion'`. A Bundle commercial row carries no Manager source of its own, so it was dropped and the same valid relationship appeared as zero Services/Categories/Inclusions on other Package surfaces.

## Accepted fix
- Backend `PackageRepository::composeTierGroup()` now accepts a resolving self-priced Bundle row as one selected Inclusion and derives its Service/Category provenance from the real inclusion rows in `row.includes[]` through the existing indexes.
- Frontend `deck.ts` uses one shared inclusion-selection predicate for ordinary inclusion rows or Bundle rows; focused inclusions and Group/Rate Sheet inclusion counts therefore use the same rule.
- No second resolver, schema change, identity change, persistence migration, pricing change, or authoring change was introduced.
- Generated `dist/js/admin-station.js` was rebuilt.

## Independent audit
Compared production base to review head: exactly one commit and only these files changed:
1. `resources/ts/package-station/surface/packageTierWorkspace/deck.ts`
2. `src/Modules/SurfacePackages/Repositories/PackageRepository.php`
3. `scripts/package-tier-workspace-contract.ts`
4. `tests/tier-group-composition.php`
5. `dist/js/admin-station.js`

The implementation stays inside Package Station's established projection/composition authority. Bundle provenance is resolved through existing Rate Sheet/source indexes rather than presentation-owned data. Existing unresolved/FAQ exclusions remain intact. No Code Map update is required for this correction because no documented owner, path, endpoint, or responsibility changed.

Claude reported all focused Package/Rate Sheet contracts, `tsc`, build and `docs:check` passing; the unrelated `tier-capability-invariants.php` failure reproduces on clean `main` and is not part of this change.

## Claude — production push now
Push **exactly** `79a7d99c63970e61add450907282cedc2af4d664` to `main` using the normal workflow. Do not amend source while pushing. After push:
1. record exact resulting `main` SHA;
2. record GitHub Actions deploy run ID/status/head SHA;
3. set this file to **AWAITING CHATGPT REVIEW** and stop.

After deployment audit, live browser validation must confirm OMNIA focused inclusions and Family/Group counts now agree while KAIROS/APTOS remain unchanged. Do not advance to unrelated Admin UI/UX or CRM work until this item is accepted/closed.