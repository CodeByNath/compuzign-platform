# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2`.
- Approved candidate: `review/upgrade-shell-visual-parity` @ `0a13fd14`.

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
Push only the approved candidate to `main` using the normal clean review-branch process. Do not add further source changes in this work item before push.

After push, record:
- exact `main` SHA;
- deployment/workflow result;
- confirmation that no additional source changes were included.

Then set **AWAITING LIVE VALIDATION**. Nath will perform the customer-facing live check.

## Live acceptance target
Validate only the intended Upgrade Your Build flow above. Any deeper Edition refinement discovered but not blocking that flow should be recorded for separate follow-up, not fixed inside this work item.