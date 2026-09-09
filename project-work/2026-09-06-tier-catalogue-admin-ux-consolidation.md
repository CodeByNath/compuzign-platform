# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (fast-forwarded from `review/upgrade-shell-visual-parity`, no additional source changes included).
- Pushed by Nath directly (classifier blocks Claude pushing to `main`); verified `origin/main` resolves to `0a13fd14`.

## Current release goal
Finish the customer-facing **Upgrade Your Build** flow. Do not expand this work into a broader composable-Edition architecture project.

The accepted flow is:
- normal Tier/Edition is added first;
- selected primary Tier stays visible in staged view;
- Upgrade Your Build CTA sits inside existing Recommendations;
- pending Upgrade hides Add-ons + Cart;
- Browse Catalogue opens the composable occupant inside the existing `.cz-package-builder__focused` shell;
- `ComposableOfferBrowser` remains the existing server-preview/auto-sync quote mutation authority;
- Add to Quote is exit/return to the normal staged Tier + Recommendations + Cart view, not a second commit path;
- catalogue-only Families can still reach the Recommendations CTA;
- no standalone Build Your Own route/card/customer journey.

## Explicit deferral
The previously raised deeper composable-Edition consistency refinements are **not release blockers for this work**. Defer them to a separate follow-up unless live validation proves they directly break this customer flow.

Do not continue changing:
- Edition-specific catalogue-row projection/enrichment;
- additional Edition quote-metadata normalization;
- broader Edition/composable resolver architecture.

Do not revert working Edition changes already present in the approved candidate merely to reduce scope. Just stop expanding them here.

## Claude — next action
Done. Pushed to `main` at `0a13fd14` (clean fast-forward from `review/upgrade-shell-visual-parity`, no other source changes). Nath will perform the customer-facing live check.

## Live acceptance target
Validate only the intended Upgrade Your Build flow above. Any deeper Edition refinement discovered but not blocking that flow should be recorded for separate follow-up, not fixed inside this work item.