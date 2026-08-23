# Package Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

**Lifecycle status:** Package Station is partially conforming to the locked
[Station and Drawer Lifecycle Contract](../../../../../../docs/architecture/StationDrawerLifecycleContract-v1.md).
Package Family, Tier occupant, and Tier Add-on conform. Tier Group / Tier
System, Rate Sheet, Promotion, and the remaining Package surfaces retain their
source-specific inventory. Do not copy those differences into a new Station.

Package Family's complete Overview Save creates the persisted Pending Family and
keeps the returned `group_id`/`CZPG` identity in the same mounted drawer;
Publish never creates. Explicit Disable/Enable uses the shared mask. Do not
extend those claims to Tier Group / Tier System, Rate Sheet, Promotion, or
capabilities. Tier occupant and Tier Add-on separately conform: first Overview
Save creates the durable Pending occupant and hands `occupant_id` into the same
mounted drawer; Publish settles/activates and assigns `CZT`, plus `CZTA` for an
Add-on. Add-on remains the same occupant with `is_addon = true`, never a second
drawer, lifecycle, controller, footer, or endpoint family.
Backend canonical reads now cover Package Family, Tier Group, Tier, Tier
Add-on, Rate Sheet, Rate Sheet Group, and Rate Sheet Item. Row identity is
output-only and uses `(rate_sheet_id,item_id)`, never mutable `group_id`. A
Rate Sheet Item row may additionally carry `price_options[]` — zero or more
alternative unit prices, each a further-qualified Platform-identified child
of that row (`(rate_sheet_id,item_id,option_id)`, own `CZPRCIO`, minted
write-path-only in `PackageManagerSchema::commitConfiguration`, never from
its editable `label`). A price option is **not** a second row, not
Rate-Sheet-wide, and never carries quantity/billing-cycle/minimum-commitment/
Edition meaning — the row's own existing default `unit_price`/`CZPRCI` stays
completely untouched by a price option's presence. In the standalone Rate
Sheet drawer's active-row editor, the Unit Price cell itself becomes a
`[ Default Price ][ Option 1 ]…[+]` tab strip
(`RateSheetUnitPriceOptionEditor` in `presentation/rate-sheet-tool/rateSheetParts.tsx`)
riding the row's own existing Edit/Save/Cancel lock — no new drawer,
endpoint, lock, or permanent grid column. That tab strip is Edit-only: a
LOCKED row's Unit Price cell (`RateSheetRowReadCells`) stays read-only
presentation — zero Price Options keeps the plain value unchanged, and
one-or-more render a static `Price Options` list (Default plus each option,
`RateSheetPriceOptionsSummary`) in the same cell, never the selectable
chips/tabs. The Default Price tab's own NAME is editable admin configuration
(`default_price_label` on the row — a Bundle-backed row's own included, since
a Bundle carries no price fields of its own): the
Default tab offers a name field beside the price it already has, blank
inherits the built-in "Default Price" through `defaultPriceLabel()`
(`rateSheetLabels.ts` — the one rule the tab strip, the locked-row summary,
and the Tier's own price selector all read), and it rides the same row lock
and full-manager save. It is display only: no `option_id`, no Platform ID, no
`price_options[]` entry, and a Tier still selects that price by carrying no
`price_option_id`. Native mutations retain their
existing Package addresses. Tier Group and Tier use the shared supported-action
footer with controller-supplied actions; no status label may invent an action.
Tier Add-on remains the same occupant's boolean role and optional dormant
secondary identity. Promotion is unchanged and deferred. The occupant's own
existing declaration (Rate Sheet binding, inclusions, price, billing cycle)
is the permanent Default — it is not a `tier_editions[]` entry and never
receives `CZTE`. An occupant may additionally carry `tier_editions[]` —
independently addressed, independently lifecycled ALTERNATE declarations,
each with its own `CZTE` and its own `StationLifecycle` state (reusing the
shared engine, not a second lifecycle system). Not a `TIER_MODULES` entry,
not another Tier, not a second Add-on system. See [Tier Edition](../../../../../../docs/code-map/tier-edition.md).

## Ownership and entry points

`resources/ts/package-station/` is the top-level Package peer's data, surface, presentation, and drawer boundary: it owns Package TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the Tier workspace presentation kit, and Package Family/Tier drawer composition. It is not part of the Admin Station host, and other peers consume Package only through `index.ts`.

- `types.ts` — Package contracts. `PackageFamilyItem.platform_id` is output-only;
  native `group_id` remains the mutation identity. Shared pool and Cost Builder contracts remain in `api/types/`; `PromotionTier` remains Promotion-owned in `api/types/admin.ts` and is imported type-only solely to preserve the existing `SurfacePackageSummary` contract.
- `api.ts` — the single implementation of Package-owned endpoint calls.
- `usePackageStation.ts`, `usePackageFamilyStation.ts`, and `useSurfacePackages.ts` — Package and Package Family state, mutations, and surface reads.
- `tierOccupants.ts`, `rateSheetLabels.ts`, and `evaluateTierPricing.ts` — Package-owned pure projections, labels, and pricing evaluation.
- `surface/packageFamily/`, `surface/tierInstance/`, `surface/tierSurface/`, `surface/packageTierWorkspace/`, and `surface/rateSheetTool/` — Package Family adapters; Tier instance/assignment state and pure models; exact Family-assignment workspace resolution, fixed-slot/Rate-Sheet inventory projections and instance-scoped drawer adapters; and the Rate Sheet tool controller plus `useTierRateSheetDrawer`, which scopes that controller to one Tier's connection without adding a reader, editor, or endpoint. `surface/tierSurface/useTierEditions.ts` is a focused hook (deliberately not folded into `usePackageStation.ts`) owning Tier Edition's eleven endpoints (create, module draft/settle/revert, the one status-transition endpoint, restore, guarded delete, plus Phase 6's `moveToBin`/`restoreFromBin`/`trashBinEntry`/`deleteBinEntry` — no default-Edition endpoint; the occupant's own declaration is the permanent Default and needs none) and Edition-scoped local state, including the occupant's own `tier_edition_bin[]`. Its `editions` array stays raw (settled fields only, for existence/id/ordering checks); `editionView(editionId)` (`tierEditionModel.ts`'s `draftPreferredEdition`) is the read-model accessor every content display/re-edit must go through instead — the exact `pkg.tierView(tierId)` role `usePackageStation.draftPreferredDetail()` already plays for the occupant, so a just-Saved (not yet Published) Edition draft displays immediately rather than the stale settled row (StationDrawerLifecycleContract-v1.md §7's "draft-preferred module data" requirement — previously missing for Edition; `buildTierEditionDetail`/`draftFromTierEdition`/`tierEditionModuleState`/the chip-strip labels/the pinned footer's `selectedEdition` all now read through it, never a raw `.editions.find()` for display). The Edition bin is deliberately decoupled from the status-transition endpoint: an Edition must already be archived/trashed before `moveToBin` will relocate it out of `tier_editions[]`, and restoring always appends to the end of the active list — no swap/retarget mode exists because display numbering is derived from array order, never a stored position. Pool creation has no surface adapter: Families, Rate Sheets and the groups a sheet stores are created by the drawers that already own those writes, and the workspace only re-reads them through the `refetch` it hands the drawer host at dispatch.
- `presentation/package-tier-workspace/` owns the accessible lower-deck tabs, accordion, and shared connected-record rows. Settings has Family Group, Tier Group, and Rate Sheet sections. Rate Sheets lists standalone sheets through the shared row, defaults to the focused Tier Group's canonical access policy, and provides name/Platform-ID search, Tier Group context, active-view status filtering, and `+ Rate Sheet`. Stored rows use the already-loaded native key behind their visible `CZPRC`, with no second read. `presentation/rate-sheet-tool/` keeps one controller/save engine but distinct collection and focused presentations. A FOCUSED sheet is a drawer group screen (`FocusedRateSheetGroups` in `RateSheetTool.tsx`), composed exactly the way `TierDrawerContent.tsx` composes the Tier drawer's own groups: one `.cz-req-detail` root, one `DrawerGroup[]` array, and either shared renderer (`DrawerGroupTabs` / `DrawerGroupAccordion`) over it, with the view toggle and `+ Bundle` in the nav's `trailing` slot. Two groups, in the Tier's own vocabulary — **Details** (the sheet itself: name, status, `CZPRC`, and its own priced rows) and **Options** (its Bundles). There is no Bin: Rate Sheets have no bin lifecycle. BOTH groups open readable through `ReadBlock`/`ModuleStatusPill` — Details' summary-only overview card, Options' selected-Bundle card — and only a card's own Edit opens the inline editor, as a focused task (`InlineEditorShell` over `FocusedTaskShell`) that suppresses the group chrome through `.cz-req-detail--editing` in CSS, never by unmounting the group renderers. Details' editor mounts one sheet table with that sheet's own "+ Add Service" picker and Group/Per management inside row dropdowns; Options' editor mounts the selected Bundle's workspace. "+ Add Service" (`RateSheetServiceImportPicker.tsx`) replaced the former two-step "Add Source Service" + "Add Row" pickers with one 3-column browse (category chips filter Service chips; a selected Service's own inclusions load as multi-select chips, connecting that Service immediately if it wasn't already a source — the Rate Sheet read model only ever resolves a Service's inclusions once it is connected, so there is no way to preview them otherwise) that stages picks into a local, purely client-side editable list with no request until its own Publish appends every staged entry as a curated row (`addEditorRows` in `rateSheetToolModel.ts`) and saves once through `controller.publishRows` — the SAME full-manager save every other Rate Sheet mutation already uses, never a second save path or endpoint. The Options group's own content is `RateSheetBundleSwitcher` — the shared
`ChildChipStrip` reading each Bundle's own linked row's `label` (every chip it
can show already names a fully-saved Bundle — there is no mid-authoring
chip), a proper empty state when the sheet has none, and the selected
Bundle's readable module card, whose Edit opens `RateSheetBundleWorkspace.tsx`.
`+ Bundle` is NOT on that strip: it lives in the drawer nav's `trailing` slot
beside the view toggle, gated on Options being the active group, the same
place `+ Edition` lives in the Tier drawer, and calls `beginBundleAuthoring()`
AND `onEdit()` together — opening the inline editor DIRECTLY, with NO
intermediate chip or card click and NO precreated placeholder Bundle or row:
nothing is minted until the Bundle's own first Import actually succeeds. The
switcher's own editing-mode branch checks the controller's `authoringBundle`
FIRST and renders `RateSheetBundleImportPicker` alone (`bundle={null}`) in
that state; otherwise the selected Bundle's own workspace, or an empty
message once a Bundle is deleted mid-edit. The active group, the
Tabs/Accordion view mode, `selectedBundleKey`, and `authoringBundle` all live
in `useRateSheetTool`, not in the switcher, so a refetch/remount never resets
them. A Bundle is commercially a REAL Rate Sheet row: `useRateSheetTool` keeps
its own commercial row (`item_id`, linked, never its own copy of
price/per/qty/group/Price Options) as a member of the SAME flat `items[]`
list every ordinary row lives in — there is no second, Bundle-scoped row list
and no scope-routed mutation seam left to maintain, because a row's own key
already says which one, ordinary or Bundle-backed, regardless of which group
is active. `RateSheetBundleWorkspace.tsx` mounts ONLY for an already-created
Bundle (the switcher renders the picker directly for the still-authoring
case, never this component) and IS the Rate Sheet row editor: the SAME
`RateSheetGridEditor` over the Bundle's own row (found by `findBundleRow()` —
never synthesized) with `lockCommands={controller}`, so it opens LOCKED and
unlocks through the SAME one-row-at-a-time Edit/Save/Cancel/Remove (Delete
once saved) lock, the same Price Options tab strip, the same Per/Group
dropdowns and quantity input. Its `commands` is simply the controller's own
generic row commands (`{...controller, removeRow: () =>
controller.deleteBundle(bundleKey)}` — the one override, in practice
unreachable since the grid is always locked here and Remove goes through
`lockCommands` instead, which carries the identical rule);
`nameLabel="Product Bundle"` (additive on `RateSheetGridEditor`, defaulted to
`Supplied content`, so every existing caller is unchanged) names the first
column, because for that row the cell is the combination's own name. The ONE
existing lock covers it with no Bundle-specific branch beyond that one Remove
override, and none at all in `beginRowEdit`/`cancelRowEdit`/`saveActiveRow` —
a Bundle's row is reachable through them only once it already carries a real
id, since minting happens solely inside `importBundleContent`'s own atomic
save — `saveActiveRow` persists through the same full-manager save exactly
like any row's. There is NO Delete-Bundle button in the editor: whole-Bundle
`Remove` is an action on the module card's own `ReadBlock` footer, the
existing drawer-module action system. That card is deliberately lean — the
linked row's own name, `CZPRCB`, and what it compiles — because a Bundle is a
composition, not a single declaration, so its price/per/qty/group are not
restated there. `Product Bundle` carries the name and nothing else; what the
Bundle compiles is its OWN column right after it, through
`RateSheetGridEditor`'s additive `extraColumn` slot (optional — omitted, the
grid keeps exactly the columns it always had, so every other caller is
unchanged). Never a block beneath the grid, because a Bundle is ONE row.
Entries are read-only except for removal
(`controller.removeBundleSuppliedContentRef`, dropping only that Bundle's own
membership — the referenced row is never touched), offered only while that
row is the unlocked one. `bundleSuppliedContent()` resolves each live
reference to its current label against the working collection, silently
omitting one whose source row no longer exists — never a placeholder.
`RateSheetBundleImportPicker.tsx` is the import engine, THREE SIMULTANEOUS
columns — Rate Sheets (every saved sheet; a not-yet-saved one is excluded, no
stable id yet to reference) | Rate Sheet Rows (the clicked sheet's own priced
rows, replaced on every sheet click, never a raw Service inclusion — an
inclusion never priced as a Rate Sheet row has none to reference) | Selected
Rows (the accumulating basket, never cleared by a sheet click, letting one
Bundle compose across several sheets in one Import). `bundle={null}` is the
Bundle's own first Import (rendered directly by the switcher, above): `onDone`
is omitted, so there is no Close — the drawer's own Cancel is the only way
out — and `Import` calls `controller.importBundleContent`, which mints the
Bundle and its row TOGETHER only on success, seeded ONCE from the summed
price of what was selected, never recomputed again; a failed attempt updates
no local state, so a retry mints exactly once, never a duplicate.
`bundle={bundle}` (mounted inside `RateSheetBundleWorkspace.tsx` instead,
rendering its own Close) is a LATER Import on an already-created Bundle,
which only adds references, never re-touching the row's price. Composing
REFERENCES: the source row's own record and price are never touched, and each
reference is its own record with its own `CZPRCBI` (the "Bundle-inclusion
Platform ID"), never a copy. See [Rate Sheet Bundle](../../../../../../docs/code-map/rate-sheet-bundle.md), [Rate Sheet Bundle Authoring](../../../../../../docs/code-map/rate-sheet-bundle-authoring.md)
and [Package Home Settings](../../../../../../docs/code-map/package-settings.md).
Authoring-lifecycle correction (2026-08-17, browser validation post-Phase-6): a
Bundle's first Import used to leave its freshly minted row LOCKED — the exact
same read-only state an already-saved row's own Cancel leaves — so the
workspace visually looked like it had closed to a summary, even though the
Bundle and its row were both correctly persisted. `persist()`'s own
`recoverBundleKey` recovery (already resolving the saved Bundle by position
against the fresh post-save `applyReadModel()` sheets, since `sheets` state
has not re-rendered yet at that point) now ALSO opens that row for editing
immediately, the same way `beginRowEdit` would — the workspace stays
genuinely open. A separate, adjacent bug: `RateSheetBundleSwitcher`'s editor
title fell back to the literal string `New Bundle` for ANY selected Bundle
with a blank row name, including an already-persisted one — now
`Untitled Bundle`, `New Bundle` reserved for genuine `authoringBundle` state.
Whole-Bundle Remove had a deeper identity bug: `RateSheetBundleRead`'s Remove
called `removeRowImmediately(selectedBundleKey)` — the Bundle's OWN id — but
that command takes a ROW id and detects Bundle ownership by matching
`bundle.itemId === rowId`; a Bundle's own key is never equal to any row's
key, so the match always missed and the confirmed "Remove" was a silent
no-op. A dedicated `removeBundleImmediately(key)` now exists, addressed by
the Bundle's own key directly — the same one-confirm, one-full-manager-save
lifecycle, but needing no row id, no `itemId`, and no successfully-resolved
row object at all, so it also correctly deletes a Bundle predating this
correction whose own link is stale or was never minted (`item_id: ''`).
`RateSheetBundleWorkspace.tsx` calls the SAME command from a new fallback: 
when `selectedBundleRow` cannot be found, the grid is replaced by an
explanation and its own `Remove Bundle` button rather than a dead end.
Separately, a Bundle-backed row also failed to resolve in the Tier
occupant's OWN two independent projections — `buildRateSheetCatalogue()`
(`drawer/tier/tierDetailModel.ts`, feeding the "Add from Rate Sheet…" picker
shared with Tier Edition) and `usePackageStation.tierView()` (the read/price
projection of an already-stored selection) — because both resolved a row's
availability and label purely via its `source_item_id` against Manager
`package_relationships`, which a Bundle-backed row has none of (see
`bundle_id` above). A Bundle-backed row now resolves on its own `bundle_id`
in both, with its own `label` (falling back to `Untitled Bundle`) rather than
"(unresolved Rate Sheet item)" — this is a FRONTEND DISPLAY-only correction;
`PackageManagerSchema::projectTierRateSheetWith` and
`PackageStationSchema::evaluateTierPricing` already resolved a Bundle-backed
row correctly server-side via `self_priced`, so nothing backend changed. In
`tierView()`, `inclusions_override`'s own filter (`source_type ===
'inclusion'`) ALSO dropped a Bundle-backed selection outright, since it
carries no `source_type` at all — fixed to recognize it by `bundle_id`
directly, or it would resolve (price included in the occupant's total) but
still vanish from the "Default Tier Inclusions" read card and the Publish
completeness check that reads from it. A Bundle-backed Feature's read-card
chip is its bare row label (`Untitled Bundle` fallback included) — rendering
identically to any other Feature chip via the shared, governed
`item-collection` drawer-kit element, deliberately never a squished
`"Bundle Name — includes: X, Y, Z"` string (a first pass did this, then
reverted it — a single long label collapsed the card down to one box where an
ordinary occupant's Features render one box per item, a visible "1 vs N"
mismatch). The Bundle's own supplied content is shown instead where it's
actually being composed: `TierResolvedRateSheetSelection` now also carries
`bundle_id`/`includes` (both already in scope at each construction site —
`buildRateSheetCatalogue()` and `tierView()`'s own `resolvedSelections` — so
this is a same-shallow addition, not new plumbing), and
`PoolInclusionsEditor.tsx`'s Rate-Sheet-mode row rendering shows a read-only
bullet sub-list of `row.includes` directly under a Bundle-backed row's own
price-option/qty/price/remove line (`cz-ie-sub-list`, empty state "No
supplied content yet."). This editor is the SAME shared component behind
both the Tier occupant's own inclusion editor and every Tier Edition's own
inclusions editor (`buildRateSheetCatalogue()`'s own doc comment), so both
surfaces get the sub-list identically, which is the intended shared-mechanics
behaviour, not an incidental side effect.
- `drawer/package-family/`, `drawer/tier/`, `drawer/inclusion/`, and `drawer/tier-rate-sheet/` — Package-owned drawer compositions, controllers, dialogs, routing tokens, and footer presentation. `drawer/tier/` holds pending `tier-register:[familyId]`, persisted whole-instance `tier-instance:{instance}`, occupant `tier-instance:{instance}:{occupant}`, and fixed-slot `tier-slot:{instance}:{slot}` addresses behind the one registered Tier drawer. `TierSystemContent.tsx` / `useTierSystemController.ts` / `TierSystemFooter.tsx` are the ONE composition, controller, and footer for both the pending and persisted Tier System aggregate — registration is that lifecycle's pending state, not a second Tier editor. Inline Edit/Save commits a module draft locally only; footer Publish (`useTierInstances.createInstance`) and Apply (`useTierInstances.updateInstance`, carrying Overview and Included Rate Sheets together) are the sole authoritative writes, and guarded Delete (`useTierInstances.deleteInstance`) is the sole authoritative removal. `TierRegistrationHost.tsx` always passes `instance={null}` and never re-mounts as the persisted host, so `useTierSystemController`'s `instance` resolves from its own `createdInstance` local state alone once Publish sets it — `apply()` must therefore re-sync `createdInstance` with its own `updateInstance` response (2026-08-16 correction), or a first-session Apply leaves every module read, Included Rate Sheets' pill included, frozen at whatever Publish saw until a full page reload re-derives from a fresh collection read. Included Rate Sheets' own module card is draft-preferred, matching Overview (whose draft state doubles as its own display source): while `rateSheetHasUnappliedChanges` is true its card reads selected names through the draft's ids, never through `c.projection` alone — the gap Overview never had, since Overview's card literally reads the same state its editor writes. Its editor, `TierRateSheetAccessEditor.tsx`, is one `MultiSelectField` (`drawer-kit/fields` — a trigger + viewport-aware floating checklist panel, the same component Tier Overview's own Customer Groups picker now uses instead of its former hand-rolled, always-downward version), not a checkbox-per-row list. `TierAssignmentSchema::assign()` is idempotent for the exact already-stored consumer/instance pairing (2026-08-16): `pointAssignment`'s own no-op guard means a redundant re-point of an unchanged Family assignment must not surface `consumer_already_assigned` — any other, genuinely conflicting pairing still throws exactly as before. `TierDrawerContent.tsx` / `useTierDrawerController.ts` / `TierDrawerFooter.tsx` remain the separate, unchanged composition for one fixed-slot occupant, scoped to `(tier_instance_id, slotId)`; the occupant's own Included-Features module is now titled "Default Tier Inclusions" (unchanged content/editor — still only the occupant's own Default declaration), and `TierDrawerContent.tsx` additionally mounts `TierEditionDeclarationSwitcher.tsx` as the sole content of the individual Tier drawer's Options group (drawer refinement blueprint, Phase 3 composes this screen's four groups — Details/Options/Connections/Support — directly through `PlacedShell` rather than `EntityDrawer`'s fixed Details/Connections bar; Phase 5 relocated the switcher here from Details), gated on a real occupant existing — a compact `[Edition …]` child-chip strip (`ChildChipStrip`, `drawer-kit/ui` — footer/nav refinement, Phase 3, replacing this switcher's former hand-rolled use of Cost Builder's own public `cz-cost-builder__tier-edition*` classes), not a scoped drawer route with its own footer-slot takeover (that surface was retired; it never had a reachable entry point). The selected Edition's own read surface (UI refinement, Phase 5; Edition Pricing Rules split out of Overview) is three mature module cards — `TIER_EDITION_ENTITY`'s `overview`/`pricing-rules`/`inclusions` shells, rendered through the SAME `PlacedShell`/`ReadBlock`/`ModuleStatusPill` machinery Tier Overview, Tier Pricing Rules, and Default Tier Inclusions render through, all three sharing one `ModuleState` (`tierEditionOverviewModule`, since an Edition is one consolidated backend module, not a parent-style Overview/Features split) — not a bespoke summary block. Any card's Edit opens ONE shared inline editor (`TierEditionEditor.tsx`) presenting Overview/Pricing Rules/Inclusions as three `DrawerGroupTabs` tabs over the SAME `TierEditionOverviewDraft`: one draft, one dirty state, one Save, one Cancel; switching tabs is local presentation state that fires no endpoint and never introduces a second `editing.module`. Save (`TierEditionDeclarationSwitcher.saveEdit`) is draft-only — it leaves `module_status.overview` Pending and never settles on its own (lifecycle correction: an inline Save auto-settling was the exact defect, matching the Tier occupant's own `useTierModuleEditing.saveSection`, which has never auto-settled). Settling the pending draft is the pinned footer's explicit Publish action's job: `onPublish` (`TierDrawerContent.tsx`) now calls `editionCtl.settle()` first, gating `editionCtl.publish()` (the platform_status transition) on that settle's success — the two existing endpoints (`settleTierEditionModule`, `updateTierEditionStatus`), sequenced correctly, not a new one. `deriveTierEditionFooterState`'s `canPublish` (`tierEditionModel.ts`) mirrors the Tier occupant's own `buildTierFooterModel.footerHasContent` formula: raw pending content (`hasDraft`) makes something publishable, independent of `platform_status` — never derived from the presentation-layer 5-state pill, which answers a different question (what color/label to show) and must not gate a genuinely separate mutation. There is still no independent Edition Inclusions backend module. The selected Edition's lifecycle actions (Publish/Disable/Enable/Archive/Restore/Move to Bin) no longer render inline under Options at all — single-footer, scope-aware lifecycle command model: `TierDrawerFooter.tsx` is the ONE pinned lifecycle command surface for both the parent Tier and the selected Edition, composed by `buildTierLifecycleMenu` (`tierLifecycleMenu.ts`, a pure function — no rendering, no state, no endpoint calls of its own). The footer carries two independent split controls (footer/nav refinement, Phase 1 — Publish separated out of the one combined menu the correction plan originally produced): a LEFT split (backward/travel actions — Disable/Enable/Archive/Restore/Move to Bin, via `buildTierLifecycleMenu`) and a RIGHT split, `splitForward` (forward/publish actions — Publish Edition / Publish Tier, via `buildTierPublishMenu`, a second pure function in the same `tierLifecycleMenu.ts`). Each follows the SAME scope priority independently: the selected Edition's own row(s) first, the Tier's own currently-valid action after that (even when its verb differs from the left split's own label — e.g. "Enable Tier" under a "Disable ▾" label), the Tier's genuine cascade action on the left split (Archive Tier — archiving the Tier already cascade-archives every live Edition, so there is no separate "Archive All"), and Move Edition to Bin always last on the left split, danger-toned (Edition lifecycle/Bin UX cleanup) — the ONE action that leaves the active workspace, valid and identically wired from ANY Edition status (Pending/Active/Disabled/Archived/Trashed alike), driving the atomic `moveTierEditionToBinCommand` endpoint (`PackageStationController.php`, a SEPARATE additive route from the narrow `POST .../editions/{id}/bin`, which remains untouched for callers that deliberately require "already archived/trashed") rather than the narrow endpoint directly — the backend composes the trash-if-not-already-binnable transition and the bin relocation into one request with one persist, so there is never a persisted state where an Edition is Trashed but still sitting in `tier_editions[]`. This replaced three prior separate rows ("Move Edition to Trash" for a live/pending Edition, "Move Edition to Bin" for an already-archived/trashed one, and "Permanently Delete Edition" once trashed) with this single row; Permanent Delete is no longer reachable from this footer at all. Both splits are mounted with `EntityActionFooter`'s optional `menuOnly` flag (additive; every existing consumer that omits it keeps today's direct-click behavior) — each visible label click only opens/closes its OWN menu, identical to its own chevron, with its own independent open/closed state (`splitOpen`/`publishSplitOpen`, both owned by `useTierDrawerController`); a lifecycle or publish mutation only ever happens from an explicit scoped row in the relevant menu. `useTierEditions` itself is unchanged and remains the sole Edition-mutation owner; only its call site moved from `TierEditionDeclarationSwitcher` up to `TierDrawerContent.tsx` (which now derives the selected Edition's scoped handlers and hands them to the footer) so both the switcher's read-mode cards and the pinned footer share the exact same controller instance, never two independently-drifting copies. `deriveTierEditionFooterState` (`tierEditionModel.ts`) still supplies `canPublish`, mirroring `derivePackageFamilyFooterState`'s own formula but never gating Publish on identity already existing — CZTE is assigned ON first Active, not before, unlike Package Family's `group_id`. "Archive Edition" is its own independent left-split row, separate from "Archive Tier" — archiving the Tier ALSO cascade-archives every live Edition and displaces the whole parent occupant into `occupant_bin[]`, which is not an acceptable substitute for archiving just the Edition. Default is never a row of this strip — its own terms live in Default Tier Inclusions under Details, and Options renders no Default affordance at all (UI refinement, Phase 1). Options is a drawer information group only — Edition data remains owned by the Tier occupant / Package Station exactly as before this relocation. Common Questions (the `faqs` module, same `tierFaqsShell`) is the Support group's content, relocated from Details the same presentation-only way. The same switcher also carries the occupant-owned Edition-bin UI (Edition lifecycle/Bin UX cleanup, replacing the former collapsed "Show/Hide Edition bin (n)" content button and its inline block) — still inside this one module, not a second drawer or standalone panel. A single Bin icon (`TrashIcon`, `admin-station/shell/icons`) sits on `ChildChipStrip`'s own additive `trailing` seam (`cz-drawer-groups__chip-strip-trailing`), a fixed sibling of the horizontally-scrolling `[Nath] [Edition 2] [Edition 3]` chips (isolated to their own `cz-drawer-groups__chip-strip-scroll` inner region) — but the icon exists ONLY in the normal, non-Bin state (Edition lifecycle/Bin UX correction, replacing an earlier pass that kept the Bin swapped in beside a still-visible chip strip). Clicking it (`binActive`/`onBinActiveChange`, a CONTROLLED prop sourced from `useTierDrawerController`'s own `editionBinActive` state, the identical controlled-prop/remount-survival reason `selectedId`/`onSelect` are controlled rather than local) mounts the Edition Bin as its OWN focused drawer task — `TierEditionBinFocusedView.tsx`, built on the shared `FocusedTaskShell` (drawer-kit) the Edition module editor already renders through — replacing BOTH the `ChildChipStrip` band and the normal module cards outright, an early, exclusive return inside `TierEditionDeclarationSwitcher.tsx`, never a second secondary-nav row left showing alongside it. `useTierDrawerController`'s `focusedTaskActive` (`anyEditingActive || editionBinActive`) drives the SAME header-hide/`.cz-req-detail--editing`/pinned-footer-suppression the module editor already triggers, so the Bin reuses that chrome suppression verbatim rather than inventing a second mechanism; `editionBinActive` is deliberately kept OUT of `anyEditingActive` itself so the dirty-edit "Discard unsaved changes?" guards (which key on `editingSection` alone) never fire for it. The focused task's own header reads "Drawer Bin" with a muted, non-lifecycle "Bin Active" badge (`cz-module-status-pill--draft`, never the editor's green "Live Editor" tone or any red/danger treatment), and its own footer carries exactly one right-aligned Close. Both the shell's Back control and footer Close call only `onBinActiveChange(false)` — never an endpoint, never `bridge.close()`, never touching `selectedDeclarationId`, so closing the Bin always returns to the same previously selected Edition. `TierEditionBinList.tsx` (rendered inside `TierEditionBinFocusedView.tsx`, no longer imported by the switcher directly) is a compact admin table — Title / Platform ID (CZTE) / Status / Actions — rendering status through the SAME `TravelStatusPill` (`drawer-kit/ui/TravelStatusPill.tsx`) the occupant's own bin (`TierBinList.tsx`) already uses, with icon-only row actions (`TrashIcon`/`RestoreIcon`) whose real operation is carried in `aria-label`/`title` rather than visible text, since the SAME trash-shaped icon maps to a DIFFERENT operation depending on the row's own status: an Archived row's icon means Move to Trash (`trashBinEntry`, staying in the bin, still reversible via Restore); a Trashed row's identical-looking icon instead means Delete permanently (`deleteBinEntry`) — Permanent Delete is reachable ONLY from this list now, never from the pinned footer, and never from the Bin's own Back/Close. No change to `restoreFromBin`/`trashBinEntry`/`deleteBinEntry`, `tier_edition_bin[]` storage, or ordering — only where they render. Options carries no "declaration" UI copy (UI refinement, Phase 8): the "Inclusions & Editions — additional declarations" banner heading and the old Default pointer note are both gone, and Edition Inclusions' own subtitle no longer says "declaration" either — internal code vocabulary (the component name, its CSS classes, code comments, and this doc's own use of "declaration" as the precise domain term for an Edition's terms) is untouched, a deliberate, separate decision. Overview itself carries only a small derived read-only "Editions" count field. The "+ Edition" creation trigger (`useTierDrawerController.handleAddEdition`, same `createTierEdition` endpoint, no title/pricing form) lives in `TierDrawerContent.tsx`'s own top nav chrome, beside the Tabs/Accordion view toggle, reachable only while Options is the active group (footer/nav refinement, Phase 2 — relocated off Options' own selector row, where it lived before this pass) — a single place that creates one. The selected declaration id (`selectedDeclarationId`) lives in `useTierDrawerController`, not in the switcher itself, because `TierDrawerContent` unmounts its whole child tree while `!pkg.detailLoaded` (every Edition mutation refetches), which would otherwise silently reset the tab selection after each action. Whenever Editions exist but the selection names none of them (fresh mount, or the previously selected row just left `tier_editions[]` via delete/move-to-bin/etc.), the switcher auto-selects the first Edition — there is no Default to fall back to inside Options. With zero Editions it renders a proper empty state ("No additional Editions yet. Use "+ Edition" to add one.") rather than a blank area (UI refinement, Phase 3). `drawer/inclusion/` covers one Tier's use of one Rate Sheet row and persists quantity through `usePackageStation.saveTierFeatures`. `drawer/tier-rate-sheet/` scopes one Tier's connection to a sheet or nested group and commits through the Package Manager save. Package Family creation uses the mature `drawer/package-family/` composition's `'new'` identity (`usePackageFamilyStation.createFamily`) — the precedent `useTierSystemController`'s pending→persisted identity transition follows.
- `drawer/editors/` and `drawer/schema/` — Package-owned editors, entity manifests, and bindings. `entities/tierSystem.ts` and `bindings/tierSystem.tsx` are the ONE Tier System manifest, placing the Overview module (title, description, optional Package Family relationship) and the whole-system Rate Sheet Access module (module key `rate-sheet-access`, presented as "Included Rate Sheets"); each atomic editor owns no endpoint or footer.
- `vocabulary.ts` — Package-owned Tier keys and labels.
- `register.ts` — registers Package navigation, destination, sources, the Tier workspace kit, and drawers (`package-family`, `tier`, `tier-inclusion`, `rate-sheet`) with Station Manager. It is imported only by `resources/ts/modules/admin-station.ts` and is never re-exported from `index.ts`.

## Boundaries

External consumers import only `index.ts`; the sole exception is a documented type-only import of `types.ts` where the public barrel would close a dependency cycle. Sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Package-shaped name or URL — decides whether an endpoint belongs here. Service-scoped Package Station URLs use the Service id as navigation context only; Package Station retains persistence authority.

Host-engine contracts and helpers come from `@/station-manager`. Imports from `@/admin-station/presentation/` and `@/admin-station/shell/icons` remain legal consumption of Admin Station presentation/control capabilities. `register.ts` remains an entry-only module and must not enter the public barrel.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Package Home Settings](../../../../../../docs/code-map/package-settings.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier System Registration](../../../../../../docs/code-map/tier-registration.md), [Tier Capability](../../../../../../docs/code-map/tier-capability.md), [Tier Add-on Selection](../../../../../../docs/code-map/tier-addon.md), [Tier Edition](../../../../../../docs/code-map/tier-edition.md), and [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md).

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `php tests/tier-group-composition.php`, `php tests/tier-group-platform-identity-backfill.php`, `php tests/commercial-leg-resolution.php`, `php tests/tier-commercial-leg-identity.php`, `php tests/commercial-leg-timeline.php`, `php tests/commercial-leg-commitment-cap.php`, `php tests/tier-leg-inclusion-reference.php`, `php tests/tier-leg-platform-identity.php`, `php tests/tier-leg-assignment-orphan-pruning.php`, `php tests/tier-default-leg-identity-cost-builder.php`, `php tests/commercial-leg-headline-id.php`, `php tests/platform-identifier-temporary-migration.php`, `npm run contract:package-family-capability`, `npm run contract:package-tier-workspace`, `npm run contract:package-tier-workspace-shell`, `npm run contract:tier-connections`, `npm run contract:tier-settings`, `npm run contract:tier-system-drawer`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-scope`, `npm run contract:tier-instance-tool`, `npm run contract:tier-overview-is-addon`, `npm run contract:tier-edition-admin`, `npm run contract:tier-edition-switch`, `npm run contract:tier-edition-move-to-bin`, `npm run contract:tier-lifecycle-menu`, `npm run contract:supported-action-footer`, `npm run regression:entity-action-footer-menu-only`, `npm run regression:tier-occupant-lifecycle`, `npm run regression:tier-edition-lifecycle`, `npm run regression:tier-publish-timeout`, `npm run regression:rate-sheet-row-lock`, `npm run regression:rate-sheet-service-import`, `npm run regression:rate-sheet-bundle`, `npm run contract:tier-rate-sheet-catalogue-bundle`, `npm run contract:tier-occupant-inclusions-bundle`, `php tests/rate-sheet-bundle.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

`usePackageStation.settleTier`'s success response is normalized through the
same `normTier()` boundary as every other patch (`toggleTierEnabled`, the bin
travel patches) before it is stored — the raw REST response can omit fields
(e.g. `rate_sheet_selections`) that only the separate read endpoint computes.
`resources/ts/api/client.ts` (shared, outside this peer) bounds every request
with a timeout and throws a distinguishable `ApiTimeoutError`; this hook lets
that error propagate out of `settleTier` instead of swallowing it, so a
stalled Publish still releases `saving` via the existing `finally` and the
drawer surfaces an uncertain-outcome message instead of a false "failed."

<!-- deploy-pipeline trigger check: 2026-08-07 -->

