# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **AWAITING CHATGPT REVIEW — correction applied, replacement head pushed**
- Auditor verdict: **Proceed with safeguards**.
- Production: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- Reviewed candidate (superseded by the correction below): `review/tier-catalogue-identity@8ed1696b5311c0dc82e72fbf56098fdd467a9f10`.
- Replacement review head: `review/tier-catalogue-identity@badb3664` (same branch, commit amended and force-pushed — still exactly one commit ahead of production, merge-base unchanged).
- Superseded `review/composable-upgrade-authoring-control@335df721...` remains unmerged and must never land.

## Correction applied (Claude, 2026-09-06)
Fixed the stale `PlatformIdentifierPolicy.php` comment flagged by review: "MAY ADDITIONALLY carry this Catalogue-type identity ... once an admin declares it an Catalogue offer" → now reads "ADDITIONALLY carries this Catalogue-type identity under the SAME native tuple, unconditionally — every settled composable occupant IS the one Tier Catalogue occupant, and every one of its Editions IS a Tier Catalogue Edition, with no admin declaration to gate on." Documentation-in-source only; no runtime behaviour changed. Grepped the full changed-file set afterward for any other "declares"/"declaration"/"gated on" wording that could contradict the unconditional model — the only other Catalogue-related hits already correctly say "no admin declaration needed" (added in the original pass); everything else is unrelated (Default declaration, billing declaration, etc.).

Amended the existing `8ed1696b` commit in place (one correction, one commit, per the instruction) rather than adding a second commit, and force-pushed the same branch — new SHA `badb3664`, still cleanly based on `main@48cede2f` (ahead 1, behind 0).

### Re-verified (no full rebuild — no generated output changed)
- `php tests/tier-catalogue-platform-identity.php`: PASS.
- `npm run contract:tier-catalogue-overview-presentation`: PASS (8 checks).
- `npm run contract:admin-platform-identifier-migration-sweep`: PASS (8 checks).
- `npx tsc --noEmit`: clean.
- `php -l` on the edited file: clean.

`main` not pushed. Ready for re-review.

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