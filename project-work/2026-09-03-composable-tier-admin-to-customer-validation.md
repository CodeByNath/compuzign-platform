# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — production checkpoint is portable to another computer.**
- Auditor verdict: **Proceed with safeguards.**
- Independently confirmed `main@528f7295fcc8e505cb0d064d01fe8e077f228924`.
- Independently confirmed Hostinger workflow `33847416892` completed successfully for that exact `main` SHA.
- Review branch `review/upgrade-journey-finalisation@59d4fba1` is 2 commits ahead of `528f7295` but has **zero file diff** versus `main`; those two commits are a reverted self-correction and must not be cherry-picked as additional product work.

## Accepted architecture
Upgrade starts from an exact selected Tier/Edition, creates an in-progress composable draft, requires explicit **Finalise build**, then becomes one Build Your Own result. Finalised state uses authoritative peer `composedBase` + `composedUpgrade`; top-level commercial fields are deterministic projection only; RequestSchema rebuilds that projection from sanitised children; un-finalised drafts block Request; add-ons are removed with the primary cascade; Base/Upgrade inclusion and payment-stream provenance is preserved. Standalone Build Your Own remains deferred.

## Accepted correction
The stale-finalisation race correction at `528f7295...` is accepted. Finalise requires latest local choice == committed cart `composableSelection`, preview not loading/failed, and exact base Tier/Edition match. This prevents finalising an older draft after a newer edit.

## Production/deployment evidence
- `main`: `528f7295fcc8e505cb0d064d01fe8e077f228924`.
- GitHub Actions / Hostinger: run `33847416892`, workflow **Deploy to Hostinger**, `head_sha=528f7295...`, `status=completed`, `conclusion=success`.
- Claude reports production browser validation of the Upgrade Finalisation path, including Finalise gating, one final Build Your Own result, grouped Plan/Upgrade streams/inclusions, persisted peer snapshots, and no customer-facing raw IDs.
- Auditor has independently verified Git/deployment state but has not yet independently reproduced the browser journey in this cycle; keep live-validation status open until that independent check is available or explicitly deferred.

## Portable-computer checkpoint
This work is safe to continue from another computer now. On the other computer Claude should:
1. fetch/pull `main` and confirm `HEAD=528f7295fcc8e505cb0d064d01fe8e077f228924`;
2. fetch/sync `Project-work-instructions`;
3. read `project-work/AGENTS.md` and this active file before acting;
4. do **not** treat review head `59d4fba1` as unpushed product work — its net diff against `main` is zero;
5. continue from this status only. Any uncommitted local files on the old computer are outside GitHub and are not transferred.

## Remaining gate
Read-only auditor live validation should still cover: edit upgrade -> Finalise disabled until latest resolved commit; Finalise -> one Build Your Own result; Base/Upgrades grouped; payment streams/totals exactly once; add-ons not orphaned; Review blocked for unfinished draft; no customer-facing raw IDs. Fresh Request/customer email mutation still requires Nath's separate explicit authorization.

## Work journey
Independent live validation -> close remaining representation checks -> final customer UI/UX refinement -> later standalone Build Your Own journey.