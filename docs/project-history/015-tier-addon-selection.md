# Tier Add-on Selection

## Date

2026-07-31

## Scope

This milestone added the ability for a customer to select one normal Tier plus zero or more add-on Tiers from the same Tier System. It covered the occupant schema and lifecycle, the admin Overview editor, the public Cost Builder projection, the customer selection UI, quote cart identity, request summary/proposal/payload classification, mounted-behaviour and end-to-end regression coverage, and current-state documentation. It did not introduce any new occupant collection, compatibility relationship, or commercial identity system.

## Goal

Let an admin mark a Tier Occupant as an add-on so customers can attach it to their chosen normal Tier within the same Tier System, while leaving every other proven Tier behaviour — the five fixed shells, occupant identity, lifecycle, Overview/Inclusions/FAQs, Rate Sheet pricing, and bin travel — unchanged and every existing occupant defaulting to non-add-on.

## What Changed

The approved implementation landed in eight ordered phases:

| Phase | Outcome | Commit |
| --- | --- | --- |
| 1 | Occupant-level `is_addon` schema and lifecycle | `5270e52` |
| 2 | TypeScript contracts and admin Overview editor switch | `49e8154` |
| 3 | `is_addon` carried into the public Cost Builder projection | `4cd4801` |
| 4–5 | Customer Tier + add-on selection UI and cart-key correction | `1a8321a` |
| 6 | Add-on classification in request summary, proposal, and payload | `f59f932` |
| 7 | Mounted-behaviour and end-to-end regression contracts | `ae55682` |
| 8 | Tier Add-on Selection Code Map | `1349f91` |

Phases 4 and 5 landed as one commit: the customer-facing add-on toggle cannot behave correctly until the quote cart can hold more than one line per Service, so the UI split and the cart-key fix were inseparable in practice.

A compatibility ledger, a second occupant collection, a sixth Tier shell, Service ownership of add-ons, synthetic negative Service IDs for this feature, and a new commercial identity system were all considered and rejected as unnecessary: same-Tier-System compatibility is implicit, so no relationship record was needed beyond the boolean itself.

## Final Architecture

```text
Tier Occupant (current_occupant)
  is_addon: bool  (default false)
        ↓ PackageSchema lifecycle (draft/save/settle/revert, archive/restore/swap/retarget)
        ↓ PricingBuilder public projection (PricingTierData.is_addon)
Cost Builder customer selection
  one normal Tier per Service (selectedTierId)
  zero or more add-on Tiers per Service (selectedAddonTierIds)
        ↓ quote.ts cart-identity helpers
QuoteItem.isAddon
  quoteItemKey = serviceId:primary | serviceId:addon:tierId
        ↓ classifyQuoteItems
Order Summary / Quote Proposal / Request payload
  mainItems | bundleItems (legacy) | tierAddonItems
```

`is_addon` is a plain boolean on the existing travelling Tier Occupant record; it carries through every lifecycle and bin-travel transition exactly as the occupant's other fields do, with no new identity, address, or storage envelope. Add-on compatibility with the customer's chosen normal Tier is implicit from membership in the same Tier System — no ledger or edge record represents it.

In the Cost Builder cart, `quoteItemKey` gives each line a unique identity: a normal-Tier line is keyed by Service alone, an add-on line by Service plus Tier. `replaceNormalQuoteItem` swaps only the normal line for a Service, leaving its add-ons in place; `upsertAddonQuoteItem` / `removeAddonQuoteItem` manage add-ons independently of each other; `removeServiceQuoteItems` removes a Service's normal Tier and all its add-ons together, since an add-on has nothing to attach to once its normal Tier is gone.

The legacy `RecommendedBundle` mechanism — a synthetic negative Service ID — was left behaviourally unmodified. It now carries an explicit `isAddon: false` field and is classified into `bundleItems`, never `tierAddonItems`, so the two mechanisms coexist without merging or key collision.

## Decisions and Invariants

- Every occupant defaults to `is_addon: false`; the feature is purely additive and backward-compatible.
- Add-on compatibility is implicit within one Tier System; no compatibility ledger or cross-Tier-System resolution exists.
- The five fixed Tier shells, `occ_…` occupant identity, and existing draft/save/settle/revert and archive/restore/swap/retarget lifecycles are unchanged by this feature.
- Overview, Inclusions, FAQs, and Rate Sheet pricing behaviour are unchanged; `is_addon` does not affect Rate Sheet binding or clear-on-switch.
- A quote line's identity is `serviceId` plus, for add-ons, `tierId`; normal-Tier replacement is scoped to the normal line only.
- Whole-Service removal cascades to that Service's add-ons.
- `RecommendedBundle` retains sole use of the negative-Service-ID mechanism and is explicitly typed and classified apart from real Tier add-ons, not merged with them.
- No new REST endpoint, database table, or WordPress option key was introduced.

## Validation

All PHP tests in `tests/*.php` passed, including four new files (`tier-occupant-is-addon.php`, `tier-public-projection-is-addon.php`, `tier-addon-end-to-end.php`, `request-schema-is-addon.php`) and the extended `tier-instance-public-projection.php`. All registered `npm run contract:*` scripts passed, including three new ones (`contract:tier-overview-is-addon`, `contract:quote-cart-addon`, `contract:tier-addon-flow`). `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` passed after every phase. The pre-existing DOM-mounted regression suites (`regression:tier-system-footer-loop`, `regression:service-create`, `regression:category-create`) passed unchanged, confirming no interference with unrelated subsystems. A final diff audit confirmed no remaining negative-Service-ID usage outside the legacy bundle path, no duplicate CSS or new hardcoded colors, no lost occupant fields, no orphaned build artifacts, and a clean working tree.

## Deferred Work

`HomeConfigurator.tsx`, a separate homepage widget sharing the same localStorage cart, does not distinguish an addon-only cart presence from a normal-Tier presence in its "already in quote" indicator. This is out of scope for Tier-level granularity in that widget and causes no data loss or crash; a future milestone may extend it if the homepage widget needs the same granularity as the Cost Builder.

## Related History

[013 — Package Capability Assignments and Tier Instance Migration](013-tier-capability-assignments.md).
