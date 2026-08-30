# Package bundle service/inclusion projection parity

## Status
- **SOURCE PUSH APPROVED — exact review head only**
- Production `main`: `f82248d605faf65f27687b0fedf5e1ee9ce5954c`
- Accepted review head: `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`
- Review branch: `review/package-bundle-family-group-count-and-price-wording`
- Auditor verdict: **Proceed with safeguards**

## Locked behavior
A Bundle is one commercial Rate Sheet selection/pricing row. Admin read/display expands its resolved `includes[]` into real Inclusion rows; the Bundle shell is never itself an Inclusion. Bundle-only children are display-only in Tier context: no independent price or false Tier-Inclusion action. Direct selections retain their own price/actions and win dedupe provenance regardless of array order. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

## Prior live result
Production `f82248d6` fixed Bundle expansion but left two live defects:
- OMNIA summary correctly showed Services 3 while Connections/Settings Family Group showed Services 0.
- Bundle-only Details rows showed `PRICE —` rather than explaining inherited Bundle pricing.

## Independent round-4 audit
Compared `main@f82248d6` to `2b62f20f...`: exactly 1 commit ahead, 9 expected files only (6 TS source/presentation files, 3 focused contract files, generated `dist/js/admin-station.js`). No backend/persistence/pricing files changed.

Root cause and fix are sound:
- Connections used `family.dependents.services`, a different metric from the canonical `familyComposition` already powering the correct Summary. Settings also called the family projection without composition. The accepted patch threads that same `familyComposition` through Workspace -> Lower Deck -> Settings and Connections. `usePackageTierWorkspace` includes `familyComposition` in the memo dependencies, so the projection cannot remain stale when composition changes.
- `projectFamilyConnectionRows()` uses canonical `familyComposition.services` when available; genuine zero remains zero, and only absent composition falls back to existing `dependents.services` behavior.
- Bundle-only Details rows now render exact Price text `Included in bundle`; no child price is assigned/copied/calculated. Direct price behavior is untouched.

Claude reports passing `tsc`, package-tier-workspace/tier-connections/tier-settings/workspace-shell/family-card contracts, PHP composition test, build, and `docs:check`. Added regressions cover composition-vs-fallback-vs-genuine-zero, Settings prop wiring, and Bundle price wording. No Code Map update required.

## Claude — production push
Push **exactly** `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6` to `main` using the normal workflow. Do not amend source. Then record:
1. resulting exact `main` SHA;
2. GitHub Actions deploy run ID/status/head SHA;
3. set **AWAITING CHATGPT REVIEW** and stop.

After deploy audit, live validation must confirm OMNIA Family Group Services = 3 in both Connections and Settings, Bundle-only Price reads `Included in bundle`, prior passing OMNIA/KAIROS/APTOS behavior remains intact, and reload is stable.