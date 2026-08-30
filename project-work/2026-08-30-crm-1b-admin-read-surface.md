# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING CHATGPT REVIEW** — pushed to `main` exactly as approved.
- `main` now at `fe5725db3d0be4d8e020504568979797db493010` (clean fast-forward from `08befad0`, no amend, no added commits).
- GitHub Actions `deploy` run [`33316544955`](https://github.com/CodeByNath/compuzign-platform/actions/runs/33316544955/job/99270935325): **success**, head SHA `fe5725db3d0be4d8e020504568979797db493010`.
- Auditor verdict (prior round): **Proceed with safeguards**.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Audit result
The final type correction is sound. `RequestLine` now includes the four persisted common fields previously omitted from the TS contract: `promotion_id`, `billing_label`, `minimumTermValue`, and `minimumTermUnit`, with nullability matching `RequestSchema::sanitizeItems()`. No runtime payload or rendering behavior changed.

The earlier family-tier fix remains correct: Package Family/Tier lines render from immutable `familyTitle`, `tierTitle`, and optional `tierEditionTitle`; legacy Service/Bundle rendering remains unchanged; no catalog re-resolution or TCV computation was introduced.

Full CRM-1B diff remains scoped to the Admin read surface: durable Request backend projection, Requests navigation/list/drawer registration, read-only drawer content, focused contracts, built assets, and Code Map/instruction updates. Backend projections remain allow-listed and do not expose quote-view secrets, raw post IDs, or meta keys.

## Live acceptance after deployment
Deployed; browser validation is still required before closure:
- Requests destination appears in Admin Station;
- the CRM-1A submitted Request appears with `pending` + CZR;
- opening it shows contact + Package Family/Tier snapshot read-only;
- no secret/meta/post IDs are visible;
- existing customer quote/view/print flow remains unchanged.
