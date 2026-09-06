# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **SOURCE PUSH NOT APPROVED — one source correction required**
- Auditor verdict: **Proceed with safeguards**.
- Production: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- Reviewed candidate: `review/tier-catalogue-identity@8ed1696b5311c0dc82e72fbf56098fdd467a9f10`.
- Candidate is cleanly based on production: ahead 1, behind 0, merge-base exactly production.
- Superseded `review/composable-upgrade-authoring-control@335df721...` remains unmerged and must never land.

## Locked architecture
One Admin **Tier Catalogue** model only.
- Catalogue occupant: `CZT...` + `CZTC...`
- Catalogue Edition: `CZTE...` + `CZTEC...`
- `CZTU/CZTEU` retired.
- `is_upgrade_offer` removed; no declaration/gate.
- Catalogue identity is inherent to the existing composable occupant/Edition lifecycle.
- Existing customer-facing **Upgrade Your Build / Build Your Own routes remain unchanged**. They may later enter CRM as different transaction routes while carrying the same Catalogue identity family. No customer-route, pricing, Legs, quote/cart, Request, PDF/email/order, billing, resolver, or CRM changes now.

## Independent review of `8ed1696b...`
The implementation direction is correct:
- U policy/types/storage/projections/adapters/migration scopes renamed to Catalogue (`CZTC/CZTEC`).
- `settleComposableOccupant()` now reserves Catalogue identity unconditionally alongside CZT.
- composable Edition activation reserves CZTEC alongside CZTE.
- migration enumeration is scoped to the composable occupant and its matching bin entries, not ordinary Tier slots.
- Overview labels/fields use Catalogue terminology.
- changed-file list contains no customer-facing Upgrade Your Build/Build Your Own implementation files.
- Claude reports focused identity/migration/contracts, TS, docs and build passing; reported lifecycle/invariant failures reproduce on production baseline.

### Required correction before approval
`PlatformIdentifierPolicy.php` still contains stale architecture wording in the new CZTC/CZTEC prefix comment:
> `MAY ADDITIONALLY carry this Catalogue-type identity ... once an admin declares it an Catalogue offer.`

That directly contradicts the locked model and the implementation immediately below it. There is **no admin declaration** and Catalogue identity is unconditional/inherent for the Tier Catalogue occupant/Edition. Correct that comment only; do not change runtime behaviour while doing so.

## Next action — Claude
Amend/rebuild one clean review commit from `main@48cede2f...` with only that documentation-in-source correction on top of the already reviewed tree. Re-run the focused Tier Catalogue identity/presentation contract (full rebuild unnecessary unless generated output changes), push the replacement review head, remove/replace the old `8ed1696b...` review branch state as appropriate, and set **AWAITING CHATGPT REVIEW** with exact SHA/test result.

Do not push `main` yet.