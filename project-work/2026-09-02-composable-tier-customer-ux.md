# Composable Tier — customer UX / Phase 2B1

## Status
- **CLOSED — production accepted; live composable exercise deferred until real Admin configuration exists.**
- Auditor verdict: **Proceed with safeguards**.
- Production: `main@28613c0584440420953da81737acd95d35f47f16`.
- Hostinger deploy: run #933 (`33649657279`) completed/success for that exact SHA.
- Static-validation branch: `review/composable-tier-customer-ux@83f5dbcde77840ee9af84f4125e7416cc1001d7e` contains test-only additions; not required for production acceptance and not approved for main by this closure.

## Accepted contract
Same subordinate composable Tier occupant and server resolver. Customer controls only Add/Remove plus allowed quantity. No customer Price Option, Leg, commitment or Edition editing. Service/Category are filter metadata; `featured` is bool-only. Candidate preview is server-resolved and debounced. Payment preview does not invent cross-Period totals. Selected card contribution comes from server `line_total`; ambiguous multi-Leg contribution is not summed. Existing normal Tier/Add-on quote persistence is untouched. Cart/request/PDF/email/promotions remain out of scope.

## Static validation accepted
Claude mounted the real shipped `ComposableOfferBrowser.tsx` in a happy-dom/esbuild harness with synthetic `PackageBuilderFamily` data and mocked preview transport; no production records were created and no production source changed.

27 assertions passed covering:
- distinct Build Your Own / Upgrade your build contexts;
- policy-authorized rows only;
- Category/Service browse behavior, Featured-first ordering and six-per-page paging;
- optional Add/Remove including `default_selected:true` explicit false/true round-trip;
- required rows not exposed as removable cards;
- fixed quantity without selector and configurable min/max/step with debounced request coalescing;
- no Price Option control and no submitted `price_option_id`;
- server `line_total` drives card contribution, with ambiguous multi-Leg fallback rather than summation;
- no-op render when `composable_offer` is absent.

The harness does not mount the full 1200+ line `FamilyTierAdapter`; that narrower proof is accepted because Phase 2B1 wiring is additive sibling rendering and the composable component proves a null-offer no-op. Existing Tier/Add-on source was independently reviewed as unchanged in this slice.

## Deferred live gate
Do not create production fixture/policy data solely for testing. The first real Admin-configured/published composable offer must receive an end-to-end customer validation before that configured offer is treated as production-ready: filtering, Add/Remove, quantity, server-resolved prices/streams, and normal-plan coexistence.

This work file is now immutable. Later cart/quote persistence or Admin-authoring work must use a new work file.