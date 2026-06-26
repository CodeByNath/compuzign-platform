# Drawer Module CSS System — v1

The canonical CSS presentation layer for all Service Station drawer module cards.

Established during the Drawer Module UI Standardisation pass (2026-06-22).

See also:
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — canonical behavioural spec for the completed Service modules (notifications, footer actions, category workflows, lifecycle).
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) for lifecycle and state machine rules.

---

## System Overview

Two CSS scopes form the drawer module system.

**`.drawerModule`** — the shared reusable frame. Used by all Service Station drawer module cards.

**`.drawerOverview.service`** — Service Overview-specific scope. Extends `.drawerModule` with the field/label/value system unique to Service Overview.

---

## Rule 1 — All Service Station Drawer Modules Must Use `.drawerModule`

No Service Station drawer module card may use `.cz-sv-module` or any other card shell system.

Modules currently on `.drawerModule`:

| Module | Component | Root Classes |
|---|---|---|
| Service Overview | `ServiceOverviewViewCard.tsx` | `drawerModule drawerOverview service` |
| Included Features | `ServiceInclusionsViewCard.tsx` | `drawerModule` |
| Common Questions | `ServiceFaqsViewCard.tsx` | `drawerModule` |

---

## Rule 2 — Service Overview Is Scoped Under `.drawerOverview.service`

Service Overview uses both classes on its root element:

```html
<div class="drawerModule drawerOverview service">
```

The compound selector `.drawerOverview.service` scopes the field/label/value system to Overview only. These styles do not affect Inclusions or FAQs.

---

## Rule 3 — Future Modules Inherit `.drawerModule`

Any future Service Station module card must (CSS scope):

- Use `.drawerModule` as the root class
- Add only module-specific body content styling inside `drawerModule__body`
- Not create a new card shell
- Not create a parallel drawer UI system

Body-specific content classes (chip pools, lists, grids) may use whatever naming fits the module. The outer frame must be `.drawerModule`.

This rule covers CSS only. For the full build checklist (notifications, status, view/edit, state ownership, lifecycle actions), see ServiceDrawerModuleArchitecture-v1 → *Extension Guidelines & Commercial Migration Template*.

---

## Rule 4 — Create Service Drawer Uses the Same System

The Create Service drawer (`ServiceCreateStep`) and the Service Station drawer (`ServiceViewStep`) must use the same drawer module CSS system.

Allowed differences between the two surfaces:

- **Values** — draft content vs settled server data
- **Status pill** — hardcoded `pending-dim` vs interactive `ModuleStatusPill`
- **Actions** — Edit enabled/disabled; Discard Draft absent pre-creation
- **Editability** — `drawerModule--locked` modifier on unavailable modules
- **Notifications** — absent pre-creation

The visual frame must be identical.

**Locked state:** `.drawerModule--locked` is the modifier for pre-creation or unavailable modules. The shell renders normally. Only the action button receives the `disabled` attribute. No CSS rule may target the shell to change its appearance based on lock state. See the Locked State principle in [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md).

---

## Rule 5 — `.cz-sv-module` Is Not the Drawer Module System

`.cz-sv-module` is a legacy CSS class. It remains in the codebase for Commercial UI, Transit UI, and ReadBlock UI contexts only.

No new Service Station drawer module may be built using `.cz-sv-module`.

---

## CSS Location

`resources/css/modules/admin.css`

The `.drawerModule` block and `.drawerOverview.service` block are grouped together in one section, immediately following the `.cz-sv-module` block.

---

## Class Reference

### Shared Frame — `.drawerModule`

