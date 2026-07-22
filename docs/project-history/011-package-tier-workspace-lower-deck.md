# Package Tier Workspace Lower Deck and Rate Sheet Row Drawer

## Date

2026-07-23

## Scope

The Tier Workspace Engine on the Admin Station's Packages station gained its lower connected workspace (Details | Connections | Settings), a registered Rate Sheet row drawer with a Package Station-owned mutation command, and three registered creation surfaces. The upper Focus/Grid engine, the Tier drawer, the Admin Station shell, and every Command Centre surface were preserved unchanged.

## Goal

Let the workspace read and edit the focused Tier's Rate Sheet rows — and reach the manager-level creation actions — entirely through the new-station path (authoritative hook → pure projection → registered kit → native identity intent → declarative drawer registration → thin host adapter → host-neutral composition → authoritative mutation owner), recovering the mature Command Centre row-editor behaviour without importing its host machinery.

## What Changed

**Lower deck.** `presentation/package-tier-workspace/TierLowerWorkspace.tsx` is an owned child of the existing `PackageTierWorkspace` orchestrator, beneath the Focus/Grid engine in both view modes. It consumes the same transient focused Family and Tier the engine already resolves — no second selector, no duplicated selection state; the open lower tab and Details filters are local transient state. Underline tabs, compact rows, no card wall.

**Pure projections.** `stations/packageTierWorkspace/rateSheetProjection.ts` holds `projectTierDetails` (the focused Tier's inclusion selections; FAQ selections excluded; selections with unknown provenance stay visible and marked unresolved; the Tier's selected quantity and the sheet row's own quantity are both kept and flagged when different; focused-Family scope is a mark, never a silent filter) and `projectRateSheetConnections` (the one genuine station Rate Sheet — no invented sheet identity — with row/coverage/group/provider, Tier-selected, and Family-applicable projections). The family projection's rows now also carry the connected occupants' resolved selections and one shared station read context, supplied by `usePackageTierWorkspace`.

**Row drawer.** `rate-sheet-row` is a registered `DrawerTemplateKey` (View/Edit). Every Details/Connections row action dispatches the Rate Sheet row's own string `item_id` — never a Tier `occupant_id`, slot id, relationship `source_item_id`, or inclusion `source_id`. The thin adapter `stations/packageTierWorkspace/RateSheetRowDrawerHost.tsx` validates the string identity, resolves exactly one row plus relationship/group provenance, and mounts the host-neutral `entity-drawers/rate-sheet-row/RateSheetRowDrawerContent.tsx` — the recovered mature editor: read-only source option/Service/Category, editable unit price / per / quantity / group through `InlineEditorShell`, dirty-guarded close, saved state without auto-close, wall refresh through the bridge's mutation report.

**Mutation command.** The audit found `fetchServicePackageStation` insufficient for a safe manager save — its service block carries the rate sheet and relationship items but not `sources` or relationship `groups`. The command therefore composes the existing manager authority:

```text
fetchPackageStationManager
→ pure Rate Sheet transformation
→ savePackageStationManager
→ authoritative state refresh
```

`hooks/packageRateSheetRow.ts` owns the pure transforms (patch exactly one row by `item_id`, rejecting missing and duplicated identity; provider-parity validation; singleton sheet initialisation; sheet-group append with the mature editor's id-minting convention; persisted item-decision projection). `usePackageStation` composes them into `updateRateSheetRow`, `initialiseRateSheet`, and `createRateSheetGroup`, resending sources/groups/persisted decisions verbatim, advancing its read model from the authoritative response, and returning typed results (success, row-not-found, duplicate-row, invalid-patch, no-rate-sheet, already-configured, load-failed, save-failed). No new endpoint exists.

**Settings.** Three registered creation flows, each command → host-neutral composition → thin adapter: Package Family creation (the same `createPackageFamily` endpoint authority the mature Command Centre step used), Rate Sheet setup (offered only while unconfigured; a configured sheet shows a passive state, never a duplicate-create button), and Rate Sheet Group creation (offered only once the sheet exists; named explicitly — relationship groups have no surface here and received no action).

**Intent extension.** `StationActionIntent` gained an optional `drawerTemplateKey`, and `StationSurfaceHost` dispatches `intent.drawerTemplateKey ?? binding.drawerTemplateKey` — one declarative seam letting the single tier-tool binding open Tier, row, and creation drawers. Creation intents dispatch the stable `'new'` sentinel, which creation drawers ignore.

## Final Architecture

```text
focused Family + Tier (one transient selection in the kit)
  → lower deck tab → pure rateSheetProjection
    → onIntent(row.item_id | 'new', actionId)
      → binding action intent (per-action drawerTemplateKey)
        → shared drawer controller → registered template
          → thin adapter (identity validation, provenance resolution)
            → host-neutral composition
              → usePackageStation Rate Sheet command → manager endpoint
                → authoritative response advances state → onSaved refreshes the one originating wall
```

## Decisions and Invariants

- The Rate Sheet is the station-owned singleton configuration; no sheet catalogue, no invented sheet id, no sheet-level drawer.
- Row identity is the row's own string `item_id` end to end; no coercion, no fallback row, no Tier-drawer fallback.
- Complete-manager reconstruction lives only in the Package Station command layer — never in presentation, adapters, or compositions.
- Row validation rules match the Package provider's (restated as pure functions, contract-pinned; the Command Centre validator was not imported).
- New-station files import no `components/admin/relations`, `StepContext`, `ActionConfig`, or `DynamicStationManager` (contract-enforced on import statements).
- Tier, Package Family, provider, and manager-endpoint authorities are unchanged; the upper engine and its occupant_id dispatch are untouched.

## Validation

`npx tsc --noEmit` clean; `npm run build` passes; `npm run docs:check` passes. Contracts: new `contract:rate-sheet-row` (pure command) and `contract:rate-sheet-row-drawer` (registration, dispatch resolution, identity handling, forbidden-import scan) pass; `contract:package-tier-workspace` extended (~30 assertions for Details, Connections, and the station-context carry) passes; `contract:tier-occupant-admin`, manager-coordinator, service-catalogue-projection, and tier-pricing-parity pass; all eight PHP test files pass; `git diff --check` clean. The `active-package-read-only-provider` and `package-relation-provider` scripts fail under `npx tsx` with its top-level-await CJS limitation — reproduced identically on the clean tree, pre-existing and unrelated (see 010's runner note). No WordPress browser runtime was available: drawer interaction, lower-deck tab behaviour, and responsive rendering were not exercised in a browser. At this record's creation the milestone exists as an uncommitted working tree (21 modified, 13 new files, one superseded build chunk removed); nothing committed or pushed.

## Deferred Work

- Browser verification of the lower deck and the four new drawers once a WordPress runtime is available.
- A Rate Sheet-level editing surface, only if a real new-station authority for it emerges; Connections stays a read projection with row actions until then.
- A relationship-group action in this workspace, only if a surface for relationship groups is approved here.

## Related History

[010 — Admin Station Drawer Organisation Pass](010-admin-station-drawer-organisation.md) (the shared drawer chrome and rate-sheet label helper this work reuses); [009 — Admin Station: Real Data to Shared Drawer](009-admin-station-presentation-to-drawer.md) (the binding → drawer path this work extends).
