# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production: `main@badb36641577a2c8e4fdd2581dc4391750ae62df` (exactly the approved `badb3664`, no additional source changes — pushed by the user per Claude's classifier-blocked hand-off).
- Superseded `review/composable-upgrade-authoring-control@335df721...` must never land; deletion attempted, see blocker below.

## Push and deployment record (Claude, 2026-09-06)
1. `main` advanced to exactly `badb3664` via the fast-forward the user ran (`git push origin badb3664:main`) — pushing to `main` is classifier-blocked for Claude, so the user executed it directly. Confirmed via `git fetch origin main` that `origin/main` is `badb3664` with no further commits.
2. GitHub Actions deployment confirmed via the public Actions API (`GET /repos/CodeByNath/compuzign-platform/actions/runs?branch=main`): workflow "Deploy to Hostinger", run #958, `head_sha: badb3664`, `status: completed`, `conclusion: success`.
3. **Blocked for Claude**: `git push origin --delete review/tier-catalogue-identity` was attempted and denied by the auto-mode classifier (branch deletion is blocked the same way `main` pushes are). Handed the user the exact command to run manually.
4. **Blocked for Claude, same reason**: `git push origin --delete review/composable-upgrade-authoring-control` was also attempted and denied. Handed the user the exact command to run manually. Both branches remain present on origin pending the user running these two deletes; neither is mergeable into anything and both are already fully superseded by the merged `badb3664`, so their continued (temporary) presence is not a blocker to live validation.
5. Status set to **AWAITING LIVE VALIDATION** per the final live gate below.

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