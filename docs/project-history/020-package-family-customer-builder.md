# Package Family Customer Builder

## Date

2026-08-11

## Scope

This milestone added the customer-facing Package Family builder, its direct public Family projection, shared-cart compatibility, Request Flow and proposal rendering, focused regression contracts, current-state documentation, and rebuilt customer assets. It introduced the additive `[compuzign_package_builder]` shortcode while preserving `[compuzign_cost_builder]`. It did not change Package Family, Tier Instance, Tier occupant, Tier Edition, Tier Add-on, Rate Sheet, or Platform Identifier ownership; expose an admin Package Station endpoint; or create another pricing, cart, request, or proposal system.

## Goal

Expose a Package Family's commercial offer directly to customers through the Tier system explicitly assigned to that Family. The customer path had to respect the established Package architecture rather than recover the offer through a contributing Service, reuse the mature Tier renderer and downstream quote systems, and preserve real commercial identity without inventing a Service anchor or fake `serviceId`.

## What Changed

The implementation landed in eight ordered commits:

| Phase | Outcome | Commit |
| --- | --- | --- |
| 1 | Locked existing Cost Builder and Service-rooted cart compatibility | `44e8034` |
| 2 | Extracted the shared Tier Instance customer compiler | `6c5bc48` |
| 3 | Added the direct Family-to-Tier-Instance public projection | `fea5d7b` |
| 4 | Added the discriminated Family Tier cart identity contract | `98bfa41` |
| 5 | Added `[compuzign_package_builder]` and its customer surface | `03699c9` |
| 6 | Added presentation-only compiled full-build detail | `c356fcd` |
| 7 | Extended the existing Request Flow and proposal for Family lines | `c442564` |
| 8 | Updated documentation, rebuilt assets, and completed validation | `fdce4f1` |

`PackageRepository::findAllActiveFamiliesForCostBuilder()` now enumerates active Families, follows each explicit `package_family` assignment to its active and ready Tier Instance, and passes that Tier-system container to the same Rate Sheet-backed compiler used by the established public projection. `PackageFamilyPricingBuilder` narrows the result for the read-only public `/package-builder` route. The frontend selects a Family and adapts its compiled occupants into the existing `PricingTiers`; Edition switching, Tier Add-on selection, compiled inclusions, totals, persistence, review, proposal, and notification continue through established components and utilities.

Family quote lines are discriminated as `family_tier`. Native Family, Tier Instance, and occupant IDs remain available for backend logic, while their existing `CZPG`, `CZTG`, `CZT`/`CZTA`, and selected `CZTE` Platform IDs travel alongside as printable commercial identifiers. No numeric or synthetic Service identity is created.

## Final Architecture

```text
Package Family
    → explicit package_family assignment
    → Tier Instance / Tier Workspace Engine
    → compiled active Tier occupants
    → existing Rate Sheet-backed pricing
    → existing PricingTiers
    → shared quote/cart
    → existing Request Flow / proposal
```

Package Family is the commercial scope and assignment consumer. Tier Instance / Tier Workspace Engine is the Tier-system container or holder. A Tier occupant is an individual plan or add-on inside that container. A Tier Edition is a child commercial declaration beneath an occupant. Services remain upstream inclusion sources and do not become the Family customer path, commercial owner, or quote identity.

## Decisions and Invariants

- Family customer resolution follows the explicit assignment directly and never calls `resolveInstanceForService()`.
- The existing Rate Sheet projection remains the only pricing authority; no Tier price is recomputed or decomposed into Service-priced lines.
- `PricingTiers` remains the customer Tier renderer. Its Edition and Add-on behavior is reused rather than rebuilt.
- Full-build detail presents only already-compiled effective inclusion labels and performs no query or pricing work.
- The shared cart, Request Flow, Order Summary, proposal, and notification systems accept the additive Family line; no parallel downstream system exists.
- Family lines use real native and Platform identity and never use a fake `serviceId` or arbitrary covered Service.
- The existing `[compuzign_cost_builder]` shortcode and Service-rooted public response remain compatible.
- The public Package builder is a narrow read-only route. No admin Package Station endpoint was made anonymous.

## Validation

Focused PHP contracts passed for active Package relationships, Tier capability invariants, direct Tier Instance public projection, Tier Add-on projection, Rate Sheet pricing parity, Tier Edition projection, request sanitization, minimum terms, and Family notification output. Existing Cost Builder isolation, quote-cart Add-on, Tier Add-on, and Tier Edition contracts passed alongside the new Package builder regression-lock, direct-flow, Family-cart, and Family Request Flow contracts. Platform identity schema validation passed across 449 frontend, contract, and documentation files. `npx tsc --noEmit`, the production Vite build, documentation validation, and whitespace checks passed. The eight commits were pushed to `main`, and live browser validation subsequently succeeded for the core Package Family customer flow.

## Deferred Work

Customer UI refinement is still required. This is presentation and layout follow-up for the Package Family customer surface, not an incomplete architecture or failed commercial/runtime implementation. The validated assignment, compilation, pricing, cart, request, and proposal path remains the completed baseline. No UI corrections are included in this history task.

## Related History

[013 — Package Capability Assignments and Tier Instance Migration](013-tier-capability-assignments.md), [015 — Tier Add-on Selection](015-tier-addon-selection.md), and [Package Category Groups v1 — Package-Owned Commercial Buckets](PackageCategoryGroups-v1.md).
