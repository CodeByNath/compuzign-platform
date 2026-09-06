# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **SOURCE PUSH APPROVED — exact replacement candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- Approved review head: `review/tier-catalogue-identity@badb3664`.
- Superseded `review/composable-upgrade-authoring-control@335df721...` must never land and should be removed during branch cleanup.

## Locked architecture
One Admin **Tier Catalogue** model only.
- Catalogue occupant: `CZT...` + `CZTC...`
- Catalogue Edition: `CZTE...` + `CZTEC...`
- `CZTU/CZTEU` retired.
- `is_upgrade_offer` removed; no declaration/gate.
- Catalogue identity is inherent to the existing composable occupant/Edition lifecycle.
- Existing customer-facing **Upgrade Your Build / Build Your Own routes remain unchanged**. They can later enter CRM as separate transaction routes while carrying the same Catalogue identity family.
- No customer-route, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, billing, resolver, or CRM changes in this phase.

## Independent review
Replacement `badb3664` is cleanly based on production:
- ahead 1, behind 0;
- merge-base exactly `48cede2f...`;
- changed-file scope matches the previously reviewed Tier Catalogue conversion.

The one required correction is now present in `PlatformIdentifierPolicy.php`: the CZTC/CZTEC comment states Catalogue identity is carried **unconditionally**, every settled composable occupant is the Tier Catalogue occupant, its Editions are Tier Catalogue Editions, and there is **no admin declaration**. Runtime behaviour is unchanged from the previously reviewed candidate.

Accepted implementation:
- U policy/types/storage/projections/adapters/migration scopes converted to Catalogue (`CZTC/CZTEC`).
- `is_upgrade_offer` removed.
- composable occupant settlement reserves CZTC alongside CZT unconditionally.
- composable Edition activation reserves CZTEC alongside CZTE unconditionally.
- migration enumeration targets the composable occupant/its Editions and matching bin records only; ordinary Tier slots are excluded.
- Overview uses Catalogue terminology.
- customer-facing Upgrade Your Build / Build Your Own implementation remains untouched.

Claude reports the corrected head re-passed:
- `php tests/tier-catalogue-platform-identity.php`;
- `npm run contract:tier-catalogue-overview-presentation`;
- `npm run contract:admin-platform-identifier-migration-sweep`;
- `npx tsc --noEmit`;
- `php -l` on the edited policy file.
Previous broader validation on the same tree passed apart from known baseline failures already reproduced on production.

## Next action — Claude
Push **exactly `badb3664`** to `main` with no additional source changes. Then:
1. record resulting exact `main` SHA;
2. record GitHub Actions deployment run/result;
3. delete `review/tier-catalogue-identity` after landing;
4. delete the superseded `review/composable-upgrade-authoring-control` branch if possible; otherwise record the exact blocker for manual cleanup;
5. set status **AWAITING LIVE VALIDATION**.

## Final live gate
After deployment, use the existing Admin one-time Platform-ID assignment action if needed for the existing Tier Catalogue record. Then verify read-only in Admin:
- Tier Catalogue Overview keeps existing `CZT...` and shows `CZTC...`;
- Catalogue Edition Overview keeps `CZTE...` and shows `CZTEC...`;
- no Upgrade declaration control exists;
- customer-facing Upgrade Your Build / Build Your Own behaviour is unchanged.

Do not advance beyond this phase until deployment and live validation are accepted.