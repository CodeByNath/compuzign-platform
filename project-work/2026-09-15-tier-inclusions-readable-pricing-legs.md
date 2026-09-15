# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **SOURCE PUSH APPROVED** — Phase 2
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Approved candidate: `tier-inclusions-readable-pricing-legs` @ `d7fa41c83bed398c26d4be9e1304cd22ea650265`
- Production `main`: `d26248b516dd0f2f492074e1c78482f165d73782`

## Phase 1 — Default Tier
**LIVE PASSED by Nath — 2026-09-15.** Do not reopen without hard evidence.

## Phase 2 — Tier Edition Inclusions
**Verdict: Proceed with safeguards. SOURCE PUSH APPROVED.**

### Independent review result
The corrected candidate is two commits ahead of production `main`; the correction commit is bounded to `tierEditionDetailModel.ts`, the focused Tier Inclusions contract, and rebuilt `dist/js/admin-station.js`.

The Phase 2 implementation is accepted because:
- Edition Inclusions reuse the accepted Phase 1 priced-read path rather than creating a second renderer/pricing system;
- `buildTierEditionDetail()` supplies the Edition's own `rate_sheet_id`, resolved `rate_sheet_items`, and `edition.legs` to the existing Leg-line projector;
- single effective Leg remains compact and unlabelled; multiple effective lines are sequential `Leg 1`, `Leg 2...`;
- each Additional Leg still resolves its own Price Option and quantity; parent `CZTL`/Rate Sheet values do not drive Edition pricing;
- unresolved selected rows now remain visible with the existing fallback label and `Pricing unavailable` rather than silently disappearing;
- known FAQ rows remain excluded, including Manager items retained as `missing` (their `source_type: 'faq'` remains authoritative); Bundle rows remain included and priced from their own Rate Sheet row;
- Edition's consolidated module, `TierEditionEditor`, Edit routing, CZTE/CZTEL identity, lifecycle, persistence, endpoints, backend pricing and ordinary chip consumers remain unchanged.

The candidate contract now covers unresolved visibility, unavailable pricing, Bundle retention, FAQ exclusion, parent-leak protection, single/multi-Leg behavior and the existing Edition Edit/lifecycle boundary. Builder-reported TypeScript/build/docs/snapshot and related contracts pass; the two previously recorded unrelated failures remain unchanged on `main`.

## Builder next action
Move **only exact approved candidate `d7fa41c83bed398c26d4be9e1304cd22ea650265`** to `main` through the normal Builder workflow and let the normal GitHub Actions deployment run. Any source change invalidates this approval and returns Phase 2 to reviewer review.

After production push/deployment, record the exact resulting `main` SHA and workflow/deployment evidence here, set **AWAITING LIVE VALIDATION**, add the live request below, and stop.

## Live validation request for Nath
After deployment, validate an actual Tier Edition in WordPress Admin:
1. single effective Leg: inclusion label + unit price/per, `QTY` + total, no Leg label;
2. multiple effective Legs: sequential `Leg 1`, `Leg 2...`, with each row's own quantity/price result;
3. Edition values differ from the parent Default Tier and remain Edition-owned;
4. unresolved/stale Edition inclusion remains visible as `Pricing unavailable` rather than disappearing;
5. Edit still opens the existing Edition shared editor on Inclusions and normal save/cancel/lifecycle behavior remains intact.

## Phase 2 Builder production push — 2026-09-15 — needs Nath
The approved `d7fa41c8` still fast-forwards `main` `d26248b5` (verified). Claude Code's auto-mode classifier blocks the Builder from pushing to `main` (`[Merge Without Review]`, as in Phase 1), so `main` is unchanged and status stays **SOURCE PUSH APPROVED**. Nath runs:

`git fetch origin && git push origin d7fa41c83bed398c26d4be9e1304cd22ea650265:refs/heads/main`

Once `main` is `d7fa41c8` and the deploy has run, the Builder records the `main` SHA and deployment evidence here, sets **AWAITING LIVE VALIDATION**, and deletes the topic branch.
