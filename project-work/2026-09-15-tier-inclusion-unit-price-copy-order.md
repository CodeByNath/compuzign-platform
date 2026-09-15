# Tier Inclusion Unit-Price Copy Order

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Approved candidate: `tier-inclusion-unit-price-copy-order` @ `8d1f0185811e69214c0fd85c29819eef0c5d9226`
- Production `main`: `d7fa41c83bed398c26d4be9e1304cd22ea650265`

## Scope
Presentation-only refinement to the already-live Tier and Tier Edition Inclusions read cards.

Current unit-price copy:

```text
$25.00 Per VM
```

Approved target copy:

```text
Per VM · $25.00
```

This applies wherever the shared Tier/Edition Inclusions read formatter presents a resolved unit price, including the shared header price and per-Leg unit price.

## Reviewer audit — 2026-09-15
**Verdict: Proceed. SOURCE PUSH APPROVED.**

Independent comparison against production `main` confirms the candidate is exactly one commit ahead and changes only:
- `bindings/tier.tsx` — one formatter line;
- `tier-inclusions-readable-pricing-contract.ts` — expectations plus one no-unit case;
- rebuilt `dist/js/admin-station.js`.

The source change is exactly the approved presentation rule:

`lineUnitPrice()` now returns `{per} · {money(unit_price)}` when `per` is present, otherwise the existing money-only value.

Accepted safeguards:
- Default Tier and Tier Edition still share the same `pricedInclusionItems()` / `lineUnitPrice()` path;
- header and per-Leg prices both receive the same copy order;
- totals, quantities, Leg labels/order, Price Option resolution, `Pricing unavailable`, `Not configured`, renderer markup/CSS and persistence are untouched;
- no Edition-specific formatting or duplicate path was introduced;
- no-unit rows remain money-only;
- no backend, endpoint, schema, Rate Sheet, pricing calculation, lifecycle or customer-facing pricing change.

Builder-reported `tsc`, build, docs check, focused contract and related contracts pass; renderer snapshot remains byte-identical. The two previously documented unrelated baseline failures remain unchanged.

## Builder next action
Move **only exact approved candidate `8d1f0185811e69214c0fd85c29819eef0c5d9226`** to `main` through the normal Builder/user workflow and allow normal GitHub Actions deployment. Any new source change invalidates this approval.

After push/deployment, record the exact resulting `main` SHA and workflow evidence here, set **AWAITING LIVE VALIDATION**, then stop.

## Live validation request for Nath
After deployment, verify in WordPress Admin for both a Default Tier and a Tier Edition:
1. resolved header unit price reads `Per VM · $25.00` style;
2. a per-Leg unit price (when Leg prices differ) uses the same order;
3. totals remain money-only and quantities/layout are unchanged;
4. unavailable/not-configured states remain unchanged.

## Builder production push — 2026-09-15 — needs Nath
Approved `8d1f0185` still fast-forwards `main` `d7fa41c8` (verified). Claude Code's auto-mode classifier blocks the Builder from pushing to `main`, so `main` is unchanged and status stays **SOURCE PUSH APPROVED**. Nath runs:

`git fetch origin && git push origin 8d1f0185811e69214c0fd85c29819eef0c5d9226:refs/heads/main`

Once `main` is `8d1f0185` and the deploy has run, the Builder records the `main` SHA and deployment evidence here and sets **AWAITING LIVE VALIDATION**.
