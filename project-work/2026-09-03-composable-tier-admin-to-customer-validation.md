# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — Upgrade Journey Finalisation review head accepted.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2` until Claude pushes the exact approved head.
- Approved review head: `review/upgrade-journey-finalisation@528f7295fcc8e505cb0d064d01fe8e077f228924`.

## Accepted architecture
Upgrade starts from an exact selected Tier/Edition, creates an in-progress composable draft, requires explicit **Finalise build**, then becomes one Build Your Own result. Finalised state uses authoritative peer `composedBase` + `composedUpgrade`; top-level commercial fields are deterministic projection only; RequestSchema rebuilds that projection from sanitised children; un-finalised drafts block Request; add-ons are removed with the primary cascade; Base/Upgrade inclusion and payment-stream provenance is preserved. Standalone Build Your Own remains deferred.

## Auditor review of correction
Independent compare confirms `528f7295...` is exactly **2 commits ahead / 0 behind** `main@aa820596...`. The stale-finalisation correction itself is exactly **1 commit** over prior rejected head `4e2188f2...` and changes only:
- `ComposableOfferBrowser.tsx`;
- new `composable-finalise-race-contract.ts`;
- `package.json` contract entry;
- rebuilt `dist/js/cost-builder.js`;
- one Code Map line.

The correction closes the blocking race structurally:
- `currentChoice` changes synchronously with the customer's local selection;
- Finalise requires current local choice == committed cart `composableSelection`;
- it is also blocked while preview is loading or failed;
- exact base Tier/Edition identity must still match;
- therefore an old committed draft cannot be finalised after a newer local edit, including before debounce or after a stale/older response.

The focused contract covers: ready committed draft; immediate post-edit block before debounce; in-flight block; re-enable only after latest commit; stale-response mismatch; failed-preview block; no Finalise in standalone context; order-independent choice equality.

Claude reports passing: new race contract, upgrade-draft contract, quote-cart/add-on and isolation contracts, composed RequestSchema/notification PHP tests, composable RequestSchema test, typecheck, build and docs checks. No architecture/pricing/resolver/Rate Sheet changes were added by the correction.

## Push instruction
Claude may fast-forward **only** `528f7295fcc8e505cb0d064d01fe8e077f228924` to `main`. No cleanup/refactor/additional source changes. After push, record exact `main` SHA plus matching GitHub Actions/Hostinger deployment result here and set **AWAITING LIVE VALIDATION**.

## Live gate after deployment
Read-only production validation must cover: edit upgrade -> Finalise disabled until latest resolved commit; Finalise -> one Build Your Own result; base/upgrades grouped; payment streams/totals exactly once; add-ons not orphaned; Review blocked for unfinished draft; no customer-facing raw IDs. Remaining older representation checks continue afterward. Fresh Request/email mutation still requires Nath's separate explicit authorization.

## Work journey
Deploy/live-validate Upgrade Finalisation -> close remaining representation checks -> final customer UI/UX refinement -> later standalone Build Your Own journey.