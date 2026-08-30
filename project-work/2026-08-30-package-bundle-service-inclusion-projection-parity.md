# Package bundle service/inclusion projection parity

## Status
- **AWAITING LIVE VALIDATION** — source and deployment boundaries independently accepted.
- Production `main` = `79a7d99c63970e61add450907282cedc2af4d664`.
- Deploy run `33301750395` / run `916` = `completed/success`, exact `head_sha=79a7d99c63970e61add450907282cedc2af4d664`.
- Auditor verdict: **Proceed with safeguards**.

## Accepted root cause
Live OMNIA — Banking selects one self-priced Bundle Rate Sheet row. The Tier/pricing path already resolved it, but Package Family/Tier Group composition and the focused lower-deck projections previously recognized only Manager rows with `source_type === 'inclusion'`. A Bundle commercial row carries no Manager source of its own, so it was dropped and the same valid relationship appeared as zero Services/Categories/Inclusions on other Package surfaces.

## Accepted fix
- Backend `PackageRepository::composeTierGroup()` accepts a resolving self-priced Bundle row as one selected Inclusion and derives Service/Category provenance from the real compiled inclusion rows in `row.includes[]` through existing indexes.
- Frontend `deck.ts` uses one shared inclusion-selection predicate for ordinary inclusion rows or Bundle rows; focused inclusions and Group/Rate Sheet inclusion counts therefore use the same rule.
- No second resolver, schema change, identity change, persistence migration, pricing change, or authoring change.
- Generated `dist/js/admin-station.js` rebuilt.

## Independent source/deploy audit
The approved review head was exactly one commit ahead of prior production and changed only the five reviewed files. After Nath's fast-forward push, GitHub `main` independently resolves to the exact approved SHA `79a7d99c63970e61add450907282cedc2af4d664` with parent `195896e...`; no extra source commit was inserted.

GitHub Actions **Deploy to Hostinger** run `33301750395` completed successfully on first attempt with that exact `head_sha`. Independent job inspection confirms `Build frontend assets`, `Deploy source via SSH`, and `Deploy built dist assets via SCP` all completed successfully.

No Code Map update is required for this correction because no documented owner, path, endpoint, or responsibility changed.

## Live validation now
Read-only browser validation must confirm:
- OMNIA Basic no longer shows `This Tier selects no inclusions`;
- the Bundle-backed focused inclusion appears correctly;
- OMNIA Package Family Services/Inclusions counts are non-zero and consistent;
- Connections > Family Group and Group counts agree with the same resolved data;
- Settings > Family Groups agrees with Connections;
- KAIROS/APTOS remain unchanged;
- reload preserves the corrected projection.

If live behavior matches, mark **CLOSED** and only then return to unrelated Admin UI/UX or CRM work.