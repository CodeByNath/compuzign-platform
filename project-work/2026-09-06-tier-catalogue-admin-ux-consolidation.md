# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — source behavior accepted, final candidate not yet push-ready**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31` (deploy #967 success; currently-live broken deep-link state).
- Reviewed candidate: `hotfix/tier-catalogue-edition-edit-remove-corrupted-deeplink` @ `db0d26e69f74dc250d65f89f75d6a29f6e008ec7`, exactly 2 commits ahead / 0 behind `main`, merge-base = current `main`.

## Independent audit
The candidate now follows Nath's superseding direction correctly:
- removes the Customer Selection Rules -> Edition auto-open/deep-link machinery from `useTierDrawerController`, `TierEditionDeclarationSwitcher`, `TierDrawerContent`, drawer prop plumbing and host pass-through;
- Customer Selection Rules keeps Default | Edition scope tabs for viewing only;
- the panel Edit button exists only for Default scope and still routes directly to Default Tier Inclusions;
- Edition scopes have no panel Edit action;
- normal Edition editing remains Build Your Own -> Options -> Edition -> existing module Edit, with existing Save/Cancel/lifecycle/Publish ownership untouched;
- no backend, identity, persistence, pricing, resolver, quote/cart/customer behavior changes;
- no replacement editor/header/footer/lifecycle system introduced.

This is the correct cleanup boundary. The failed special entry mechanism is removed rather than patched again.

## Remaining blockers before source-push approval
1. **Current Code Map is stale.** `docs/code-map/tier-composable-occupant-admin-ui.md` still says Phase 3 Edit targets whichever selected scope and carries a real Edition id through `encodeTierDrawerRecordId`. That is no longer true. Root `AGENTS.md` requires affected current-state Code Maps to match authoritative source.
2. **Final branch hygiene.** The reviewed branch is a two-commit working candidate. Before main approval, collapse the accepted final tree onto a fresh branch from current production `main` as one clean review commit, per `project-work/AGENTS.md`.

## Claude — next action
Do not alter the accepted source behavior.

- Update only the relevant current-state Code Map text to describe the new truth: scope tabs are viewing selectors; panel Edit is Default-only; Edition editing is reached only through the drawer's normal Options/Edition module Edit path; the external Edition deep-link/auto-open route is retired.
- Prepare one clean replacement review commit from `main@56a15ad9...` containing the already-reviewed source cleanup + regenerated Admin bundle + focused contract updates + Code Map sync.
- Re-run focused `tsc`, the relevant contracts, `build`, and `docs:check`.
- Update this same file with exact clean branch/SHA, changed files, and validation, then set **AWAITING CHATGPT REVIEW**.
- Do not push to `main` yet. Do not touch the separate Always-included initial-cart hydration defect.

Live validation remains Nath's gate after deployment.