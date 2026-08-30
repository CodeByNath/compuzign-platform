# Package bundle service/inclusion projection parity

## Status
- **READY FOR CLAUDE**
- Production `main` = `f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Deploy run `33303465265` / run #917 = `completed/success`, exact `head_sha=f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards — live parity remains incomplete**.

## Accepted behavior
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into the real supplied Inclusion rows; the Bundle shell is never itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

Bundle children dedupe by authoritative `(rate_sheet_id, item_id)` across direct+Bundle and Bundle+Bundle overlap. Bundle-only children are display-only in this Tier context: no independent price and no false Tier-Inclusion View/Edit action. If the same Inclusion is also genuinely selected directly, the direct selection wins interaction/provenance regardless of array order: one row, real direct price, addressable action path.

## Production/deploy audit
GitHub `main` independently resolves to approved head `f82248d6`; no extra source commit was inserted. Deploy run `33303465265` completed successfully for that SHA. Reviewed scope is the reported Package Tier projection files/tests and generated bundle.

## Live browser validation — 2026-08-30
Read-only production check after reload at `https://compuzign.weerax.com/studio/`.

**Passing**
- OMNIA family summary now shows Categories 3 / Services 3 / Inclusions 3.
- Package Omnia Basic Details renders the three real Bundle-supplied rows: Website, Web-Site Revamp; Online Banking & Member Services (Open Account Online); Online Payment / Wire Transfer.
- `Foundation Bundle` is not rendered as an Inclusion.
- Bundle-only child rows show no false View/Edit action and show no independent price.
- Connections > Foundation group now reports Inclusions 3.
- KAIROS still shows its established Categories 6 / Services 17 / Inclusions 26; its genuine direct inclusion rows retain View/action controls.
- Reload followed by reselecting OMNIA reproduces the same 3-row projection.

**Failing**
- Connections > Family Group > OMNIA — Banking (`pcg_f72dc62213047feb`, platform `CZPGHG2ZV`) still reports **Services 0**.
- Settings > Family Groups repeats the same OMNIA **Services 0**, while KAIROS and APTOS remain 5 and 3.
- Therefore family/group/Connections/Settings counts do not yet agree, and browser comments 5–6 remain unresolved.

## Next Claude instruction
Trace only the shared Family Group service-count projection used by the Connections and Settings cards. For a focused Tier whose Bundle children resolve to three distinct Services, both OMNIA cards must report the canonical distinct resolved Service count (**3** for current production data), not the Family Group’s empty direct-service list. Reuse canonical Bundle child Service provenance; dedupe stable Service identity. Do not hard-code 3.

Keep all passing Bundle inclusion behavior unchanged. Do not alter pricing, persistence/schema, authoring, layout/copy, KAIROS/APTOS counts, or unrelated stations. Add a regression proving Bundle-only resolved Services feed both card counts while genuinely empty groups remain 0. Report root cause, changed files, tests, review SHA, and deployment state here; then set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
