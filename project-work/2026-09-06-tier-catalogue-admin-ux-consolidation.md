# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `ee624fdc6d71e9499396097b872afd3bee97b26f`.

## Live result — previous defect accepted
Nath confirmed the deployed single-primary landing now behaves correctly: a one-primary customer group lands directly in the real focused shell, and empty customer-group tabs are no longer shown. Treat the Family-membership correction as accepted; do not reopen it without hard evidence.

## New refinement — Nath approved
When a customer group has exactly one normal Tier:

1. **Before that Tier is in Cart**
   - keep the current automatic focused landing;
   - no Close/X button;
   - no one-card grid fallback.

2. **Once that exact Tier is the selected primary in Cart**
   - the focused shell remains available;
   - show the normal sticky **X** Close button;
   - clicking X must exit focused mode and reveal the single Tier as its normal customer-group card while the Cart remains visible beside it;
   - the quoted card keeps the existing quoted-state CTA (`View Plan`) and can reopen the focused shell;
   - reopening must show the same exact quoted Default/Edition identity.

3. **If the Tier is removed from Cart**
   - restore the original single-Tier landing rule: automatic focused shell, no X.

## Architectural direction
Do not make `normalTiers.length === 1` permanently undismissable once that Tier is quoted. Distinguish:
- **locked implicit single-Tier landing** = exactly one real primary + not quoted;
- **quoted single-Tier focused view** = exactly one real primary + selected primary exists; dismissible with X.

The X must not immediately re-trigger the render-time single-Tier fallback. Use explicit, local presentation state/derivation tied to the quoted single-Tier case so a customer dismissal persists while that same Tier remains quoted. Reset that dismissal when the primary is removed, Family/customer group changes, or a different Tier becomes selected. Do not use fake clicks, timers, route changes, or CSS-only hiding.

## Must preserve
Family-membership fix, audience/tab rules, exact Tier+Edition identity, existing focused shell, sticky X behavior, Add-ons, Recommendations, Upgrade/composable journey, Cart, pricing/server preview authority, quote snapshots and current `View Plan` routing.

## Must not substitute
No extra customer step, no one-card landing before quote, no duplicated focused shell, no hardcoded Family/Tier ids, no effect-driven artificial auto-open, no cart suppression after X.

## Claude — next action
Implement only this refinement from current `main`. Add/adjust a mounted regression covering: unquoted single Tier auto-focused/no X; quoted single Tier focused with X; X => one quoted card + Cart-visible state signal; `View Plan` reopens exact quoted Edition; removing primary restores auto-focus/no X. Push to the single topic branch, record changed files/tests/SHA here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.
