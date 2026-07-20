# Package Family Tools — Working Blueprint

**Status:** In progress; static/build validation planned, runtime verification unavailable
**Date:** 2026-07-20
**Scope:** Package Family / Group owned tool activation, the drawer Settings → Tools / Skills surface, Tier as the first real tool, and the Admin Station Package Station Home.
**Current source navigation:** [Package Manager](../code-map/package-manager.md), [Tiers](../code-map/tiers.md), [Admin Station Drawer](../code-map/admin-station-drawer.md).

## 1. Audit conclusion (decision gate)

A safe, additive path exists. No compromise condition is triggered:

- No destructive migration — tool assignments are an optional `tools` map on each existing `category_groups` row; a missing field sanitizes to `{}`.
- Native Tier identity is untouched — activation writes no `station.tiers` entry and mints no `occupant_id`.
- Tier authority is not replaced, split, or rewritten — `PackageSchema`, `PackageStationController`, and `usePackageStation` are not modified.
- Package Manager authority is not duplicated — the Package Station keeps `PackageRepository`/`PackageManagerSchema` as the single persistence authority.
- The shared drawer and lifecycle systems are extended, not replaced.
- No public API receives an incompatible change — one additive route and one additive response field only.
- No fake Promotion / Bundle / Campaign systems are created — they are registry metadata marked unavailable.

### Evidence

- **Package is not a per-record entity.** Current writes use the single `cz_package_station` option through `PackageRepository`; a Service ID in `/admin/services/{id}/package-station/...` is navigation/pool context, never ownership (Package Manager code map; `PackageManagerSchema`).
- **Package Families / Groups are stable, Package-owned rows.** Each is a row in `package_manager.category_groups` keyed by a stable string `group_id` (`pcg_…`), created born-disabled with lifecycle delegated to `StationLifecycle` (`PackageCategoryGroups::create`/`sanitizeAll`). The drawer identity invariant is native string `group_id` (Admin Station Drawer code map).
- **Family and Group are the same entity.** "Package Family" is the product name for a `category_groups` row; there is no separate Group schema. One owner type covers both.
- **Tier data is station-global, not Family-owned.** `PackageRepository::defaultStation()` stores `tiers: []`; the five slot names come from `PackageSchema::ALLOWED_TIERS`; occupants live under one station option. A Family's Tier volume is *projected* through Package-owned source relationships (`PackageCategoryGroups::relatedServiceIds` → Rate Sheet → `dependents.tier_selections`), never independently owned per Family.
- **The reverted "capability host" commit chose the wrong owner.** It persisted a global `ownerType: package-manager / ownerId: package-station` assignment (a station-wide "enable Tier"). That is the exact singleton this work replaces with the real Family/Group owner.

## 2. Architecture decision

| Question | Decision |
| --- | --- |
| Valid owner of a tool assignment | The Package Family / Group (`category_groups` row). |
| Stable owner ID | Native string `group_id`. |
| Where assignments persist | A `tools` map **on the group row** inside `package_manager.category_groups`, via `PackageRepository`. |
| Does Tier activation create a Tier record? | No. It only sets `tools.tier.enabled = true` on the group row. |
| Is Tier data owner-specific? | No — station-global, projected per Family through existing relationships. |
| Can Tier appear under a Family without changing Tier persistence? | Yes — activation controls access/presentation; Tier data stays projected. |
| Registries reused | `PackageCategoryGroups`, `AdminPackageCategoryGroupsController`, `usePackageFamilyStation`, the entity-drawer schema/`EntityDrawer`, existing surface bindings, the untouched Tier authority. |
| Systems that must not change | Tier slot/occupant/bin/lifecycle algorithms, `PackageSchema`, `PackageStationController`, `usePackageStation`, Command Centre `PackageManagerStation`/`DynamicStationManager`, `StationLifecycle`, drawer-kit renderers, Promotion/Bundle/Campaign, historical posts, compatibility URLs. |

### Ownership shape

```ts
// Persisted on the category_groups row (per Family), not a global collection.
{
  group_id: 'pcg_1234abcd…',
  tools: { tier: { enabled: true } },
}
```

Activation (`tool activation`) is distinct from Tier authoring (`tool data creation`). Activating Tier flips one boolean; it never mints occupants or five placeholder slots.

## 3. Persistence

`PackageCategoryGroups` gains a pure `tools` field:

