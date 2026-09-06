# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 correction only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head `4ae6505c...` is **not approved for main**.

## Clarified approved UX
The user clarified the exact interaction with screenshots. This is **not** a separate Editions workspace and not merely a `Default | Editions` two-state launcher.

The selected Build Your Own area itself is one declaration-filtered workspace. Where the current middle-shell `View/Edit Customer Options` button sits, render sibling declaration tabs for the actual declarations:

`Default | Edition 1 | Edition 2 | ...`

Default is selected initially.

Selecting a declaration must refresh/filter the **whole Build Your Own presentation for that declaration**, not open a separate drawer:
- upper Build Your Own summary/card switches to that declaration's own details (label/title/price/status/metrics as supported by the existing Edition declaration data);
- Featured Inclusions switches to that declaration's own inclusions/featured projection;
- Customer Selection Rules summary switches to that declaration's own `customer_policy` projection;
- the lower/default declaration details workspace must address the selected declaration consistently when editing/viewing its owned data.

The user is explicitly asking for one Build Your Own shell with declaration tabs, where Editions behave as alternative declarations of the same Tier Catalogue offer. Do not create another workspace beside Default.

## Required correction — Phase 3 only
From clean production `main@3cc88e83...`:
1. Keep retirement of the standalone Customer Selection Rules drawer/button. The blue-circled `View/Edit Customer Options` location becomes the declaration tab strip.
2. Do not add a third `Editions` card action.
3. Use actual declaration tabs: `Default` plus one tab per existing Edition, using existing Edition identity/state. Do not invent a synthetic single `Editions` tab if actual Edition declarations exist.
4. Tab selection is presentation/navigation state only; it must not mutate or publish data.
5. Default uses the existing Build Your Own occupant declaration exactly as today.
6. An Edition tab must project that Edition's existing declaration data into the same shell: its summary/details, inclusions/Featured projection, and customer-selection-rule summary. Respect current Edition `customer_policy` semantics (`null` inherits Default wholesale; non-null is complete replacement).
7. Reuse existing Edition source/controller/declaration state and CZTEC identities. No new backend route/entity/draft/endpoint/identity family.
8. Editing/viewing from the filtered shell must address the selected declaration's existing owner/session rather than silently falling back to Default.
9. Ordinary Tier/Add-on UI remains unchanged.
10. Preserve merged per-inclusion customer-policy controls; no standalone Customer Selection destination remains.
11. Add focused contracts proving: Default initially selected; tabs enumerate real Editions; changing selected declaration swaps upper summary + Featured + policy-summary projections consistently; Edition inheritance/replacement semantics are respected; no third Editions card action; no customer-facing source changes.
12. Prepare one clean review branch from current production main, run tsc/build/docs check and focused Admin/Edition/customer-policy contracts, report exact branch/SHA/files/tests here, then set **AWAITING CHATGPT REVIEW**.

Do not push main. Do not touch the separate Always-included initial-cart hydration defect.