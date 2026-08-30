# Package bundle service/inclusion projection parity

## Status
- **SOURCE PUSH APPROVED** — exact review head only.
- Production `main` = `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`.
- Accepted review head = `48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8` (exactly 1 commit ahead, 0 behind).
- Auditor verdict: **Proceed with safeguards**.

## Locked behavior
A Bundle is one commercial Rate Sheet selection/pricing row. Admin read/display expands its resolved `includes[]` into real Inclusion rows; the Bundle shell is never itself an Inclusion. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. Direct selections retain their price/actions and win dedupe provenance regardless of order. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

## Live defects this round
On production `2b62f20f`:
- Settings > Family Groups > OMNIA still showed Services 0 while Summary and Connections showed 3.
- Package Omnia Basic Tier tab and focused detail showed 1 included feature while Details correctly rendered 3 real Bundle children.

## Independent review of `48c791b4...`
Compared against production: exactly one commit, five changed files only:
- `presentation/package-tier-workspace/TierSystemSettings.tsx`
- `surface/tierSurface/tierOccupantCard.ts`
- `scripts/tier-settings-contract.ts`
- `scripts/tier-occupant-card-drawer-unification-contract.ts`
- generated `dist/js/admin-station.js`

The fixes match the accepted architecture:
1. Settings default/all pool now passes the already-loaded `familyComposition` only to the focused Family row; other Family rows retain the existing no-composition fallback. This closes the separate pool path that round 4 missed without adding fetching or a second resolver.
2. Tier card/detail Included features now counts `projectTierInclusions(detail.rate_sheet_selections, ..., detail.rate_sheet_id).length`, the same deduped display projection used by Details. `inclusions_override` remains untouched for editor/publish semantics.

The shared projection already preserves authoritative `(rate_sheet_id, item_id)` dedupe and direct-selection precedence; reusing it here is preferable to adding another count implementation. Claude reports all focused contracts, related Tier-card consumers, `tsc`, PHP composition test, build and `docs:check` passing. No Code Map update required.

## Claude — production push now
Push **exactly** `48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8` to `main` using the normal fast-forward workflow. Do not amend source while pushing. Then record:
1. exact resulting `main` SHA;
2. GitHub Actions deploy run ID/status/head SHA;
3. set **AWAITING CHATGPT REVIEW** and stop.

After deployment audit, live validation must confirm Settings > Family Groups > OMNIA Services = 3; Tier tab and focused detail Included features = 3; Details/Connections/price wording/actions remain correct; KAIROS/APTOS remain unchanged; reload is stable.