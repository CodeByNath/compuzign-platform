# Service Manager UI and Entity Drawer Integration

## Date

2026-07-15

## Scope

Admin frontend presentation for the Service Catalogue Station Home, shared admin frame, responsive sidebar, and Service/Tier entity drawers. This milestone changed no PHP, REST contract, persistence authority, relation-provider save behavior, entity schema placement, or customer-facing Cost Builder and Quote Builder behavior.

## Goal

Integrate the approved dark Service Manager preview into the real data-driven workstation while preserving the repository-native module and drawer system. Creation needed to move out of the page header and begin in Settings, while entity drawers needed the preview’s compact architecture without scattering Overview fields or replacing module-level inline editing.

## What Changed

- Station Home adopted the preview’s compact identity, status, summary-card, family-card, tab, collection, and responsive treatments using the existing admin tokens and SVG icon registry.
- New Service and New Group were removed from the workstation header and placed in a dedicated Start New section at the beginning of Settings. An empty catalogue now opens on Settings so the first Service can still be created without a compatibility host.
- All Groups and Ungrouped moved above the primary family cards as compact utility scopes. Primary family cards retain their live metrics, lifecycle actions, and Package Category Group filtering behavior.
- `ActionShell` gained optional entity-header metadata: module icon, real entity title, subtitle, status pill, and a right-side Close/Back control. Standard drawers and modals continue using their existing header contract.
- Service and Tier drawer builders now opt into the compact entity header. The visible drawer tab label is Overview while its stable internal placement key remains `details`.
- `EntityDrawer` continues to assemble the Overview body from the existing schema-owned Service and Tier modules. Overview, Included Features, and Common Questions stay grouped in their module cards; Edit still opens the established `InlineEditorShell` and its Save/Cancel flow.
- View-mode Service and Tier footer exits now say Close. Lifecycle, publish, discard, dirty-state, and guarded-exit behavior remain unchanged.
- The application frame is capped and centred at 1920px. Above 1920px the sidebar defaults to its expanded rail; at or below the boundary it defaults to icon-only. The manual toggle remains available, and crossing the boundary restores the intended default.

## Final Architecture

`ServiceCatalogWorkstation` owns Station Home identity, catalogue loading, empty-catalogue startup, and the Settings launch actions. `DynamicStationManager` continues to own the mounted provider workspace, draft-preferred projections, tab state, and manager Save contract. Creation actions open the same first-level drawers as before and do not acquire persistence inside Settings.

`ActionShell` owns outer drawer chrome. An `ActionConfig` may supply entity metadata, but feature-specific data and mutation logic remain outside the generic shell. `EntityDrawer` owns Overview/Connections tab assembly and renders schema placements. `ServiceViewStep` and `ServiceTierStep` retain module bindings, editors, lifecycle actions, persistence calls, confirmations, and dirty-exit protection.

## Decisions and Invariants

- The supplied preview is a presentation reference, not a second data model.
- Station Home remains mounted behind every focused first-level drawer.
- New Service and New Group begin in manager Settings, not in an entity drawer.
- Overview content is module-based; fields are not flattened into a generic form.
- View is the default. Inputs appear only after the module Edit action opens its inline editor.
- The internal `details` placement key remains stable even though users see Overview.
- Service persistence remains Service-owned; Package and relation persistence remain provider-owned.
- Drawers do not nest, and the generic drawer shell does not acquire feature persistence.
- The 1920px frame and responsive sidebar default are shell concerns and apply consistently across admin workstations.

## Validation

Validation passed with strict TypeScript compilation, 22 byte-identical mode-renderer snapshot cases, a production Vite build, and `git diff --check`. The build was directed to a temporary output directory, so tracked generated `dist` assets were not modified. A final working-tree review confirmed that only source, Code Map, local instruction metadata, and this milestone record changed. The local environment has no hosted WordPress browser runtime, so visual verification was structural and build-based.

## Deferred Work

- Hosted WordPress visual review remains appropriate for final pixel-level confirmation across real catalogue sizes and browsers.
- A Service-specific entity Settings tab was not introduced; doing so requires approved settings ownership and non-empty authoritative content.
- The previously deferred top station-navigation migration remains outside this milestone; the existing left navigation was intentionally retained.

## Related History

- [Service Station Home Redesign](006-service-station-home-redesign.md)
- [Your Service Manager — Dashboard and Drawer Architecture Correction](005-your-service-manager-correction.md)
- [Family-First Workspace](003-family-first-workspace.md)