| Class | Role |
|---|---|
| `.drawerModule` | Card wrapper — border, radius, overflow, margin-bottom |
| `.drawerModule:hover` | Hover highlight |
| `.drawerModule--locked` | Locked/unavailable state — shell unchanged, button disabled via HTML |
| `.drawerModule__header` | Header row — icon + heading + status |
| `.drawerModule__icon` | 40×40 accent icon container |
| `.drawerModule__icon-svg` | SVG inside icon |
| `.drawerModule__icon--overview` | Overview icon variant hook |
| `.drawerModule__icon--features` | Inclusions icon variant hook |
| `.drawerModule__icon--faqs` | FAQs icon variant hook |
| `.drawerModule__heading` | Title + subtitle column |
| `.drawerModule__title` | Module name (strong weight) |
| `.drawerModule__subtitle` | Module description (faint, small) |
| `.drawerModule__status` | Status pill slot |
| `.drawerModule__status--dim` | Dimmed status — opacity 0.45 |
| `.drawerModule__body` | Body container — padding |
| `.drawerModule__count` | Count badge rendered inside title |
| `.drawerModule__empty` | Empty state container |
| `.drawerModule__empty-title` | Empty state heading |
| `.drawerModule__empty-copy` | Empty state description |
| `.drawerModule__footer` | Footer / action row |

### Overview Scope — `.drawerOverview.service`

All selectors are descendant rules scoped under `.drawerOverview.service`.

| Selector | Role |
|---|---|
| `.drawerOverview.service .drawerModule__fields` | Field list container |
| `.drawerOverview.service .drawerModule__field` | Single field row — 100px label / 1fr value grid |
| `.drawerOverview.service .drawerModule__label` | Field label — faint, small |
| `.drawerOverview.service .drawerModule__value` | Field value — normal weight |
| `.drawerOverview.service .drawerModule__value--muted` | Muted placeholder value |
| `.drawerOverview.service .drawerModule__value--clamp` | Clamped description — 3 lines max |

---

## Module-Specific Body Elements

These classes live inside `.drawerModule__body` and are body-content patterns, not frame classes. They are outside the `.drawerModule` naming convention by design.

**Inclusions body:**

| Class | Role |
|---|---|
| `.cz-sc-inclusion-pool` | Chip container |
| `.cz-tf-chip` | Individual feature chip |
| `.cz-tf-chip__edit` | Edit action inside chip |

**FAQs body:**

| Class | Role |
|---|---|
| `.cz-sc-faq-list` | FAQ list container |
| `.cz-sc-faq-item` | Single FAQ entry |
| `.cz-sc-faq-item__q` | Question text |
| `.cz-sc-faq-item__a` | Answer text |

---

## Remaining `.cz-sv-module` Usages

`.cz-sv-module` remains in the following contexts. None are Service Station drawer modules.

### Commercial UI

| File | Lines | Context |
|---|---|---|
| `SurfacePackagesWorkstation.tsx` | 377 | Tier Overview — new tier edit flow |
| `SurfacePackagesWorkstation.tsx` | 418 | Tier Included Features — new tier edit flow |
| `SurfacePackagesWorkstation.tsx` | 476 | Tier Common Questions — new tier edit flow |
| `SurfacePackagesWorkstation.tsx` | 1359 | Tier Overview — existing tier view/edit flow |
| `SurfacePackagesWorkstation.tsx` | 1396 | Tier Included Features — existing tier view/edit flow |
| `SurfacePackagesWorkstation.tsx` | 1442 | Tier Common Questions — existing tier view/edit flow |
| `ServiceViewStep.tsx` | 355 | Promotions empty state (no-border header, no footer) |

### ReadBlock UI

| File | Lines | Context |
|---|---|---|
| `ReadBlock.tsx` | 15 | Generic read-only content block — used exclusively by PromotionsWorkstation at 6 call sites: Promotion Identity, Pricing, Inclusions, Add-ons, Not Included, Campaign |

### Transit UI

| File | Lines | Context |
|---|---|---|
| `PackageSummaryTransitView.tsx` | 37, 71 | Package Summary transit cards — empty state and per-tier loop |
| `ServiceOverviewTransitView.tsx` | 42 | Service Summary transit card |

Both transit view files are currently orphaned — they exist in the codebase but have no active import site.

### Legacy Removable UI

None. All remaining `.cz-sv-module` usages are actively used (Commercial, ReadBlock) or are planned for future connection (Transit). No usage is safe to remove without a broader assessment of those contexts.
