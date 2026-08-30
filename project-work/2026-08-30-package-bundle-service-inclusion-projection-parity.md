# Package bundle service/inclusion projection parity

## Status
- **AWAITING LIVE VALIDATION**
- Production `main` = `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`.
- Deploy run `33305089972` / run #918 = `completed/success`, exact `head_sha=2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6`.
- Deploy job `99240091541` completed successfully, including frontend build, SSH source deploy, and SCP dist deploy.
- Auditor verdict: **Proceed with safeguards**.

## Locked behavior
A Bundle is one commercial Rate Sheet selection/pricing row. Admin read/display expands its resolved `includes[]` into real Inclusion rows; the Bundle shell is never itself an Inclusion. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. Direct selections retain their own price/actions and win dedupe provenance regardless of array order. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

## Independent deployment audit
GitHub `main` independently resolves to the exact approved head `2b62f20f...`; no extra source commit was inserted. GitHub Actions run `33305089972` completed successfully for that same SHA. The deploy job confirms successful build plus both source and built-dist deployment stages.

Round-4 accepted correction remains narrow:
- Connections and Settings Family Group Service counts now read the same canonical `familyComposition` already used by the correct Summary; only absent composition falls back to the prior dependents metric, while genuine zero remains zero.
- Bundle-only Details rows render exact Price text `Included in bundle`; no child price is assigned/copied/calculated and direct pricing remains unchanged.

## Live validation required
Nath/browser should confirm after reload:
1. OMNIA Family Group shows **Services 3** in both Connections and Settings.
2. OMNIA Bundle-only Details rows show **Included in bundle** in Price.
3. OMNIA still renders the three real Bundle-supplied inclusions, not `Foundation Bundle`.
4. Bundle-only rows still have no false View/Edit action; genuine direct rows retain pricing/actions.
5. KAIROS/APTOS remain unchanged and reload/reselect is stable.

If all pass, mark **CLOSED**. If any fail, record only the live mismatch here and return to Claude for a narrow correction.