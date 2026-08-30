# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING LIVE VALIDATION** — deployed production SHA independently confirmed.
- Production `main` = `fe5725db3d0be4d8e020504568979797db493010`.
- Deploy run `33316544955` / run #921 = `completed/success`, exact `head_sha=fe5725db3d0be4d8e020504568979797db493010`.
- Auditor verdict: **Proceed with safeguards** pending live Admin Station validation.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Independent production audit
GitHub `main` was independently read and is exactly the approved CRM-1B head `fe5725db3d0be4d8e020504568979797db493010`; no extra source commit is present after approval.

GitHub Actions deploy run `33316544955` is independently confirmed `completed/success` for that same exact head SHA. The pushed/deployed boundary therefore matches the reviewed source state.

Accepted source behavior remains:
- admin list/detail read durable `RequestRepository`, not `cz_quote_*` transients;
- explicit allow-list projection excludes secret/security plumbing, post IDs and raw meta;
- Requests uses existing Admin Station nav/list/drawer registries;
- Request drawer is view-only;
- Package `family_tier` items render immutable Family + Tier/Edition identity, while legacy Service/Bundle rendering remains unchanged;
- no catalog re-resolution or TCV recomputation.

## Live validation required before closure
Use the deployed Admin Station and confirm:
1. **Requests** destination appears and loads normally.
2. The Request created during CRM-1A validation appears with **Pending** and a `CZR...` Platform ID.
3. Opening it uses the normal Admin Station drawer and shows contact/company/email plus the submitted Package Family + Tier/Edition snapshot read-only.
4. No raw WordPress post ID, meta key, `view_secret_hash`, bearer secret, or other security plumbing is visible.
5. Existing customer quote/view/print flow still behaves normally.

No source change is requested. If live UI differs, report the exact observed mismatch before any correction is authorized.