- `sanitizeAll` / `create` / `replace` / `projection` carry `tools: array<toolKey, { enabled: bool }>`; unknown keys and non-bool values normalise away; a missing field → `{}`.
- `setTool(groups, groupId, toolKey, enabled)` — pure toggle returning the new group collection; only registry-known tool keys are accepted, and only real (available) tools may be enabled.
- No migration; `PackageManagerSchema::sanitize` already routes `category_groups` through `sanitizeAll`, so old rows load with `tools: {}`.

`AdminPackageCategoryGroupsController` gains one additive route:

```text
PUT /admin/package-category-groups/{gid}/tools/{toolKey}   { enabled: bool }
```

It reuses `mutateGroup` and returns the same group projection envelope. The registry of valid/available tool keys is enforced server-side (`PackageToolRegistry`).

## 4. Frontend

- `resources/ts/modules/packages/packageTools.ts` — the tool registry (metadata only: `key`, `label`, `description`, `available`, `supportedOwnerType`, optional `unavailableReason`). `tier` is available; `promotion`/`bundle`/`campaign` are `available: false` with a reason. No business rules, endpoints, or lifecycle.
- `PackageFamilyItem` gains `tools: Record<string, { enabled: boolean }>`; `setPackageFamilyTool(groupId, toolKey, enabled)` endpoint.
- `usePackageFamilyStation` gains `tools` state + `setToolEnabled(toolKey, enabled)` writing through the new endpoint and advancing the local record from the response.
- **Settings tab.** The canonical drawer tab contract (`DrawerTabs`) becomes Overview | Connections | Settings, **presence-driven**: a tab renders only when the entity declares that placement group. Labels/order stay renderer-encoded (not per-entity free configuration). Only Package Family declares `placements.drawer.settings` this phase.
- `PackageFamilyToolsPanel` renders the Settings tab content: one row per registry tool with label, description, availability, enabled state, activate/deactivate action, and reason-when-unavailable. The Tier row, when enabled, shows owner-context Tier status derived from `dependents.tier_selections` ("No tiers configured yet" when zero, "N Tier selections in this Family" otherwise).

## 5. Package Station Home (Admin Station)

The existing `packages` nav item + destination currently mount nothing. Bind the Package Families wall (reuse `package-families` data source + `category-group-cards` kit) to `stationId: 'packages'`, so the Package Station opens as a real workstation showing Families as first-class records, each opening the Family drawer. No shell edit — one binding row. This removes the "empty activation-message destination" risk without duplicating Package Manager authority.

## 6. Tier activation & deactivation semantics

- **Activate**: assignment saved (`tools.tier.enabled = true`); no Tier occupant created; Tier becomes available for that owner; owner-context Tier status appears in the Tools panel.
- **Active + empty**: "No tiers configured yet." The mature Tier authoring workflow remains the existing Tier surfaces (Command Centre Package Manager Tier cards); the drawer does not nest a second drawer (platform no-nest rule), so in-drawer Tier CRUD is deliberately out of scope and documented as a limitation.
- **Deactivate**: sets `enabled = false`. No Tier data is deleted, archived, or mutated. The tool is hidden/marked inactive for that owner; a warning states deactivation affects visibility only. Existing occupants and lifecycle are preserved and remain reachable through the station-global Tier authority.

## 7. Targeted refresh & identity

- The Tools panel mutates through `usePackageFamilyStation`, which advances the local Family record from the response and calls `onMutationComplete` — the same originating-wall refresh path the Family drawer already uses. No new event bus.
- `occupant_id` stays the Tier record identity; `slotId` stays the mutation address; `group_id` is the tool-assignment owner. None is coerced into another.

## 8. Files

**Create**
- `docs/architecture/package-family-tools-blueprint.md` (this file)
- `resources/ts/modules/packages/packageTools.ts`
- `resources/ts/entity-drawers/package-family/PackageFamilyToolsPanel.tsx`
- `src/Modules/SurfacePackages/Support/PackageToolRegistry.php`
- `scripts/package-family-tools-contract.ts`
- `tests/package-family-tools.php`

**Modify**
- `PackageCategoryGroups.php` (tools field + `setTool`)
- `AdminPackageCategoryGroupsController.php` (tools route)
- `resources/ts/api/types/admin.ts`, `resources/ts/api/endpoints/admin.ts`
- `usePackageFamilyStation.ts`
- `drawer-kit/DrawerTabs.tsx`, `drawer-kit/EntityDrawer.tsx` (presence-driven Settings tab)
- `entity-drawers/schema/entities/packageFamily.ts` (+ settings placement), `PackageFamilyDrawerContent.tsx`, `usePackageFamilyDrawerController.ts`, `packageFamilyDrawerTypes.ts`
- `admin-station/stations/surfaceBindings.ts` (Package Station Home wall)
- Code Maps: `package-manager.md`, `tiers.md`, `admin-station-drawer.md`, `admin-station-surface-binding.md`; local `SurfacePackages/CLAUDE.md`
- generated `dist` via build

