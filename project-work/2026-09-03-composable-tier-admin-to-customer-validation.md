# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — exact Upgrade Journey Finalisation head still awaiting push to `main`.**
- Auditor verdict: **Proceed with safeguards.**
- Current `main` remains `aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`.
- Approved review head remains `review/upgrade-journey-finalisation@528f7295fcc8e505cb0d064d01fe8e077f228924`.
- Independent branch check: review head is **2 commits ahead / 0 behind** current `main`; no newer source commit exists on the review branch.

## Accepted architecture
Upgrade starts from an exact selected Tier/Edition, creates an in-progress composable draft, requires explicit **Finalise build**, then becomes one Build Your Own result. Finalised state uses authoritative peer `composedBase` + `composedUpgrade`; top-level commercial fields are deterministic projection only; RequestSchema rebuilds that projection from sanitised children; un-finalised drafts block Request; add-ons are removed with the primary cascade; Base/Upgrade inclusion and payment-stream provenance is preserved. Standalone Build Your Own remains deferred.

## Accepted correction
The stale-finalisation race correction at `528f7295...` remains accepted. Finalise requires:
- latest local choice == committed cart `composableSelection`;
- preview not loading and last preview successful;
- exact base Tier/Edition still matches.

This prevents finalising an older draft after a newer Add/Remove/quantity edit, including before debounce or after a stale response.

## Claude action now
Fast-forward **only** `528f7295fcc8e505cb0d064d01fe8e077f228924` to `main`. No cleanup, refactor, rebuild-only adjustment, or additional source change.

After push:
1. record exact resulting `main` SHA;
2. record matching GitHub Actions/Hostinger workflow result for that SHA;
3. set **AWAITING LIVE VALIDATION**.

## Live gate after deployment
Read-only production validation must cover: edit upgrade -> Finalise disabled until latest resolved commit; Finalise -> one Build Your Own result; Base/Upgrades grouped; payment streams/totals exactly once; add-ons not orphaned; Review blocked for unfinished draft; no customer-facing raw IDs. Fresh Request/email mutation still requires Nath's separate explicit authorization.

## Work journey
Deploy/live-validate Upgrade Finalisation -> close remaining representation checks -> final customer UI/UX refinement -> later standalone Build Your Own journey.