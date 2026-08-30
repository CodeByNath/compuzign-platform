# Package bundle service/inclusion projection parity

## Status
- **READY FOR CLAUDE**
- Source push: **NOT APPROVED**
- Audit verdict: **Proceed with safeguards**

## Objective
Fix the deployed Package Station projection defect where a Tier can report included features while the focused family, connection cards, and inclusion list resolve the same relationships as zero/empty. Claude owns implementation; ChatGPT has made no source changes.

## Live browser evidence — 2026-08-30
Read-only check at `https://compuzign.weerax.com/studio/`, Packages > Tier Workspace Engine, Focus view:

- Selected Tier: **Package Omnia Basic**, active, `$4000.00 · monthly`.
- Tier tab/detail both report **1 included feature**.
- Focused Package Family **OMNIA — Banking** reports Tiers 1 but **Service Categories 0 / Services 0 / Inclusions 0**.
- Details > Focused inclusions says **“This Tier selects no inclusions.”**
- Connections > Family Group **OMNIA — Banking** (`pcg_f72dc62213047feb`, platform `CZPGHG2ZV`) reports **Services 0**.
- Connections > Groups > **Foundation** (`rate_group_1786783430147_13`, platform `CZPRCG93HNR`) reports **Inclusions 0**.
- Settings > Family Groups repeats OMNIA **Services 0**, while KAIROS and APTOS show 5 and 3 respectively.

This reproduces browser comments 1–6 and demonstrates cross-surface disagreement for the same selected Tier/family/group.

## Required behavior
1. Trace the canonical identity/assignment chain used by **Package Omnia Basic** from Tier selection through Package Family, Family Group, Tier Group/Rate Group, Service, inclusion, and Rate Sheet row. Establish the actual root cause from source/persisted projection evidence before changing code; do not assume the defect is necessarily a legacy/local-ID mismatch.
2. Repair only the narrow authoritative projection/resolution defect that causes valid existing relationships to be dropped. Preserve current ownership: Package Station owns Family/Tier/workspace reads, assignment resolution, fixed-slot projection, connection navigation, inclusion resolution, and Rate Sheet access.
3. Render the actual selected inclusion(s) in **Details > Focused inclusions**, including the normal inclusion row content/filters, from the same resolved source used by the Tier rather than a second bespoke projection.
4. Make all derived counts agree with the canonical resolved data:
   - Tier included-features count;
   - Package Family Services and Inclusions;
   - Family Group Services in Connections and Settings;
   - Group Inclusions in Connections.
5. Do not hard-code the observed count `1`; zero must remain correct for genuinely empty records.
6. Ensure the same resolver/projection rules work for other package families and survive reload.

## Hard non-change boundary
Do not redesign or restyle the Tier Workspace, cards, tabs, filters, labels, ordering, responsive layout, or empty states. Do not change pricing, billing cadence, Rate Sheet amounts, Package/Tier/Service/Inclusion authoring semantics, persistence schemas, unrelated customer UI, Quote Builder, or existing KAIROS/APTOS data. Avoid data migration/backfill unless evidence proves persisted identity/data is invalid; if so, stop and report that evidence before expanding scope. Do not create a second resolver or presentation-owned relationship model.

## Acceptance
- Add focused regression coverage for the proven root cause and cross-surface count parity; if mixed stable/legacy identity is involved, cover that specifically rather than assuming it upfront.
- Verify existing empty-state cases remain zero and KAIROS/APTOS remain unchanged.
- Update only affected current-state Code Map(s) if responsibility/path/behavior documentation changes, and run docs link/check validation required by repository instructions.
- Report root cause, changed files, tests/contracts, exact review-branch commit SHA, deployment state, and before/after evidence in this file.
- Push implementation only to a review branch, then set **AWAITING CHATGPT REVIEW** and stop. Do not push source to `main` without explicit approval recorded here.
