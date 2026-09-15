# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production `main`: `d26248b516dd0f2f492074e1c78482f165d73782` (exact approved candidate)
- Deployment: GitHub Actions "Deploy to Hostinger" run #1036 — **Success** (https://github.com/CodeByNath/compuzign-platform/actions/runs/34948806787)
- Base `main`: `cd86c943163db65a42b9c6d4719f023f98527aa2`

## Required outcome
One wrapper per inclusion.

Single effective Leg remains compact and unlabelled:

```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

Multiple effective Legs show the inclusion header once, then sequential read labels:

```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Each row uses that Leg assignment's own resolved Price Option/unit price, quantity and derived line total. Never copy Default values, merge/sum Legs, or multiply by duration.

## Reviewer audit — 2026-09-15
**Verdict: Proceed with safeguards. SOURCE PUSH APPROVED.**

Independent inspection of the pushed correction confirms:
- topic head is exactly `d26248b516dd0f2f492074e1c78482f165d73782`, one correction commit after reviewed `a19c91f4`;
- full candidate is two commits ahead of base `main` and contains the previously reviewed implementation plus the bounded label correction only;
- read projection now labels displayed effective lines sequentially: Default -> `Leg 1`, next matched Additional assignment -> `Leg 2`, etc.;
- single-effective-Leg binding remains unlabelled;
- identity/order still come from existing `legs[]`, `platform_id` / stable `id`, and `leg_platform_id` matching;
- each Additional assignment still resolves its own `price_option_id` and quantity through existing `resolveRateSheetSelection()`;
- Commercial Legs editor vocabulary remains `Leg Default`, `Leg 1…`; no global rename;
- renderer contract, `PoolInclusionsEditor`, save/discard/status/lifecycle, Rate Sheet ownership, backend persistence/endpoints and Editions remain unchanged.

Correction diff is bounded to `tierDetailModel.ts`, the Tier Inclusions contract, renderer fixtures/snapshot and rebuilt `dist/js/admin-station.js`.

Builder-reported rerun: `tsc`, build, docs check, 25 renderer snapshots, Tier Inclusions pricing contract and the listed related contracts all pass. Two failures remain pre-existing and identical on clean `main`: `admin-station-css` stale `cz-rate-sheet-tool__*` classes and `module-state-snapshot.mjs` `requiresParent` crash; they are outside this work.

## Builder next action
Move **only exact approved candidate `d26248b516dd0f2f492074e1c78482f165d73782`** to `main` through the normal Builder workflow and allow normal GitHub Actions deployment. Any source change invalidates this approval and returns the work to reviewer review.

After push/deployment, record the exact resulting `main` SHA and deployment/workflow evidence in this same file, set status to **AWAITING LIVE VALIDATION**, add the live check below, and stop.

## Live validation request for Nath
After deployment, verify in WordPress Admin Tier Inclusions read mode:
1. one effective Leg: inclusion name + unit price/per, `QTY` + total, no Leg label;
2. multiple effective Legs: `Leg 1`, `Leg 2`, etc. sequentially with each row's correct quantity/price result;
3. Edit still opens the existing inclusion editor and normal save/cancel/discard behaviour still works.

## Builder production push — 2026-09-15
- The auto-mode classifier blocked the Builder's own push. Nath then fast-forwarded `main` from `cd86c943` to the exact approved candidate `d26248b516dd0f2f492074e1c78482f165d73782`. The Builder confirmed `origin/main` = `d26248b5` and that there is no source change beyond the approved candidate.
- GitHub Actions "Deploy to Hostinger" run #1036 on head `d26248b5`: completed, **success**.
- Topic branch `tier-inclusions-readable-pricing-legs` was confirmed to be an ancestor of `main`, then deleted locally and on the remote. The repository is back to `main` + `Project-work-instructions`.
- Next: Nath performs the live validation request above; the Reviewer audits the reported result against `main` `d26248b5` + run #1036.
