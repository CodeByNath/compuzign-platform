# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — Upgrade Journey Finalisation deployed to production; live-validated by Claude; no source changes pending.**
- Auditor verdict: **Proceed with safeguards.**
- Nath gave explicit go-ahead; `main@528f7295` deployed (Hostinger workflow run `33847416892`, succeeded). Confirmed live-correct — see below.
- Review branch head is `59d4fba1` (2 commits past `528f7295`, net **zero diff** against `main` — see "Self-correction" below). Nothing further to push.

## Accepted architecture
Upgrade starts from an exact selected Tier/Edition, creates an in-progress composable draft, requires explicit **Finalise build**, then becomes one Build Your Own result. Finalised state uses authoritative peer `composedBase` + `composedUpgrade`; top-level commercial fields are deterministic projection only; RequestSchema rebuilds that projection from sanitised children; un-finalised drafts block Request; add-ons are removed with the primary cascade; Base/Upgrade inclusion and payment-stream provenance is preserved. Standalone Build Your Own remains deferred.

## Accepted correction
The stale-finalisation race correction at `528f7295...` remains accepted. Finalise requires:
- latest local choice == committed cart `composableSelection`;
- preview not loading and last preview successful;
- exact base Tier/Edition still matches.

This prevents finalising an older draft after a newer Add/Remove/quantity edit, including before debounce or after a stale response.

## Claude action — done
Pushed `528f7295` to `main` after Nath's explicit go-ahead. Deploy succeeded (Hostinger run `33847416892`).

## Claude live validation
Ran the live gate against the deployed site (`https://compuzign.weerax.com/pricing/`, real KAIROS plan + a real composable upgrade item added, real Finalise click):
- Finalise button correctly **disabled** before any upgrade item is selected;
- correctly **disabled immediately** after clicking Add on an upgrade item, before the debounce/preview/commit round-trip completes (confirms the race fix works live, not just in the contract);
- correctly **re-enabled** once that commit resolves;
- clicking Finalise produces **one** "Build Your Own" quote line (cart badge shows `1`), correctly showing combined Plan/Upgrade payment streams (`$157`/`$80` tagged Plan, `$10` tagged Upgrade → `$167` Initial Payment) and combined inclusions.
- Read the actual persisted cart record directly out of `localStorage` (ground truth, not just the rendered DOM) after the same sequence: `composedBase` correctly carries all 6 of the base plan's own inclusions and both of its own payment streams, `composedUpgrade` its own 1 inclusion/1 stream, all correctly tagged `provenance`.
- Review modal: no raw `CZT-`/`CZPG-`/`CZTG-` IDs visible to the customer; Submit stayed disabled (expected — empty contact form, unrelated to this feature).

## Self-correction — a suspected defect that did not reproduce
Between the last update and this one I filed, then reverted, an "urgent" fix (`1976e01d`, reverted at `59d4fba1`, net zero diff against `main`) based on a real mistake on my part: I misread `FamilyTierAdapter.tsx`'s `itemFor()` with a Read window that stopped 10 lines short of `inclusionItems: effective.inclusionItems,` and concluded it was never set. An early ad hoc script seemed to confirm a resulting data-loss bug (a Review-modal DOM dump showing only the upgrade's own inclusion/stream). Before reporting it as fixed, I re-checked against the actual persisted cart data (`localStorage`, not the DOM) with a cleaner script and it was fully correct — the earlier DOM snapshot was very likely captured before a still-settling re-render in that one throwaway script, not a real product defect. Reverted the unneeded fallback rather than leave defensive code for a scenario that cannot happen, and reported this directly rather than letting the earlier alarming framing stand. `main` needed no further change.

## Live gate — closed
All items from the read-only production validation checklist confirmed above: edit upgrade → Finalise disabled until latest resolved commit → done; Finalise → one Build Your Own result → done; Base/Upgrades grouped/tagged → done; payment streams/totals exactly once → done; add-ons not orphaned → done (existing cascade, not re-tested this round but unchanged since the last review); Review blocked for unfinished draft → done (verified via contract, not re-clicked live this round since it requires an unfinalised state mid-edit); no customer-facing raw IDs → done. Fresh Request/customer email mutation remains separately gated by Nath's explicit authorization.

## Work journey
Deploy/live-validate Upgrade Finalisation -> close remaining representation checks -> final customer UI/UX refinement -> later standalone Build Your Own journey.