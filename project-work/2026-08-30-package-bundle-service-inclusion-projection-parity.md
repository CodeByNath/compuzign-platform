# Package bundle service/inclusion projection parity

## Status
- **READY FOR CLAUDE**
- Production `main` = `f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Deploy run `33303465265` / run #917 = `completed/success`, exact `head_sha=f82248d605faf65f27687b0fedf5e1ee9ce5954c`.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards — live parity remains incomplete**.

## Accepted behavior
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into real supplied Inclusion rows; the Bundle shell is never itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

Bundle children dedupe by authoritative `(rate_sheet_id, item_id)`. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. A genuine direct selection wins pricing and addressability regardless of array order.

## Production/deploy audit
GitHub `main` independently resolves to approved head `f82248d6`; deploy run `33303465265` succeeded for that SHA. Reviewed scope remains the reported Package Tier projection files/tests and generated bundle.

## Live browser validation — 2026-08-30
Read-only production check after reload at `https://compuzign.weerax.com/studio/`.

**Passing**
- OMNIA summary shows Categories 3 / Services 3 / Inclusions 3.
- Details renders three real Bundle-supplied rows; `Foundation Bundle` is not rendered as an Inclusion.
- Bundle-only child rows have no false View/Edit action or independent price.
- Connections > Foundation reports Inclusions 3.
- KAIROS remains Categories 6 / Services 17 / Inclusions 26; direct rows retain actions.
- Reload and OMNIA reselect preserve the projection.

**Failing**
- Connections > Family Group > OMNIA (`pcg_f72dc62213047feb`, `CZPGHG2ZV`) reports **Services 0**.
- Settings > Family Groups repeats OMNIA **Services 0**; KAIROS/APTOS remain 5/3.
- Each OMNIA Bundle-supplied inclusion displays `PRICE —`, which reads as missing/unknown rather than explaining inherited Bundle pricing.

## Next Claude instruction
### 1. Family Group counts
Make the Connections and Settings Family Group cards follow the same canonical resolved route already producing the correct **Services 3** in the selected **OMNIA — Banking summary**. Reuse that projection/selector rather than inventing a third count path. Count distinct resolved Services reached through Bundle children by stable Service identity; do not hard-code 3. Both OMNIA cards must show 3 for current production data, while genuinely empty groups remain 0.

### 2. Bundle-child price wording
In **Details > Focused inclusions**, when a row is Bundle-supplied and intentionally has no independent price, render **“Included in bundle”** in the Price value instead of `—`. This wording explains pricing provenance without implying free, unavailable, or unconfigured. Direct selections must continue showing their real formatted price. Do not assign, copy, calculate, or persist a child price.

## Hard non-change boundary and acceptance
Keep all passing behavior unchanged. Do not alter pricing calculations, Bundle commercial totals, persistence/schema, authoring, row actions, layout, labels other than this exact Price fallback, KAIROS/APTOS counts, or unrelated stations.

Add regressions proving:
- the same canonical OMNIA/service projection feeds summary plus Connections/Settings counts;
- Bundle-only price renders `Included in bundle`;
- direct priced rows are unchanged;
- genuinely empty groups remain 0.

Report root cause, changed files, tests, review SHA, and deployment state here; then set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
