# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — live footer route accepted; focused-shell visual parity + top tab refinement**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `6f8f8cad9d49c6c728979e7ed327a714cbf28163`; deploy #975 succeeded.
- Nath live validation: skipped-upgrade footer route works and is accepted.

## New refinement from live screenshots
The normal focused Tier shell and Upgrade Your Build browsing shell now need to look like the same focused experience, not two separate visual systems.

### 1. Visual parity
Use the existing focused Tier/Edition shell as the visual authority for the Upgrade Your Build shell.
- Match outer focused container geometry, width behavior, border/radius, spacing, top alignment, section rhythm, typography hierarchy, and right-card treatment.
- Keep current Upgrade content/behavior unchanged: catalogue/filter/list on the left, scoped Cart-backed **Your build** on the right, existing auto-sync and Add to Quote stage exit.
- Do not restyle the normal Tier shell to meet the Upgrade shell; bring Upgrade presentation up to the established focused-shell grammar.
- Preserve mobile stacking already accepted.

### 2. Top floating tab system
Before implementing, inspect how the existing focused Tier/Edition **top floating tab** system actually works in source/CSS. Reuse that system rather than inventing a lookalike.

Apply the same top-tab presentation to Upgrade Your Build so the customer retains the quoted occupant/Edition context while browsing upgrades.
- Reuse the same component/state/presentation seam if one exists; otherwise extract only the smallest genuine shared presentation primitive.
- Drive the tab from the already-quoted primary Tier occupant/Edition identity. Do not create a second variant-selection state or infer identity from labels/indexes.
- Preserve the currently quoted occupant/Edition as the active context when entering from initial Browse, footer **Upgrade your build**, or line-level **Manage build**.
- If the existing top tab allows variant switching, first verify the exact current focused-shell behavior and reuse its authority/path; do not add a new switching behavior just for Upgrade.
- Occupant/default presentation should follow the same established tab grammar as Edition rather than a bespoke special case.

## Must preserve / must not substitute
Preserve all accepted Upgrade gating, footer recovery, Manage build, add-ons, Cart visibility rules, quote mutation paths, pricing, persistence, and mobile behavior. No duplicate tab engine, no new occupant/Edition state model, no new pricing/cart logic, no second focused shell.

## Claude — next action
Read the normal focused shell source and CSS first, specifically the top floating tab implementation and the focused two-column/card composition. Then make the Upgrade browsing shell consume the same visual/tab authorities with the smallest change surface.

Add/update focused presentation contracts where useful, run `tsc`, relevant Upgrade/Manage/footer contracts and build. Push a clean review candidate from current `main`, record exact SHA/files/evidence here, set **AWAITING CHATGPT REVIEW**. Do not push to main.