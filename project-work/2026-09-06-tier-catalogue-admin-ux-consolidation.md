# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — clean deep-link removal candidate accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31` (deploy #967 success; currently-live broken deep-link state).
- Accepted candidate: `review/tier-catalogue-edition-edit-deeplink-removal` @ `77d5ef76e25622ac8c7756f49b4f0073395fdd2d`.
- Independent compare confirms exactly 1 commit ahead / 0 behind production `main`, merge-base exactly `56a15ad9...`, with no rejected-candidate ancestry.

## Independent audit
The final clean candidate matches Nath's superseding direction and the already-audited cleanup behavior:
- Customer Selection Rules keeps `Default | Edition ...` scope tabs for viewing declaration-specific data.
- Its Edit action now exists only for **Default** and still routes to the canonical Default Tier Inclusions editor.
- No Customer Selection Rules Edition scope can seed/select/auto-open an Edition editor.
- `initialDeclarationId`, `initialEditionId`, `initialEditionEditTab`, consume callbacks, switcher auto-open props/effect, and the seed-protection guard are removed from the special-entry chain.
- Normal Edition authoring remains entirely under Build Your Own -> Options -> Edition -> existing module Edit, using the existing drawer/editor/save/cancel/lifecycle/publish ownership.
- No replacement editor, drawer, footer, lifecycle, persistence route or backend authority was introduced.
- No pricing, resolver, identity, quote/cart/customer behavior is changed.
- Relevant Code Map is synchronized to the retired deep-link behavior.

Claude-reported validation on the final squashed candidate: `tsc` clean; focused declaration/Edition/composable/customer-policy contracts PASS; `docs:check` PASS; production build succeeded and Admin bundle rebuilt. Independent source/history/diff review finds no scope expansion.

## Claude — next action
1. Push **exactly `77d5ef76e25622ac8c7756f49b4f0073395fdd2d`** to `main` with no additional source changes.
2. Record the resulting exact `main` SHA and GitHub Actions deploy run/result in this same file.
3. After successful deployment, set **AWAITING LIVE VALIDATION**.
4. Keep the accepted review branch until Nath's live gate passes. Do not close yet.
5. Do not touch the separate Always-included initial-cart hydration defect or begin another phase.

## Live gate — Nath performs
After deploy, validate:
- Default scope still shows Edit and opens Default Tier Inclusions correctly;
- Edition scope tabs still switch the displayed Edition data;
- Edition scopes show **no Customer Selection Rules Edit action**;
- normal Build Your Own -> Options -> Edition -> module Edit still works with its established Save/Cancel/lifecycle behavior;
- the removed special Edition deep-link/auto-open path cannot be reached from Customer Selection Rules;
- ordinary Tier/Add-on behavior remains unchanged.

After Nath confirms the live gate, clean the accepted/superseded review branches per branch-hygiene rules, then close this work item.