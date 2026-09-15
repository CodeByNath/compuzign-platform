# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production `main`: `d26248b516dd0f2f492074e1c78482f165d73782`
- Deployment: GitHub Actions run #1036 — **Success**

## Phase 1 — Default Tier read view
**LIVE PASSED by Nath — 2026-09-15.**

Accepted behaviour:
- one effective Leg: inclusion name + unit price/per, `QTY` + total, no Leg label;
- multiple effective Legs: one inclusion header, then sequential `Leg 1`, `Leg 2`, etc.;
- each row uses that Leg assignment's own Price Option, quantity and derived line total;
- no merging/summing or duration multiplication;
- existing inclusion editor/save/discard/lifecycle preserved.

Do not reopen Phase 1 without hard evidence.

## Phase 2 — Tier Edition Inclusions
**Verdict: Proceed with safeguards.**

Nath requires the same readable pricing/Leg treatment for **Tier Editions**.

### Current architecture
`tierEditionDetailModel.ts` already resolves each Edition's own `rate_sheet_items` through the authoritative `resolveRateSheetSelection()` rule and already has the Edition's own `rate_sheet_id` and `legs[]`. However, it currently reduces those resolved selections to `{ id, label, missing }`, and `tierEditionInclusionsShell` renders plain `item-collection` chips.

The Default Tier implementation already added the optional priced `item-collection` renderer contract and `buildTierInclusionLegLines()` projection. Reuse that established path where semantically valid; do not build a second pricing/read system.

### Required Edition read view
For each Edition inclusion:

Single effective Leg — no Leg label:
```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

Multiple effective Legs:
```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Rules are identical to accepted Phase 1: sequential read labels only; actual per-Leg Price Option/quantity; truthful unavailable pricing; no summing; no duration multiplication.

### Must preserve
- Edition's own Rate Sheet binding, `rate_sheet_items`, `legs[]`, CZTE/CZTEL identity and lifecycle;
- Edition remains one consolidated backend module;
- `TierEditionEditor` and its existing shared Edit session/tabs;
- parent Default Tier data must never leak into Edition pricing;
- shared `item-collection` plain-chip consumers remain unchanged;
- no endpoint, persistence, backend pricing, identity, or lifecycle changes.

### Builder action
Start from current `main` after confirming branch hygiene. Audit `tierEditionDetailModel.ts`, `bindings/tierEdition.tsx`, the accepted Default implementation, and relevant Tier Edition/Commercial Leg Code Maps before editing.

Implement the smallest reuse of the accepted priced-item projection for Edition Inclusions. Add/update a focused contract proving: Edition uses its own Rate Sheet/selections/legs; single-Leg unlabelled; multi-Leg sequential; per-Leg Price Option/quantity correct; parent values cannot leak; existing Edition Edit session/lifecycle unchanged; ordinary chip consumers unchanged.

Run relevant TypeScript/build/docs/contracts. Push only the topic candidate, record exact SHA/diff/tests here, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.
