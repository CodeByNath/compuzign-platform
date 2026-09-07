# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 5 final polish/matrix only; Phase 2+3+4 functionally accepted, not yet approved for main**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Candidate `review/upgrade-your-build-inclusions` @ `b4c4951523c98a2e26dbca4f6b443d7c47c43d4a` is one clean commit from current main. Functional Phases 2-4 are accepted; source push is held only so the final mobile/polish phase can ship as one coherent candidate.

## Accepted functional state
- Shared `resolveComposableEligibleRows(family)` gates the flow.
- Primary Tier/Edition is already in quote before Upgrade stage.
- Pending gate hides normal Cart/MobileQuoteBar + Recommendations without mutating `items`.
- **Maybe next time** resumes the exact existing Recommendations-if-present, otherwise Cart path.
- **Browse Catalogue** enters `browsing`; only existing `ComposableOfferBrowser` mounts there.
- Existing filters/paging/featured/default selection/quantity/preview/auto-sync remain unchanged; auto-sync never exits the stage.
- Right side reuses `QuoteSummary`'s own `QuoteItemPricePresentation` + `QuoteTotalsPresentation` over only primary + composable lines.
- Selected Upgrade inclusions come from existing `disclosureRowsForFamilyTierItem(composableItem)`, always visible, Bundle-child hierarchy preserved, and `× quantity` shown only when authoritative quantity is non-null.
- **Add to Quote** is stage-exit only; no quote mutation/recommit/rebuild.

## Phase 5 only
Do final presentation/mobile hardening and matrix QA. Do not reopen architecture.

### Presentation
- Keep CompuZign dark/yellow visual grammar; no new design system or alternate recommendation/cart shell.
- Pending gate should visually read as the existing recommendation-stage slot: concise message + primary **Browse Catalogue** + secondary **Maybe next time**.
- Browsing desktop should remain catalogue left / scoped Cart presentation right.
- On narrow/mobile widths, stack predictably with catalogue first and `Your build` summary second; no horizontal overflow, clipped controls, unusable filter row, or hidden stage-exit CTA.
- Preserve existing customer terminology and current catalogue internals.

### Matrix QA
Cover at minimum:
1. eligible catalogue + recommended add-ons;
2. eligible catalogue + no add-ons;
3. no eligible catalogue + add-ons;
4. no eligible catalogue + no add-ons;
5. Browse -> auto-sync additions/removals -> Add to Quote exit;
6. Maybe next time bypass;
7. Family switch / primary remove or replace while gated;
8. primary only before first composable auto-sync, then composable line appears;
9. multi-stream primary/composable Cart presentation;
10. mobile/narrow stacking.

No new customer steps, pricing logic, cart store, persistence, recommendation engine, Admin changes, or unrelated cleanup.

Run `tsc`, relevant focused contracts and build. Prepare one **fresh final Phase 2+3+4+5 candidate from current production main**, with no superseded branch ancestry; remove superseded review branch after replacement is pushed. Record exact SHA/files/evidence here as **AWAITING CHATGPT REVIEW**. Do not push to main.