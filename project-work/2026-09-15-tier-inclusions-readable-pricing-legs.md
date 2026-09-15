# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Nath explicitly authorised starting this work on 2026-09-15 while the prior Package Home dropdown item remains pending live validation.

## Verdict
**Proceed with safeguards.** This is a read-projection/presentation change only. Current source already carries resolved inclusion `label`, `unit_price`, `per`, `quantity`, and `line_total`; do not change pricing ownership, storage, endpoints, identity, or the existing inline editor.

## Required read view
One wrapper per inclusion.

Single effective commercial leg: keep the compact form with no leg label:

```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

More than one effective leg: show the inclusion header once, then repeat only the leg rows:

```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Use the actual leg-resolved price option/unit price, quantity, and line total for each leg. Never copy Default-Leg values into additional legs, merge/sum legs, or multiply by duration. Follow existing leg ordering/identity. No Commercial Leg editor or lifecycle UI belongs in this read card.

## Architecture boundary
- Start from current `main` and re-read root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/{package-station,tiers,rate-sheet,drawer-system}.md`, relevant architecture contracts, then authoritative source.
- Primary read path: `drawer/tier/tierDetailModel.ts` -> `drawer/schema/bindings/tier.tsx` -> Drawer Kit item-collection renderer.
- Preserve `PoolInclusionsEditor`, its Edit action, `saveTierFeatures`, drafts, status, notifications, discard, Editions behavior, and backend pricing unchanged.
- Existing generic `item-collection` is shared. Do not globally turn all collections into pricing cards. Any contract extension must be additive/optional so existing `{id,label}` consumers render unchanged.
- Reuse already-resolved authoritative selection/leg data. Do not add endpoints, backend schema/storage, a second pricing calculator, or a parallel shell/renderer system.
- Keep unresolved pricing truthful (`Pricing unavailable`/existing equivalent), never `$0` by invention.

## Builder housekeeping
Before source work, the repository branch slot must be available. Confirm the existing `package-home-family-dropdown-visibility` branch is fully contained in `main`; remove it only if the repository hygiene guard permits. Then create/reuse the single topic branch for this work.

## Validation / handoff
Prove: existing non-Tier item collections unchanged; single-leg read has no leg label; multi-leg rows use each leg's actual assignment; unresolved selections remain truthful; Edit/Save/Cancel/discard/status/notifications unchanged; Editions are not conflated with Default; relevant snapshots/contracts, TypeScript, build and docs checks pass.

Push only the topic candidate, record exact remote SHA, changed files, tests/contracts, unresolved risks, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.
