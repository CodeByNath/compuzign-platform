# CRM-1B — Admin Station read-only Request surface

## Status
- **CLOSED** — live browser validation passed on 2026-08-31.
- Production `main` = `fe5725db3d0be4d8e020504568979797db493010`.
- Deploy run `33316544955` / run #921 = `completed/success`, exact `head_sha=fe5725db3d0be4d8e020504568979797db493010`.
- Final auditor verdict: **Proceed**.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Independent production audit
GitHub `main` was independently confirmed at the approved CRM-1B head `fe5725db3d0be4d8e020504568979797db493010`; no extra source commit was present after approval. GitHub Actions deploy run `33316544955` completed successfully for that exact SHA.

Accepted implementation:
- admin list/detail reads durable `RequestRepository`, not quote transients;
- explicit allow-list projection excludes secret/security plumbing, post IDs and raw meta;
- Requests uses existing Admin Station navigation/list/drawer registries;
- Request drawer is view-only;
- Package `family_tier` items render immutable Family + Tier/Edition identity;
- no catalog re-resolution or TCV recomputation.

## Final live browser validation — 2026-08-31
Read-only validation on deployed Admin Station and signed customer quote:

1. **Requests** destination appears and loads normally — pass.
2. The CRM-1A Request appears as **Pending** with a `CZR...` Platform ID — pass.
3. Opening it uses the normal Request drawer and shows contact, company, email, and the submitted Package Family + Tier/Edition snapshot read-only — pass.
4. No WordPress post ID, meta key, `view_secret_hash`, bearer secret, edit control, or other security plumbing is visible — pass.
5. The signed customer quote opens normally with the expected reference, customer, Package Families, Tier/Edition selections, inclusions, add-on, totals, and legal copy. **Print / Save as PDF** is visible and enabled — pass.

No source correction was requested or made. This work item is closed and must not be reopened; later unrelated work gets a new file.
