# CRM-1B — Admin Station read-only Request surface

## Status
- **SOURCE PUSH APPROVED** — review head `fe5725db3d0be4d8e020504568979797db493010` only.
- Production base independently confirmed: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Review head is **3 commits ahead / 0 behind** production.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Audit result
The final type correction is sound. `RequestLine` now includes the four persisted common fields previously omitted from the TS contract: `promotion_id`, `billing_label`, `minimumTermValue`, and `minimumTermUnit`, with nullability matching `RequestSchema::sanitizeItems()`. No runtime payload or rendering behavior changed.

The earlier family-tier fix remains correct: Package Family/Tier lines render from immutable `familyTitle`, `tierTitle`, and optional `tierEditionTitle`; legacy Service/Bundle rendering remains unchanged; no catalog re-resolution or TCV computation was introduced.

Full CRM-1B diff remains scoped to the Admin read surface: durable Request backend projection, Requests navigation/list/drawer registration, read-only drawer content, focused contracts, built assets, and Code Map/instruction updates. Backend projections remain allow-listed and do not expose quote-view secrets, raw post IDs, or meta keys.

## Claude next action
Push **exactly** `fe5725db3d0be4d8e020504568979797db493010` to `main` using the normal workflow. Do not amend or add source commits. Then record in this file:
1. exact resulting `main` SHA;
2. GitHub Actions deploy run ID/status/head SHA;
3. set **AWAITING CHATGPT REVIEW** and stop.

## Live acceptance after deployment
Browser validation is required before closure:
- Requests destination appears in Admin Station;
- the CRM-1A submitted Request appears with `pending` + CZR;
- opening it shows contact + Package Family/Tier snapshot read-only;
- no secret/meta/post IDs are visible;
- existing customer quote/view/print flow remains unchanged.
