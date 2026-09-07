# Tier Catalogue Admin UX Consolidation

## Status
- **BLOCKED ON MANUAL PUSH — Phase 1 approved, awaiting Nath to fast-forward `main`**
- Auditor verdict: **Proceed with safeguards**.
- Current production `main`: `3a83da8d3f723c5d29c8320d9332feebd4bfe2fb`.
- Approved review branch: `review/upgrade-your-build-eligibility` @ `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Independent compare against current `main` is exactly one commit ahead and contains only the four Phase-1 files listed below. Earlier work-file base `bd0a48d8` was stale because `main` had independently advanced to `3a83da8d`; the review branch correctly contains that current `main` commit as its direct parent, so no unrelated admin CSS is part of the Phase-1 diff.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This is rearrangement/visibility/navigation around existing state only: no second cart, temporary build, duplicate pricing, or new quote commit model.

1. Focused Tier -> existing Add to Quote.
2. When a real Upgrade Your Build catalogue exists, hide Cart + Recommended Add-ons and show **Upgrade your build** gate.
3. **Browse Catalogue** -> existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> end gate -> existing Recommended Add-ons if present -> Cart; otherwise Cart directly.
5. Catalogue left remains existing filters/featured/default-selection/quantity/max-6 paging behavior.
6. Catalogue right shows already-quoted plan + resolved upgrade `inclusionItems[]` as `label × quantity` + the same truthful commercial totals used by cart.
7. Existing composable auto-sync remains active while browsing and must NOT close the gate.
8. New right-side **Add to Quote** is stage-control only: no quote mutation; it ends the gate and resumes Add-ons/Cart continuation.

## Accepted phase sequence
1. Extract/share existing composable eligibility derivation with no behavior change. **Accepted here.**
2. Add eligibility-gated `pending|browsing|null` state; hide Cart/MobileQuoteBar/Recommendations while gated; `Maybe next time` resumes existing flow.
3. Wire Browse Catalogue to existing `ComposableOfferBrowser`; keep auto-sync/catalogue behavior unchanged.
4. Add right-side build summary + explicit stage-exit **Add to Quote**.
5. Mobile stacking/polish + matrix QA.

## Phase 1 independent audit
Compare `3a83da8d..5c7eb062` shows only:
- `ComposableOfferBrowser.tsx`: exact offer/policy/inclusion join extracted to exported pure `resolveComposableEligibleRows(family)`; component now calls it from the existing memo seam.
- new `scripts/composable-offer-eligibility-contract.ts` locking missing offer/policy, unmatched pairs, matched metadata/policy and policy-order semantics.
- `package.json`: one contract script registration.
- rebuilt `dist/js/cost-builder.js`.

No gate state, routing, cart visibility, summary UI, CTA, styling, pricing, preview, auto-sync, persistence, or customer-policy semantics changed. Claude-reported `tsc`, new eligibility contract, existing choice/contribution/quote-cart contracts and build all pass.

## Safeguards retained for later phases
- Future summary monetary facts must reuse existing exported cart/payment calculation authorities; no copied arithmetic.
- Future `name × qty` display rows come from committed composable `inclusionItems[]` (`label`, resolved `quantity`), not `composableSelection` intent/history.
- Do not end browsing from `onComposableCommit`.

## Claude — next action
Push **only** approved commit `5c7eb0621c1c3610b6e970826a294065e7bdb89a` to `main` by fast-forward. Do not begin Phase 2 yet. Record the resulting exact `main` SHA and deployment/workflow evidence here, then set **AWAITING CHATGPT REVIEW**.

## Push blocked for Claude — handed to Nath

Confirmed fast-forwardable: `origin/main` (`3a83da8d`) is a direct ancestor of `origin/review/upgrade-your-build-eligibility` (`5c7eb062`), which contains exactly the one approved commit and nothing else. But pushes to `main` are classifier-blocked for Claude in this environment — cannot be forced through by retry. Handing Nath the exact command to run:

```
git fetch origin
git push origin 5c7eb0621c1c3610b6e970826a294065e7bdb89a:main
```

Once pushed, Claude will record the resulting deploy evidence here and set AWAITING CHATGPT REVIEW. Status held at **BLOCKED ON MANUAL PUSH — Phase 1 approved, awaiting Nath to fast-forward `main`**.