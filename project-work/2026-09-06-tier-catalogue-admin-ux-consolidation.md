# Tier Catalogue Admin UX Consolidation

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Production tree: `d8efeb2201bbb82ff0cc821da2553450a686a95e`.
- Topic branch removed; only `main` and `Project-work-instructions` remain.

## Final audit result
Independent GitHub verification confirms `main` is exactly the approved candidate commit and tree. The previous review branch was merged by fast-forward and deleted after ancestry verification.

GitHub Actions independently confirms `Deploy to Hostinger` run `34371875271` for head `f9ca5b18` completed successfully on attempt 2. This closes the previously missing deployment-evidence gap.

Nath reports live customer validation passed. Accepted live behavior is therefore:
- a one-primary customer group lands directly in the real focused shell;
- empty customer-group tabs are hidden; tabs only exist when both groups have a real primary Tier;
- an unquoted single Tier remains auto-focused with no X;
- once that exact Tier is quoted, the normal sticky X is available;
- X exits to the one quoted customer-group card with Cart visible beside it;
- the quoted card keeps `View Plan` and reopens the exact quoted Default/Edition identity;
- removal restores the auto-focused/no-X landing;
- re-adding the same Tier starts fresh, with no stale dismissal resurrection.

## Architecture accepted
Family occupancy is resolved before audience/focus derivation. Global Tier vocabulary remains global; `family.pricing.tiers` remains the Family occupancy boundary. Add-ons do not qualify customer-group tabs. The single-Tier focused fallback remains passive render-time derivation; the only effect added in the final refinement clears stale local dismissal state when external primary identity changes and does not auto-open/select anything.

## Preserved behavior
Tier/Edition identity, Add-on focused parity, Recommendations, Upgrade/composable journey, Cart, quote snapshots, pricing/server-preview authority, and genuine unset-audience fallback remain unchanged.

## Evidence
- Source candidate and final `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Tree: `d8efeb2201bbb82ff0cc821da2553450a686a95e`.
- Deploy workflow: `34371875271`, conclusion `success`.
- Mounted quoted-single-Tier regression: 27 checks reported passing; rejected dormant-only head failed the remove/re-add resurrection case.
- Family-membership regression and relevant TypeScript/build/contracts reported green.
- Live validation: passed by Nath.

## Out of scope
`commitSelection()` still transiently resets focused Edition to Default immediately after quoting an Edition; this predates the closed work and was explicitly non-blocking. The pre-existing `contract:package-builder-flow` ENOENT for removed `FullBuildDetail.tsx` remains separate work.