**Explicitly not modified**
- Tier slot/occupant/bin/lifecycle algorithms, `PackageSchema`, `PackageStationController`, `usePackageStation`, Command Centre station/manager, `StationLifecycle`, drawer-kit renderers other than the tab bar, Promotion/Bundle/Campaign handlers, historical posts, compatibility URLs.

## 9. Rollback points

1. Remove the tools route + `setTool`; stored `tools` maps become ignored data. Tier persistence untouched.
2. Remove the Settings placement/tab presence; the drawer returns to Overview | Connections.
3. Remove the Package Station Home binding row; the `packages` destination returns to its neutral empty state.
4. Revert generated assets last. No step migrates or rewrites stored occupants.

## 10. Phased plan

3. Package Station Home composition. 4. Settings tab + Tools panel. 5. Assignment persistence + PHP contract. 6. Tier registry + activation wiring. 7. Tier owner-context presentation. 8. Future-tool seam (docs). 9. Docs. 10. Final audit, build, commit on `main`.

## 11. Validation plan

- `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `git diff --check`, `git status --short`.
- New `scripts/package-family-tools-contract.ts`: owner is a Family (not a global singleton); activation writes no Tier slot; deactivation preserves Tier data; only registry tools activate; presence-driven Settings tab.
- PHP when available: `php tests/package-family-tools.php`, plus the existing package-manager-schema / package-category-groups / tier contracts.
- Browser verification only if a WordPress runtime is available; otherwise reported as not performed.

## 12. Documented limitation (narrowest safe model)

Per-Family Tier **authoring** is not added inside the Family drawer because the platform forbids nested drawers and Tier data is station-global. The Family activation controls Tier availability/access and shows owner-context Tier status; Tier CRUD remains the existing mature Tier workflow. This preserves the single Tier authority and creates no false per-Family Tier ownership.

---

## 13. Correction — Station-level Tools / Skills catalogue (2026-07-20)

### 13.1 Re-audit conclusion (decision gate)

The v1 implementation stores Family assignment correctly but **presents the full tool catalogue inside every Package Family drawer** (`PackageFamilyToolsPanel` renders all four registry tools, with full descriptions and the read-only Promotion / Bundle / Campaign roadmap, in each Family's Settings tab). That makes tools *read* as children of a Family and repeats the identical catalogue in every drawer.

An additive, non-destructive correction exists. No stop condition is triggered:

| Gate question | Evidence | Answer |
| --- | --- | --- |
| Who owns tool **registration**? | `PACKAGE_TOOLS` (`resources/ts/modules/packages/packageTools.ts`) + `PackageToolRegistry.php` — pure metadata. | The Package **Station** domain (registry is station-wide, not Family-scoped). |
| Who owns **assignment state**? | `tools[key] = { enabled }` on the `category_groups` row; mutated by `PackageCategoryGroups::setTool`; routed through `usePackageFamilyStation.setToolEnabled`. | The Package **Family** — unchanged. |
| Who owns tool **data / lifecycle**? | `PackageSchema` / `PackageStationController` / `usePackageStation`; `occupant_id` identity, `slotId` address. | **Tier** authority — unchanged, untouched. |
| Where should the full **catalogue** render? | The `packages` station presentation region already loops ordered walls via `surfaceBindings` + `StationSurfaceHost`. | A new **Station-level** `Tools / Skills` wall (order 1, after Package Families). |
| What stays in Family Settings? | `PackageFamilyToolsPanel` already calls the correct mutation. | Only **assigned/available** tools, compact, product-facing. |
| How should future tools appear? | Registry marks them `available: false`, backend rejects enabling. | **Station-level only**, as compact "Coming soon" roadmap rows. Hidden from every Family drawer. |
| Which systems must be reused? | `surfaceBindings`, `dataSources`, `templateKits`, `StationSurfaceHost`, `usePackageFamilyStation`, the Family drawer. | All reused; no new registry/drawer/lifecycle/mutation system. |
| What must stay untouched? | Tier authority, `PackageSchema`, `PackageStationController`, `usePackageStation`, the drawer shell, the tools route + `setTool`, persistence. | Untouched. |

No ownership moves off the Family; no Tier persistence rewrite; no global `ownerType: package-manager / ownerId: package-station` owner; no nested drawer; no fake future systems; no destructive migration. **Proceed — additive refactor.**

### 13.2 Corrected ownership model

```text
Tool registration        → Package Station domain (PACKAGE_TOOLS / PackageToolRegistry)
Tool catalogue presentation → Package Station Home  (new Tools / Skills wall)
Family assignment state  → Package Family row        (tools[key] = { enabled })  — unchanged
Tool data / lifecycle    → Tier authority             (occupant_id / slotId)      — unchanged
```

### 13.3 Station-level Tools / Skills wall

- New data source `package-tools` (`admin-station/stations/packageTools/usePackageToolCatalogue.ts`): reads the current Package Families list once and projects each registry tool into a catalogue item carrying `available`, `authority`, and the count of Families that have it enabled. It performs **no mutation**.
- New template kit `package-tools` (`admin-station/presentation/package-tools/PackageToolCatalogue.tsx`): pure presentation. Available tools show state `Available`, `Assigned Families: N`, `Authority`, and product-facing guidance on where to assign. Unavailable tools show one compact "Coming soon" roadmap row with the reason. It dispatches **no intent** (assignment is not mutated from the station wall — presentation performs no mutation).
- New binding row: `stationId: 'packages'`, `surfaceId: 'package-tools'`, `placement: 'presentation'`, `order: 1`, `title: 'Tools / Skills'`. The Package Station Home now reads: **Package Families (0) → Tools / Skills (1)** — a full workstation, not a tools-only page.

### 13.4 Compact Family Settings assignment panel

`PackageFamilyToolsPanel` is reduced to compact assignment management:

- Renders only **available** tools (plus any tool already enabled) — the Promotion / Bundle / Campaign roadmap is removed from every Family drawer.
- Each row: label, `Active` / `Inactive` state, a compact Activate / Deactivate control, and — for an active Tier — a product-facing owner-context line ("N Tier selections are available through Services in this Family").
- Developer-facing architecture copy ("Tier records stay in the single Package Station authority") is replaced with product language.
- Assignment saves **immediately** through the existing `setToolEnabled` route; the panel shows an explicit transient "Saved" confirmation. There is no draft/publish step for assignments (the Family's Publish contract governs the Overview, not tool assignment) — the two models are not mixed.

### 13.5 Empty-state correction

`AdminStationHome` renders the station-group region unconditionally, so every station (including `packages`, which supplies no groups) prints "No station groups have been configured." The narrowest fix: `AdminStationHome` renders `<AdminStationGroups>` only when a non-empty `groups` collection is supplied. No station currently supplies groups, and `AdminStationBody` never passes any, so the region is intentionally unused platform-wide — this removes the false message without redesigning the group component or generic empty-state behaviour.

### 13.6 Files

**Create** — `admin-station/stations/packageTools/usePackageToolCatalogue.ts`, `admin-station/presentation/package-tools/PackageToolCatalogue.tsx`, `admin-station/presentation/package-tools/types.ts`.
**Modify** — `surfaceBindings.ts` (keys + row), `dataSources.ts`, `templateKits.tsx`, `packageTools.ts` (+`authority`), `PackageFamilyToolsPanel.tsx` (compact), `AdminStationHome.tsx` (empty-state), `drawer-kit.css` + `admin-station.css` (styles), `scripts/package-family-tools-contract.ts`, Code Maps, local `SurfacePackages/CLAUDE.md`, generated `dist`.
**Excluded** — Tier authority, `PackageSchema`, `PackageStationController`, `usePackageStation`, `PackageCategoryGroups` tools persistence, `AdminPackageCategoryGroupsController` route, the drawer shell, Command Centre station/manager, `AdminStationGroups` internals, Promotion/Bundle/Campaign handlers, historical posts, compatibility URLs.

### 13.7 Rollback points

1. Remove the `package-tools` binding row → the Package Station Home returns to the Families-only wall; source/kit stay registered but unbound.
2. Restore the full `PackageFamilyToolsPanel` list → the drawer returns to the v1 full catalogue.
3. Restore the unconditional groups region → the false empty message returns.
4. Revert generated assets last. No step migrates or rewrites stored assignments or Tier records.

### 13.8 Validation plan

`npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `git diff --check`. Extend `package-family-tools-contract.ts`: the `packages` Home binds a `package-tools` wall after the Families wall; that wall opens no drawer (presentation-only). PHP contracts unchanged and still passing where PHP is available.
