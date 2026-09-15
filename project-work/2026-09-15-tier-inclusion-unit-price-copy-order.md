# Tier Inclusion Unit-Price Copy Order

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
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

This applies wherever the shared Tier/Edition Inclusions read formatter presents a resolved unit price, including:
- the shared header price when all effective Legs use the same unit price;
- the per-Leg unit price when effective Legs use different prices.

No other card structure changes.

## Audit finding
**Verdict: Proceed.**

The current authoritative path is the shared `lineUnitPrice()` formatter in `resources/ts/package-station/drawer/schema/bindings/tier.tsx`, already consumed by both Default Tier and Tier Edition priced inclusion cards through `pricedInclusionItems()`.

This should remain one shared presentation rule. Do not introduce Edition-specific formatting or duplicate renderer logic.

## Must preserve
- stored `unit_price` and `per` values;
- Rate Sheet ownership and unit vocabulary;
- all Price Option resolution;
- Leg identity, ordering, quantity and totals;
- single-Leg/multi-Leg layout and labels;
- `Pricing unavailable` and `Not configured` states;
- Default Tier and Edition editors/lifecycle;
- customer-facing pricing behaviour outside this admin read presentation.

## Required implementation
For a resolved line with a non-empty `per`, format exactly:

`{per} · {money(unit_price)}`

Examples:
- `Per VM · $25.00`
- `Per user · $12.00`
- `Per GB · $8.00`

If `per` is absent, keep the existing money-only output.

Do not alter total display (`$25.00`), quantity display, unavailable/not-configured copy, CSS layout, persistence, backend, endpoints, or pricing calculations.

Update only the relevant contract/snapshot expectations for this shared presentation copy. Verify both Default Tier and Edition cases use the new order and existing unrelated item-collection consumers remain unchanged.

## Builder handoff
Confirm branch hygiene, create/reuse the single topic branch from current `main`, implement this bounded change, run focused contract/snapshot plus TypeScript/build/docs checks as appropriate, push only the topic candidate, record exact SHA/diff/validation here, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.
