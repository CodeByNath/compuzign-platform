# Tier Inclusion Unit-Price Copy Order

## Status
- **CLOSED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`
- Deployment: GitHub Actions run #1038 — **Success**

## Outcome
Presentation-only refinement to the Tier and Tier Edition Inclusions read cards is complete and live-passed by Nath.

Final resolved unit-price copy:

```text
Per VM · $25.00
```

The same shared rule applies to header and per-Leg unit prices; rows without `per` remain money-only.

## Final audit
**Verdict: Proceed — accepted and closed.**

Source, deployment, and live validation agree:
- `main` is exactly `8d1f0185811e69214c0fd85c29819eef0c5d9226`;
- GitHub Actions deploy run #1038 completed successfully on that exact SHA;
- Nath confirmed the live presentation is correct.

Accepted safeguards remain intact:
- Default Tier and Tier Edition share the same `pricedInclusionItems()` / `lineUnitPrice()` presentation path;
- stored `unit_price` and `per`, Rate Sheet ownership, Price Options, Leg identity/order, quantity and totals are unchanged;
- `Pricing unavailable` and `Not configured` states are unchanged;
- renderer markup/CSS, editors, lifecycle, persistence, backend/endpoints and customer-facing pricing behaviour are unchanged.

## Housekeeping
The topic branch `tier-inclusion-unit-price-copy-order` is now fully contained in `main` and may be deleted by the authorized Builder/user. Reviewer does not delete or manipulate branches.
