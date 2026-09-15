# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewed candidate: `tier-inclusions-readable-pricing-legs` @ `a19c91f477fb5a9a3ee99ea6bab620b0fabde335`
- Base `main`: `cd86c943163db65a42b9c6d4719f023f98527aa2`

## Required outcome
One wrapper per inclusion.

Single effective Leg remains compact and unlabelled:

```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

Multiple effective Legs show the inclusion header once, then repeat only each Leg row:

```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Each row must use that Leg assignment's own resolved Price Option/unit price, quantity and derived line total. Never copy Default values, merge/sum Legs, or multiply by duration.

## Reviewer result — 2026-09-15
**Verdict: Proceed with safeguards.**

Independent review confirms the candidate architecture is sound:
- Default uses the existing resolved selection.
- Additional assignments resolve through existing `resolveRateSheetSelection()` using their own `price_option_id` and quantity.
- Shared `item-collection` extension is additive/optional, preserving existing chip consumers.
- Existing `PoolInclusionsEditor`, save/discard/status/lifecycle, Rate Sheet ownership, endpoints, persistence and Editions behaviour remain unchanged.
- Unresolved pricing remains truthful rather than fabricating `$0`.

### Blocking correction
The candidate currently uses read-view labels `Leg Default`, `Leg 1`, `Leg 2...`. That does not match the approved read presentation.

Change **read-view display labels only** so effective displayed lines are sequential:
- Default effective line -> `Leg 1`
- first Additional Leg -> `Leg 2`
- second Additional Leg -> `Leg 3`
- continue sequentially

Single-effective-Leg inclusions must still show no Leg label.

### Must preserve
- Commercial Legs editor vocabulary: `Leg Default`, `Leg 1...`
- Leg identity, ordering, `leg_platform_id`, draft/stable IDs
- each assignment's own Price Option and quantity
- `resolveRateSheetSelection()` pricing rule
- existing read-card layout and optional shared renderer contract
- `PoolInclusionsEditor`, Save/Cancel/discard/status/notifications
- backend schema/storage/endpoints and Editions behaviour

### Must not substitute
Do not rename Commercial Legs globally, change stored identity, introduce new pricing calculations, recompute duration totals, alter persistence, or broaden this correction beyond the Tier Inclusions read presentation and its contract expectation.

## Builder next action
Keep the existing candidate architecture unchanged. Make only the bounded read-label correction above, update the relevant contract/snapshot expectation if required, rerun the same validation set, push to the **same topic branch**, record the new exact candidate SHA and validation result here, set status to **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.
