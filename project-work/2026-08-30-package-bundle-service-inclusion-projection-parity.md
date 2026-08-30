# Package bundle service/inclusion projection parity

## Status
- **CLOSED** — live validation accepted by Nath on 2026-08-30.
- Production `main` = `48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Deploy run `33306213016` / job `99243133938` = `completed/success`, exact `head_sha=48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Final auditor verdict: **Proceed**.

## Locked behavior
A Bundle is one commercial Rate Sheet selection/pricing row. Admin read/display expands its resolved `includes[]` into real Inclusion rows; the Bundle shell is never itself an Inclusion. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. Direct selections retain their price/actions and win dedupe provenance regardless of order. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

## Resolved live defects
- Settings > Family Groups > OMNIA now follows the canonical resolved family composition and reports the same distinct Service count as Summary and Connections.
- Package Omnia Basic Tier tab and focused detail now count the deduped real Inclusion display projection rather than the one Bundle selection shell.
- Bundle-supplied Details rows render **Included in bundle** instead of an unexplained dash.
- Bundle children remain non-addressable and independently unpriced; direct rows retain real pricing/actions.

## Final source/deployment record
Production fix `48c791b4` changed only:
- `presentation/package-tier-workspace/TierSystemSettings.tsx`
- `surface/tierSurface/tierOccupantCard.ts`
- `scripts/tier-settings-contract.ts`
- `scripts/tier-occupant-card-drawer-unification-contract.ts`
- generated `dist/js/admin-station.js`

The Settings pool passes the existing `familyComposition` to the focused Family row. Tier card/detail Included features use `projectTierInclusions(...).length`, sharing Details’ authoritative `(rate_sheet_id, item_id)` dedupe and direct-selection precedence. `inclusions_override` editor/publish semantics remain unchanged.

Claude reported focused contracts, related Tier-card consumers, TypeScript, PHP composition test, build, and docs checks passing. GitHub Actions deployed the exact production SHA successfully.

## Final live acceptance — 2026-08-30
Nath reported the deployed browser validation **passed**. Accepted surfaces include Settings and Connections Family Group counts, Tier tab/detail inclusion counts, Details rows and **Included in bundle** wording, action/addressability behavior, unchanged KAIROS/APTOS projections, and reload stability.

This work item is closed and must not be reopened; any later unrelated issue gets a new work file.
