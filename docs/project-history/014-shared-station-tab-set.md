# Shared Station Tab Set and the Service Home Lower Deck

## Date

2026-07-28

## Scope

Frontend presentation only. The tab behaviour behind Package Home's lower deck was extracted into an Admin Station-owned primitive, Package Home was migrated onto it with no visual or behavioural change, and Service Home gained a Service-owned lower deck whose `Details` lane holds the existing Service Catalogue. No API contract, route, create path, connection model, settings model, drawer, data source, or persistence boundary changed.

## Goal

Give Service Home the same lane structure Package Home already had, without duplicating the Package engine into Service Station. The tab contract existed and was mature; it was simply unreachable, because it lived inside the Package presentation kit and named Tier classes directly.

## What Changed

**The primitive.** `resources/ts/admin-station/presentation/StationTabSet.tsx` owns tab behaviour and accessibility: instance-scoped tab and panel ids, one roving tab stop, Arrow/Home/End movement with automatic activation, disabled tabs the keyboard skips and the pointer cannot activate, and matching `tablist`/`tab`/`tabpanel` relationships. Every panel renders and unselected ones carry `hidden`, so a lane keeps its state while another is shown. It imports nothing but Preact.

**The class contract.** Class names are a per-element `classes` prop that *replaces* the neutral `cz-station-tabset__*` default rather than being appended to it. This is what let Package keep its own skin without the primitive learning what a Tier is, and it is why the migration produced no visual change.

**Package Home.** `TierTabSet.tsx` remains Package-owned and keeps exactly what is Package presentation: the three deck variants (`deck`, `nested`, `selectors`) and the compact selector card's contents. Its CSS was reduced in step — the underlined strip is now the shared skin, and the deck keeps only its inset, framed panel spacing, nested scroller, and selector grid. The Tier lower deck shell, context bar, Connections, and Settings were not touched.

**Service Home.** `resources/ts/service-station/presentation/ServiceLowerDeck.tsx` is Service-owned composition bound at presentation order `1`, beneath the unchanged Package Family card wall at order `0`. It reads the same `service-catalogue` data source, opens the same `service` drawer, and hands `ServiceCatalogue.tsx` the template-kit props unchanged, so the catalogue's hooks, filters, table, pagination, and drawer intent are untouched — it simply renders inside `Details` instead of as a standalone wall. `Connections` and `Settings` are declared lanes carrying one honest sentence each.

## Final Architecture

```text
admin-station/presentation/StationTabSet.tsx     generic tab behaviour
├── package-station .../TierTabSet.tsx           Package deck skin → Tier lower deck
└── service-station .../ServiceLowerDeck.tsx     Service lanes    → Service Home
```

Two genuine consumers with the same semantic responsibility. Nothing else is shared: lane definitions, panel content, deck layout, rows, projections, and models stay with the station that owns them.

## Decisions and Invariants

- The primitive names no station, entity, drawer route, data source, or lane meaning, and carries no station's class names. A station that needs richer tab content supplies it through `renderTab`.
- A station skin replaces the neutral default per element. The `[hidden]` panel reset is the one shared rule that outranks a station skin, because every panel is rendered and only the selected one may show.
- Service Home renders no `cz-tier-*` class and reaches no Package presentation module. Service's existing consumption of Package domain contracts through the public barrel is unchanged and remains the documented peer relationship.
- `Connections` and `Settings` on Service Home are lanes with nothing behind them. No source, projection, drawer route, or model was created for either, and none should be added without the owning Station's decision.
- The Service Catalogue is no longer a surface binding of its own. Composition inside one kit is not a second binding.

## Validation

`npx tsc --noEmit`, `npm run build`, all eleven contract scripts, `php tests/tier-capability-invariants.php`, and `php tests/service-route-baseline.php` (64 routes) pass. `docs:check` reports only a pre-existing stale path in `admin-station-field-system-v1.md`, unrelated to this work.

A new focused contract, `npm run contract:station-tabset`, pins both halves of the boundary and was confirmed to fail when the default lane is moved, when the catalogue is rendered outside `Details`, and when a Tier class is painted into Service Home.

Two verifications beyond the contracts:

- **CSS parity.** The declarations resolving onto all nine Package deck elements across six states were compared before and after the extraction and are identical, so the migration changed no resolved style.
- **Rendered DOM.** Both decks were bundled and rendered into a real DOM. Confirmed: one named tablist, `Details` selected on open, every tab controlling a panel that points back at it, one roving tab stop, one visible panel, the catalogue present exactly once and only inside `Details`, empty states alone in the other two lanes, Arrow/Home/End movement including wrap-around, and no `cz-tier-*` class in Service Home's markup.

Light and dark rendering follows from every value being a `--station-*` token; no browser inspection was performed.

## Deferred Work

Content for Service Home's `Connections` and `Settings` lanes is deliberately undecided and belongs to whichever Station owns the records they would present.

## Related History

[Package Tier Workspace Lower Deck](011-package-tier-workspace-lower-deck.md) introduced the Details/Connections/Settings deck this primitive was extracted from. [Workspace Tab and Section Consolidation](004-workspace-tab-consolidation.md) established those three lane names.
