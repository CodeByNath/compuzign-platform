# Admin Station Field System — Locked Implementation Blueprint (v1)

**Status: LOCKED.** This document is the authoritative specification for the Admin Station
field-system consolidation. Implementation follows §10 phase by phase. Deviation requires an
explicit amendment recorded here, with file and line evidence for the conflict.

Audited at: `compuzign-platform` @ `e5d987b` (branch `main`, clean tree)
Plugin root (`PLUGIN`): `wp-content/plugins/compuzign-platform`
Scope: Admin Station shell, drawer system, drawer content, Admin field controls, and the CSS/tokens
those use. **Admin Station only** — the Cost Builder, homepage, storefront, quote builder and the
global Atomic Engine are out of scope and must not be modified.

All paths below are relative to `PLUGIN` unless noted. Every claim cites `file:line`. Line numbers
are those of the audited commit; later phases shift them, so locate rules by selector, not by line.

## Amendment log

| # | Phase | Amendment | Reason |
|---|---|---|---|
| A1 | 2 | §9.2 proposed `--station-field-height` = `--station-control-height` (38px) and `--station-field-pad-x` = `--station-control-pad-x` (14px). Implemented instead as `--station-field-pad-y: 8px`, `--station-field-pad-x: 12px`, `--station-field-font: 14px`, with **no declared height on the default size**; `min-height` is carried by the `--sm` and `--lg` modifiers only. | The drawer control renders today at `padding: 8px 12px` (`resources/css/modules/drawer-kit.css`, the `.cz-tf-input, .cz-tf-select, .cz-tf-textarea` base) with no declared height. Adopting 14px padding and a 38px floor would have changed the resting metrics of every existing control, contradicting the Phase 2 completion criterion "no screenshot has moved". The default size therefore encodes today's metrics; small and large are the two deliberate steps either side. |
| A2 | 2 | §9.2 listed 11 tokens. Implemented as 24, adding `--station-field-pad-y*`, `--station-field-font*` and `--station-field-min-h-*` per size, plus `--station-field-text`, `--station-field-muted`, `--station-field-accent`, `--station-field-accent-bg`, `--station-field-readonly-bg` and `--station-field-checkbox-size`. | §9.2's 11 names could not express three sizes without literal values inside the size modifiers, which the brief's "built from shared tokens" requirement rules out. All 24 remain aliases over existing `--station-*` families or 4px-rhythm values; no new colour is introduced. |
| A3 | 2 | §9.1 specified `:read-only` on the shared base. Implemented on `.cz-tf-input` and `.cz-tf-textarea` only. | A `<select>` always matches `:read-only` in CSS (it has no `readonly` attribute), so a base-level rule would apply the readonly treatment to every dropdown in the Admin Station. |
| A4 | 3 | §8.2 `AdminBodyBlock` and `fields/AdminBody.tsx` are **not** built. Phase 3 delivers the field layer only: `fields/types.ts`, `fields/AdminFieldGroup.tsx`, `fields/AdminField.tsx`, `fields/index.ts`. | The blueprint contradicts itself: §5 records that the block/renderer contract "largely exists" in `resources/ts/drawer-kit/schema/` (922 lines — `ShellSchema`, `ShellSlot`, `ShellEditSession`, `ShellEditorSchema`, `TableSchema`) and "needs a field-level layer beneath it, not a replacement", while §8.2 specifies a second block union. Building it would ship a consumer-less renderer competing with the live one, which is both the standing prohibition against a second drawer system and a breach of the abstraction-evidence rule in `AGENTS.md` (two genuine consumers required). The gap the audit actually measured — Gap 9, Gap 10 — is the field layer, and that is what Phase 3 delivers. |
| A9 | 5 | ~~Phase 5 step 5 deferred for lack of a browser.~~ **Superseded — the premise was wrong.** The `--admin-*` colour migration is complete and screenshot-verified. See A10. | The original reason given was that no browser was available. That was asserted without being tested and turned out to be false: headless Chrome is installed and renders the components fine. The genuine constraint is narrower — see A10. |
| A10 | 5 | The `--admin-*` **colour** migration is done in two verified groups (A: six neutrals, 58 references; B: six accent/status names, 32 references), and the 14 definitions they orphaned are deleted, taking the palette from 51 names to 37. The `.cz-admin-station` re-skin block is **retained**, and the remaining 37 `--admin-*` names stay. | The retained names have no `--station-*` counterpart: the 12px/16px type pair the station scale does not contain, the radii, the alpha-tint family, the depth and focus-ring family, and the action z-index. Migrating them would mean inventing station tokens, which is a design decision outside a CSS-ownership refactor. The re-skin block is what gives the shared module cards their station treatment; folding it while its base rules still serve those cards is a same-value move with real regression surface and no ownership gain. Both are recorded as intentional end state, not deferral. |
| A11 | 7 | The §13 matrix is verified for every row that does not require persisted records; rows needing live REST data are not. | The repository is a plugin directory — `wp-content/` holds only `plugins/` and `themes/`, with no WordPress core, `wp-config.php`, or container definition — so there is no runtime to serve `/wp-json`. Verified by rendering the real components in headless Chrome against the real built stylesheets in the real enqueue order: the eight field types across three sizes and seven states in both themes, focus-visible, and the drawer chrome (panel, backdrop, header, tab bar, module card, notes surface, inline editor session, record footer with split action and overflow). Not verified: the Service Catalogue table, Tier Workspace and Rate Sheet grid populated with real records. |
| A7 | 5b | Amendment A1 is superseded in part: the default control now carries `min-height: var(--station-field-min-h)` = `--station-control-height` = 38px. Horizontal padding stays 12px (the drawer value), not the 14px `--station-control-pad-x` used by station buttons and pills. | A1's reason was to keep Phase 2 non-visual, and it held for Phase 2. Phase 5b is the phase that unifies the families, and unification is only real if a drawer field and a station-page filter are the same control rather than two that resemble each other. The station controls declared 38px; the drawer controls declared no height. Adopting the station height and the drawer padding gives one control. `--station-control-pad-x` stays 14px for buttons and pills, which are not fields. |
| A8 | 5b | Cluster C listed `.cz-tier-deck__field` / `__field-label` as a fourth field-wrapper implementation to be consolidated. They are **retained** as feature layout. | They are not form fields. `resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx` renders them as read-only `<span>` label/value cells inside a deck row — a labelled data cell, not a control wrapper. Consolidating them into `.cz-tf-field` would have applied form-field spacing to a data grid. `.cz-tier-settings__field` and `.cz-rate-sheet-tool__field` from the same cluster *were* removed, because no component emits either class. |
| A6 | 4c | Phase 4c named `ServiceOverviewEditor`, `ServiceFaqsEditor` and `ServiceInclusionsEditor` as migration targets. Only the Overview editor's Title and Description become `AdminField`. The Category composite and both repeatable editors stay dedicated components and adopt the shared control base instead. | §E of this document requires exactly that outcome: a specialised component keeps its layout and consumes shared atomic controls rather than being flattened into metadata fields. The Category control transforms between a browse select and a create input and commits on Enter/blur; the FAQ and Inclusion editors are repeatable collections whose controls are label-less row cells with `autoFocus` and key handlers. Routing them through `AdminField` would require adding label suppression, focus and key-handler passthrough to `AdminFieldDef` — the "schema framework" §8 explicitly rules out. |
| A5 | 3 | The checkbox row class is `.cz-tf-field__inline` (an element inside the wrapper), not `.cz-tf-field--inline` (a modifier of it) as written in Phase 2. | A wrapper-level modifier put the row and the hint/error on the same flex row, so a checkbox could not carry a hint or a validation message. Nesting the row keeps hint and error reading beneath the control for all eight types. |

---

## 1. Executive finding

**Is Admin Station multiplying field and drawer styling?** Yes — but not where the brief assumed.

**Is the shell the problem?** No. The shell is small, coherent and already generic:

- There is exactly **one** drawer host — `resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx` (162 lines). No portal, no second implementation, no bypass path. Every drawer surface in the bundle resolves through it.
- There is exactly **one** drawer registry — `resources/ts/station-manager/registry/drawerTemplates.ts`:32-72 — with 9 registrations, 2 modes (`'view' | 'edit'`, `station-manager/drawerTypes.ts:13`) and 3 sizes (`'normal' | 'wide' | 'extra-wide'`, `drawerTypes.ts:21`).
- Drawer structural CSS is **148 lines** total (`admin-station.css:939-1086`), of which 28 are already dead.
- The competing directories the brief suspected (`resources/ts/components/admin/stations/service-drawer/`, `.../tier-drawer/`, `admin-station/stations/drawers/`) are **empty directories with zero files**, emptied by commit `34c8175`.

**Where is the multiplication?** Three places, in descending order of cost:

1. **Feature-level content inside the shell's own stylesheet.** `admin-station.css` is 2953 lines; **1866 of them (63%) are entity/feature CSS** — Service Catalogue, Tier Workspace, Tier lower deck, Tier settings, Rate Sheet tool. Of ~416 top-level selectors, **284 are feature selectors and only 132 are shell/drawer selectors**. Four of those feature families re-author the control layer the drawer kit already owns.

2. **Two disjoint token palettes bridged by a 127-line re-skin block.** The shell speaks `--station-*` (`admin-station.css` makes **635** `--station-*` references and **zero** `--admin-*` references). The drawer content speaks `--admin-*` (`drawer-kit.css` makes **258** `--admin-*` references and only 25 `--station-*`). Every control is therefore painted twice: once from `--admin-*` at `drawer-kit.css:693-745`, then repainted from `--station-*` at `drawer-kit.css:1502-1509`. The stated reason for that split — keeping a second consumer ("Command Centre") unchanged, `drawer-kit.css:1388-1391` — **is obsolete**: `.cz-admin-root` is emitted by no TS or PHP file anywhere in the repo (verified), so `.cz-admin-station` is drawer-kit.css's only live root.

3. **A shared field system that exists but is incomplete, so features route around it.** `.cz-tf-field / .cz-tf-label / .cz-tf-hint / .cz-tf-input / .cz-tf-select / .cz-tf-textarea` at `drawer-kit.css:661-745` is already the "one wrapper, one label, one hint, one control base" model, with ~114 usages across 10 editors. It has **no sizes, no readonly state, no error state, no required state, no checkbox control, and `:disabled` covers only `<input>` — not `<select>` or `<textarea>`** (`drawer-kit.css:723`). Authors fill the gaps with inline `style=` attributes and feature-local classes.

**Is consolidation feasible without rebuilding Admin Station?** Yes, and it does not require a new renderer. The shell, the host, the registry, the mode/size contract and the `cz-tf-*` family are all sound and should be kept. The work is: finish `cz-tf-*`, retire the second palette, migrate four feature control families onto the shared base, and delete verified-dead CSS.

**Important corrective on expectations.** This is *not* a "2000 lines → 500" situation. The 1866 lines of feature CSS are mostly legitimate domain layout (grid definitions for the Tier workspace's three-column engine, the lower-deck row grids, the Service Catalogue responsive table). Realistic net reduction across the 4951 in-scope lines is **7–11%** (see §14). The real return is the elimination of drift — 4 different focus rings, 4 different disabled opacities, 3 different control heights — not line count.

---

## 2. Current architecture map

### 2.1 Runtime chain (verified end to end)

```
compuzign-platform.php:31
 → app/bootstrap/init.php:9                       Plugin::boot()
 → src/Core/AssetLoader.php:83                    registers compuzign-admin-station (dep: compuzign-drawer-kit)
 → src/Modules/AdminStation/AdminStationModule.php:30-39   shortcode enqueues it
 → dist/js/admin-station.js  ⟵ vite.config.ts:20  resources/ts/modules/admin-station.ts
 → admin-station/AdminStation.tsx:21              <div class="cz-admin-station" data-station-theme>
 → shell/AdminStationLayout.tsx:35,43             AdminStationBody + AdminStationDrawer
 → shell/drawer/AdminStationDrawer.tsx:72         resolveDrawerTemplate(key)
 → station-manager/registry/drawerTemplates.ts:56 → 9 registered templates
```

### 2.2 Stylesheet cascade on an Admin Station page

Resolved order (`src/Core/AssetLoader.php`:15-124, `vite.config.ts:16-34`, `resources/ts/modules/admin-station.ts`:14-16):

| # | File | Lines | In scope |
|---|---|---|---|
| 1–10 | `atomic-engine/css/00-tokens … 09-utilities` | 745 | context only — global, **do not modify** |
| 11 | `dist/css/core.css` ⟵ `resources/css/core.css` | 4 | no |
| 12 | `dist/css/cost-builder.css` | 3060 | no — loaded unconditionally, inert here |
| 13 | `dist/css/homepage.css` | 2115 | no — loaded unconditionally, inert here |
| 14 | `dist/css/drawer-kit.css` ⟵ `resources/css/modules/drawer-kit.css` | **1514** | **yes** |
| 15 | `dist/css/admin-station.css` = tokens + base + responsive concatenated | **3437** | **yes** |

Because the shortcode fires after `wp_head`, 14 and 15 print as late styles and always win the cascade. `atomic-engine/css/atomic-engine.css` (the `@import` barrel) is **never enqueued** — the 10 partials are enqueued individually at `AssetLoader.php:96-109`.

**In-scope total: 4951 lines** (`admin-station-tokens.css` 220 + `admin-station.css` 2953 + `admin-station-responsive.css` 264 + `drawer-kit.css` 1514).

### 2.3 `admin-station.css` section map (2953 lines)

| Lines | Region | Bucket | Count |
|---|---|---|---|
| 1–18 | file header | comment | 18 |
| 19–228 | shell frame, header, nav pills, icon buttons, dropdowns, body, footer | shell | 210 |
| 229–417 | home shell, presentation region, walls, group tabs, empty states | shell | 189 |
| 418–493 | status pill + status notifications | shell presentation | 76 |
| 494–545 | metric row | shell presentation | 52 |
| 546–679 | split action | shell presentation | 134 |
| 680–853 | Category Group card grid + card (`cz-cg-*`) | shell presentation | 174 |
| 854–938 | slide menu | shell | 85 |
| **939–1086** | **shared drawer: layer, backdrop, panel, head, title, close, tabs, body, state, foot, sizes** | **drawer** | **148** |
| 1087–1472 | Service Catalogue | feature | 386 |
| 1473–1497 | Service Category carousel | feature (suspect dead) | 25 |
| 1498–1570 | Service Category card | feature | 73 |
| 1571–2057 | Tier Workspace engine | feature | 487 |
| 2058–2586 | Tier Workspace lower deck | feature | 529 |
| 2587–2792 | Tier settings | feature | 206 |
| 2794–2812 | Tier drawer setup | feature | 19 |
| 2813–2953 | Rate Sheet authoring tool | feature | 141 |

**Shell 920 (31%) · drawer 148 (5%) · feature 1866 (63%).**

### 2.4 `drawer-kit.css` section map (1514 lines)

| Lines | Region | Count |
|---|---|---|
| 1–153 | `--admin-*` token block on `.cz-admin-root, .cz-admin-station` | 153 |
| 154–172 | file header | 19 |
| 174–302 | admin nav item, status dot, `cz-ws-header`, `.cz-admin-btn`, loading/error/ok/empty | 129 |
| 306–343 | `cz-sc-table`, `cz-price-tag` | 38 |
| 344–410 | publish-confirm dialog | 67 |
| 411–455 | `cz-action-shell` (mostly legacy host) | 45 |
| 456–552 | `InlineEditorShell` (`cz-ies`) + inline-edit list/row/faq | 97 |
| 553–660 | `cz-req-detail`, `cz-shell-section`, `cz-sp-tier-table` | 108 |
| **661–825** | **shared field system (`cz-tf-*`) + tf footer** | **165** |
| 826–957 | `cz-footer-split` (record footer grammar) | 132 |
| 958–1010 | inclusion pool, faq list, addon row | 53 |
| 1011–1063 | promo table, `cz-sv-tabs` (the live drawer tab bar) | 53 |
| 1064–1119 | module status pill, skeleton | 56 |
| 1120–1149 | media query, module notes, chip | 30 |
| 1150–1317 | `drawerModule` + `drawerOverview` read cards | 168 |
| 1318–1342 | media query | 25 |
| 1343–1387 | `cz-manager-*` overrides | 45 |
| **1388–1514** | **`.cz-admin-station` host re-skin block** | **127** |

### 2.5 Component ownership

| Layer | Files | Verdict |
|---|---|---|
| Station shell | `admin-station/AdminStation.tsx`, `AdminStationContext.tsx`, `shell/AdminStationLayout|Header|Body|Footer|SlideMenu|Dropdown.tsx`, `theme/useStationTheme.ts` | Generic. Keep. |
| Drawer host | `admin-station/shell/drawer/AdminStationDrawer.tsx`, `AdminStationDrawerContext.tsx` | Generic, entity-agnostic. Keep. |
| Registry | `station-manager/registry/drawerTemplates.ts`, `templateKits.ts`, `surfaceBindings.ts`, `navigation.ts`, `boot.ts`, `drawerTypes.ts` | Generic. Keep. |
| Drawer kit — structure | `drawer-kit/EntityDrawer.tsx`, `entityDrawerHost.ts`, `DrawerTabs.tsx`, `InlineEditorShell.tsx`, `ReadBlock.tsx`, `ActionFooter.tsx`, `EntityActionFooter.tsx`, `CanonicalEntityFooter.tsx` | Generic. Keep. |
| Drawer kit — schema renderer | `drawer-kit/schema/types.ts` (229 lines), `elements/library.ts`, `elements/modeRenderers.tsx`, `shells/*`, `presentation.ts`, `modeContext.tsx` — 922 lines total | Generic renderer contract already exists. Keep and extend. |
| Drawer kit — leaking entity knowledge | `drawer-kit/utils/moduleStatus.tsx:17-23` imports `@/package-station/types`, `@/service-station/types`; `drawer-kit/utils/moduleNotifications/{service,package,tier,promotion,category,packageFamily}.ts`; `schema/types.ts:182` hardcodes an entity-id union | Out of CSS scope, but note for a later pass. |
| Entity editors (the field consumers) | `entity-drawers/editors/CategoryOverviewEditor.tsx`, `service-station/drawer/editors/{ServiceOverview,ServiceFaqs,ServiceInclusions}Editor.tsx`, `package-station/drawer/editors/{TierOverview,TierRegistration,TierInclusionQuantity,PackageFamilyOverview,PoolInclusions,PoolFaqs}Editor.tsx` | 10 files, all already using `cz-tf-*`. Migration targets. |

---

## 3. Evidence table

| Area | File | Component / selector | Current responsibility | Problem | Recommended owner |
|---|---|---|---|---|---|
| Tokens | `resources/css/modules/drawer-kit.css`:15-153 | `.cz-admin-root, .cz-admin-station { --admin-* }` | Defines 86 `--admin-*` tokens | `.cz-admin-root` emitted nowhere; 35 of 86 tokens unused (41%); second palette competing with `--station-*` | Merge into Admin Station token file; keep only tokens with live drawer consumers |
| Tokens | `resources/ts/admin-station/styles/admin-station-tokens.css`:1-220 | `--station-*` (81 tokens) | Shell + theme palette | Healthy — 79/81 used, 672 references. Missing field-system tokens (sizes, states) | **Keep. Single token owner.** |
| Tokens | `drawer-kit/InlineEditorShell.tsx:59`, `service-station/drawer/ServiceDrawerDialogs.tsx:116` | `var(--admin-text-secondary)`, `var(--cz-text-sm)` | Inline styles | **Both tokens are undefined anywhere in the repo** — these declarations silently do nothing | Fix to `--admin-text-muted` / `--cz-font-size-sm` (or station equivalents) |
| Control base | `drawer-kit.css:693-745` | `.cz-tf-input, .cz-tf-select, .cz-tf-textarea` | The shared control | Painted with `--admin-*`, then immediately repainted with `--station-*` at `:1502-1509`. No sizes. `:disabled` at `:723` covers `<input>` only | Drawer/content CSS — single definition on `--station-*` |
| Control re-skin | `drawer-kit.css:1388-1514` | `.cz-admin-station .cz-tf-*`, `.drawerModule*`, `.cz-ies*`, `.cz-sv-tab*` | Re-skins the whole kit for the station | Exists solely to preserve a second consumer that no longer exists | Fold into base rules; delete the wrapper |
| Feature control | `admin-station.css:1191-1273` | `.cz-service-catalogue__toolbar select`, `__search`, `__reset`, `__page-controls select|button` | Toolbar controls | Re-authors border/radius/height/background/focus/disabled that `cz-tf-*` owns | Shared field CSS + a small feature layout rule |
| Feature control | `admin-station.css:2217-2253` | `.cz-tier-deck__control`, `--search`, `:focus-visible`, `:disabled`, `::placeholder` | Lower-deck filters | Full parallel control family with a **different focus ring** and **different background** | Shared field CSS |
| Feature control | `admin-station.css:1613-1632` | `.cz-tier-workspace__scope-select` | Scope selector | **`height: 42px` hard-coded** while `--station-control-height: 38px` exists; different border and background | Shared field CSS + one accent variant |
| Feature wrapper | `admin-station.css:2819-2829` | `.cz-rate-sheet-tool__field`, `__field-label` | Field wrapper + label | Duplicates `.cz-tf-field` / `.cz-tf-label` with different label weight (700 vs 400) and size (13px vs 12px) | Shared field CSS |
| Feature wrapper | `admin-station.css:2769-2780` | `.cz-tier-settings__field`, `__field label` | Field wrapper + label | Duplicates `.cz-tf-field` with `gap: 5px` vs `6px` — accidental drift | Shared field CSS |
| Feature wrapper | `admin-station.css:2532-2545` | `.cz-tier-deck__field`, `__field-label` | Row field + label | Fourth wrapper implementation | Shared field CSS (layout modifier may stay) |
| Dead CSS | `admin-station.css:1014-1041` | `.cz-station-drawer__tabs`, `__tab`, `__tab--active` | Drawer tab bar | **No TSX emits these classes**; the live tab bar is `.cz-sv-tabs` from `drawer-kit/DrawerTabs.tsx:20-36` | Delete (28 lines) |
| Dead CSS | `drawer-kit.css:1343-1387` | `.cz-manager-*` (7 families), `.cz-rate-sheet-editor__*` | Legacy manager overrides | Zero source references for every class | Delete (~45 lines) |
| Dead CSS | `drawer-kit.css:411-455, 815-820` | `.cz-action-shell--drawer`, `__panel`, `__body` | Legacy drawer host | Only `.cz-action-shell__back` is live (`InlineEditorShell.tsx:33`) | Delete the host parts (~30 lines) |
| Dead CSS | `drawer-kit.css:199-202, 579, 657-659, 747-751, 996-1000, 1011-1014, 1141-1145` | `.cz-ws-header`, `.cz-tf-count`, `.cz-sp-browse-area`, `.cz-sp-search-wrap`, `.cz-tf-price-row`, `.cz-tf-addon-row`, `.cz-promo-table__actions`, `.cz-tf-chip__edit` | Assorted | Zero source references | Delete (~25 lines) |
| Inline styles | 20 sites across 11 files; e.g. `package-station/drawer/editors/TierOverviewEditor.tsx:72,75` | `style="flex-direction: row; align-items: center; …"`, `style="margin: 0"` | Patching missing checkbox layout | The field system has no checkbox/inline variant, so authors patch inline | Add a checkbox control + inline modifier; remove the inline styles |
| Wrong class | `package-station/drawer/editors/TierOverviewEditor.tsx:69` | `<textarea class="cz-tf-input" rows={3}>` | Multi-line field | Textarea wearing the input class — loses `resize`, `min-height`, `line-height` from `drawer-kit.css:741-745` | Fix to `.cz-tf-textarea` |
| Missing state | repo-wide | `:read-only`, `[required]`, `aria-invalid` | — | **Zero CSS anywhere.** `readOnly` used 5× and `required` 4× in TSX and render identically to normal fields | Shared field CSS |
| Panel drift | `admin-station.css` — 14 rules | `.cz-cg-card:705`, `.cz-tier-deck:2064`, `.cz-tier-deck__row:2334`, `.cz-tier-deck__disclosure:2368`, `.cz-tier-settings__nav:2602`, `.cz-rate-sheet-tool__groups:2852`, `.cz-rate-sheet-tool__picker:2907`, `.cz-tier-workspace__family:1723`, `.cz-service-stats:1103`, `.cz-service-catalogue__pagination:1451`, +4 | Surface panels | The same `border + radius + background` trio re-declared 14 times | A `.cz-station-panel` shared surface, or a composite token |
| Unwired component | `admin-station/home/AdminStationGroups.tsx:74-76` + `admin-station.css:328-400` | `.cz-station-groups`, `.cz-station-tab` | Group tablist | `AdminStationBody.tsx:40-46` never passes `groups`, so the component always returns `null`; ~73 lines of CSS unreachable | Investigate — restore wiring or delete |
| Unwired kit | `admin-station/register.ts:46` + `admin-station.css:1473-1497` | `service-category-carousel` | Template kit | Registered, but no surface binding names that key (only `category-group-cards`, `service-catalogue`, `tier-workspace` at `register.ts:68,81,95`) | Investigate — 25 lines |
| Out of scope | `atomic-engine/css/06-forms.css:1-49` | `.cz-field`, `.cz-select`, `.cz-textarea`, `.cz-label`, `.cz-form-grid` | Global form family | **Zero references anywhere in the repo** — entirely dead, but it is a global asset | Note only. **Do not touch** (outside Admin Station). |

---

## 4. Duplication clusters

### Cluster A — the control base is defined twice (the central problem)

| | Selector | File:lines | border | radius | background | color | focus |
|---|---|---|---|---|---|---|---|
| A1 | `.cz-tf-input, .cz-tf-select, .cz-tf-textarea` | `drawer-kit.css:693-709` | `1px solid var(--admin-border-blue)` | `var(--admin-radius)` = **4px** | `transparent` | `var(--admin-text)` | `--admin-accent` border + `--admin-white-a05` bg (`:711-716`) |
| A2 | `.cz-admin-station .cz-tf-input, …` | `drawer-kit.css:1502-1509` | `var(--station-border)` | `var(--station-control-radius)` = **14px** | `var(--station-surface)` | `var(--station-text)` | *(not overridden — A1's focus survives)* |

**Verdict: exact-purpose duplication.** Every declaration in A1 that matters visually is overwritten by A2 in the only live context. The focus treatment is *not* overridden, so controls in Admin Station get a station-coloured resting state and an `--admin-*`-coloured focus state. Recommended owner: one definition in drawer/content CSS on `--station-*`.

### Cluster B — four parallel control families

| Family | File:lines | height | padding-inline | border | radius | background | focus | disabled |
|---|---|---|---|---|---|---|---|---|
| `cz-tf-*` | `drawer-kit.css:693-745` + `:1502-1509` | none (`padding: 8px 12px`) | 12px hard-coded | `--station-border` | `--station-control-radius` | `--station-surface` | border-colour + bg tint | `opacity:0.38` — **input only** |
| `.cz-service-catalogue__*` | `admin-station.css:1191-1273` | `min-height: var(--station-control-height)` (38px) | `var(--station-control-pad-x)` | `--station-border` | `--station-control-radius` | `--station-surface-elevated` | `outline: 2px solid var(--station-focus-ring)`, offset 2px | `opacity: var(--station-disabled-opacity)` (0.5) |
| `.cz-tier-deck__control` | `admin-station.css:2217-2253` | `height: var(--station-control-height)` (38px) | `var(--station-control-pad-x)` | `--station-border` | `--station-control-radius` | `--station-surface` | `outline:none` + accent border + `box-shadow: 0 0 0 3px` | `opacity: var(--station-disabled-opacity)` (0.5) |
| `.cz-tier-workspace__scope-select` | `admin-station.css:1613-1632` | **`42px` hard-coded** | `var(--station-control-pad-x)` | `--station-accent-border` | `--station-control-radius` | `--station-accent-soft-bg` | `outline: 2px solid var(--station-focus-ring)` | none |

**Verdict: near-exact with accidental drift.** Border and radius agree; heights are 38 / 38 / 42 / implicit; backgrounds are elevated / surface / accent-soft / surface; focus rings are all different. The scope-select's accent treatment is *intentionally* different (it marks the active scope) — that is a legitimate variant, not a separate family. Recommended owner: shared field CSS with one accent modifier.

### Cluster C — four field wrappers, five labels

| Wrapper | File:lines | display | gap | other |
|---|---|---|---|---|
| `.cz-tf-field` | `drawer-kit.css:667-676` | flex column | **6px** | `margin-bottom: var(--cz-space-4)` |
| `.cz-rate-sheet-tool__field` | `admin-station.css:2819-2824` | flex column | **6px** | `max-width: 420px` |
| `.cz-tier-settings__field` | `admin-station.css:2769-2774` | flex column | **5px** | `width: 100%` |
| `.cz-tier-deck__field` | `admin-station.css:2532-2545` | flex column | — | row-context layout |

| Label | File:lines | font-size | weight | colour |
|---|---|---|---|---|
| `.cz-tf-label` | `drawer-kit.css:678-684` | `--admin-fs-s-label` (12px) | `--admin-fw-normal` (400) | `--admin-text-faint` |
| `.cz-rate-sheet-tool__field-label` | `admin-station.css:2826-2829` | `--station-text-sm` (13px) | **700** | inherit |
| `.cz-tier-settings__field label` | `admin-station.css:2776-2780` | `--station-text-sm` (13px) | **700** | `--station-text` |
| `.cz-tier-deck__field-label` | `admin-station.css:2537` | — | — | — |
| `.cz-service-stat__label` | `admin-station.css:1164-1178` | — | — | — |

**Verdict: near-exact, drifted.** `5px` vs `6px` gap and `400` vs `700` label weight are unintentional. `max-width: 420px` and the row layout are legitimate feature concerns and should survive as modifiers.

### Cluster D — focus rings: 4 distinct implementations

| # | Treatment | Sites |
|---|---|---|
| 1 | `outline: 2px solid var(--station-focus-ring); outline-offset: 2px` | `admin-station.css:118-124`, `605-609`, `1265-1273`, `1629-1632`, `1661-1663` |
| 2 | `outline: none; border-color: var(--station-accent-border); box-shadow: 0 0 0 3px var(--station-accent-soft-bg)` | `admin-station.css:2233-2237` |
| 3 | `border-color: var(--admin-accent); background: var(--admin-white-a05)` | `drawer-kit.css:711-716` |
| 4 | `outline: 2px solid var(--station-nav-accent-strong)` | `admin-station.css:1484-1486` |

Plus bare `outline: none` with no replacement at `drawer-kit.css:267-268`, `442-443`, `908`, `1059-1060` and `admin-station.css:882`, `968`, `1234`, `1552` — several of which are accessibility gaps.

### Cluster E — disabled: 4 distinct opacities

| Opacity | Sites |
|---|---|
| `0.38` | `drawer-kit.css:723-726` (`.cz-tf-input` only) |
| `0.45` | `drawer-kit.css:262-264`, `900-903`, `953-955`, `1232` |
| `var(--station-disabled-opacity)` = `0.5` | `admin-station.css:1259-1262`, `2239-2242` |
| none (cursor only) | `admin-station.css:383-384`, `578-581`, `648-650` |

### Cluster F — the surface-panel trio, 14×

`border: 1px solid var(--station-border)` + a radius token + a surface token, re-declared at `admin-station.css:458, 705, 1103, 1203, 1451, 1643, 1723, 2064, 2227, 2334, 2368, 2602, 2852, 2907`. (`--station-border` appears 22×, `--station-card-radius` 17×, `--station-surface-elevated` 15×.)

### Cluster G — record footer components

`drawer-kit/EntityActionFooter.tsx` is the canonical grammar. `CanonicalEntityFooter.tsx:24-87` wraps it; `service-station/drawer/ServiceDrawerFooter.tsx:40-57` **duplicates `CanonicalEntityFooter.tsx:68-85`** near-identically (same Disable/Enable/Trash ladder, same tone rule, same overflow) with only a `tab === 'details' && isLiveState` gate as a genuine addition. `entity-drawers/category/CategoryDrawerFooter.tsx:1-3` is a 3-line re-export shim. `package-station/drawer/tier/TierDrawerFooter.tsx` is legitimately different (Tier lifecycle, not `platformStatus`). *(TSX-level, not CSS — flagged for completeness.)*

---

## 5. Existing assets worth preserving

Do not rebuild any of these:

1. **Drawer host** — `admin-station/shell/drawer/AdminStationDrawer.tsx`. Owns scroll lock (`:53-70`), Escape (`:60-63`), focus restore (`:57-58,68`), close guard (`:47-51`), mode clamping (`:119-121`), content remount key (`:134`), unresolved-key fallback (`:150-162`). No portal needed — `position: fixed` on the layer.
2. **Registry + two-phase lock** — `station-manager/registry/drawerTemplates.ts:32-72`, `boot.ts:72-94`. Rejects duplicate keys and empty mode lists at registration.
3. **Mode/size contract** — `station-manager/drawerTypes.ts:13,21,63-71`. Two modes, three sizes, `size?` defaulting to `normal`. Correct and minimal.
4. **`cz-tf-*` field family** — `drawer-kit.css:661-745`. Already the right shape; ~114 usages across 10 editors. Extend, do not replace.
5. **Schema renderer** — `drawer-kit/schema/` (922 lines). `ShellSchema`, `ShellSlot`, `ShellEditSession` (`types.ts:98-110`), `ShellEditorSchema` (`:112-114`), `TableSchema`/`ColumnDef`/`RowActionDef` (`:129-154`). The block/renderer contract the brief asks for **largely exists**; it needs a field-level layer beneath it, not a replacement.
6. **`--station-*` token file** — `admin-station-tokens.css`. 81 tokens, 79 used, light/dark themes, well documented. This is the surviving palette.
7. **`EntityActionFooter` + `InlineEditorShell`** — the three-level footer model (record footer / module-card footer / edit-session footer) is correct and deliberate, not duplication.
8. **Stylesheet load order** — the `compuzign-drawer-kit` → `compuzign-admin-station` dependency at `AssetLoader.php:83` and the late-print behaviour give the station's own sheet the last word. Preserve exactly.

---

## 6. Gaps

What is genuinely missing:

| # | Gap | Evidence |
|---|---|---|
| 1 | **Control sizes.** No `--small` / `--large` modifier exists anywhere. | Zero size modifiers in either sheet; heights are 38px (token, 2 sites), 42px (hard-coded, 1 site), implicit-from-padding (`cz-tf-*`) |
| 2 | **Readonly state.** No `:read-only` rule anywhere. | `readOnly` used 5× in TSX (e.g. `TierOverviewEditor.tsx:51`, `PoolInclusionsEditor.tsx:82`, `TierInclusionQuantityEditor.tsx:32`); renders identically to editable |
| 3 | **Error/invalid state on controls.** | No `aria-invalid`, `.is-invalid` or `--error` control rule. Only `.cz-admin-error-msg` (`drawer-kit.css:279-287`) and an inline-styled error paragraph at `ServiceOverviewEditor.tsx:160` |
| 4 | **Required affordance.** | `required` used 4× in TSX; no CSS |
| 5 | **Disabled on `<select>` / `<textarea>`.** | `drawer-kit.css:723` targets `.cz-tf-input:disabled` only |
| 6 | **Checkbox control.** | Only `admin-station.css:2249-2253` (`.cz-tier-deck input[type="checkbox"]`, feature-scoped). Drawer checkboxes are unstyled and laid out with inline `style=` (`TierOverviewEditor.tsx:72-75`) |
| 7 | **Hover state on controls.** | No `:hover` on any `cz-tf-*` control |
| 8 | **One token palette.** | Two disjoint palettes; the bridge is a 127-line re-skin block |
| 9 | **A shared field component in TS.** | No `Field`/`Input`/`Control` component exists. All 10 editors hand-author `<div class="cz-tf-field"><label class="cz-tf-label">…<input class="cz-tf-input">` — which is exactly why `TierOverviewEditor.tsx:69` could ship a `<textarea class="cz-tf-input">` |
| 10 | **A field-definition type.** | `ShellEditSession` (`schema/types.ts:98-110`) describes the *session*, not the *fields*. No field-level schema exists |

What is **not** missing, contrary to the brief's premise: a drawer shell, a drawer host, a registry, mode/size handling, a block renderer, or a token system.

---

## 7. Target architecture

The proposed ownership model in the brief is **correct with three corrections**.

### 7.1 Admin Station shell CSS — `admin-station.css` + `admin-station-tokens.css` + `admin-station-responsive.css`

Owns: station layout, header, nav, body, footer, slide menu, presentation surfaces, station tabs, drawer layer, backdrop, drawer placement, drawer widths, station breakpoints, **and the single token palette**.

**Correction 1 — the shell must own the tokens outright.** `admin-station-tokens.css` becomes the only token definition site for Admin Station. `drawer-kit.css`'s `--admin-*` block is reduced to the subset that has live drawer consumers and no `--station-*` equivalent, or removed entirely.

**Correction 2 — the shell should stop hosting feature CSS.** 1866 of `admin-station.css`'s 2953 lines are entity CSS. The end state splits them out (see §11). This is a file-organisation change, not a cascade change — `vite.config.ts` bundles the imports in order, so splitting is safe.

### 7.2 Drawer / content CSS — `drawer-kit.css`

Owns: drawer content sections, overview modules (`drawerModule`/`drawerOverview`), field grids, field wrappers, labels, hints, **control appearance, states, and sizes**, validation presentation, inline-edit layouts, drawer action footer contents.

**Correction 3 — `drawer-kit.css` is now Admin-Station-exclusive.** `.cz-admin-root` is emitted nowhere (verified: the only three occurrences in the repo are inside `drawer-kit.css` itself at `:4`, `:7`, `:15`). The "shared with Command Centre" premise at `drawer-kit.css:1388-1391` is obsolete. It stays a separate Rollup entry (`vite.config.ts:26`) — that's a valid caching decision — but it may target `.cz-admin-station` directly and consume `--station-*`.

### 7.3 Entity / feature CSS

Owns only: genuine domain layout — the Tier workspace three-column engine grid, lower-deck row grids, Rate Sheet table structure, Service Catalogue responsive table, inclusion grouping, entity status presentation.

Must stop owning: input borders, input heights, focus rings, select styling, textarea styling, label styling, disabled states, generic drawer spacing, generic footer buttons.

**Where the model would be wrong:** two cases.
- `.cz-tier-workspace__scope-select`'s accent treatment (`admin-station.css:1613-1627`) is a *deliberate* semantic signal (this control names the active scope). It should become a shared `--accent` modifier on the control base, not be flattened away.
- `.cz-tier-deck input[type="checkbox"]` (`admin-station.css:2249-2253`) sets `accent-color` for a dense data grid. Once a shared checkbox control exists this becomes a modifier, but the *sizing* (16px in a compact row) is legitimate feature layout.

### 7.4 Target cascade (unchanged in order, changed in content)

```
atomic-engine/*                    global, untouched
  ↓
dist/css/drawer-kit.css            drawer + content + shared fields  → consumes --station-*
  ↓
dist/css/admin-station.css         tokens → shell → features → responsive
```

---

## 8. TypeScript contracts

Minimal, additive. These sit *beneath* the existing `ShellSchema` layer — they do not replace it.

### 8.1 Field contract — new file `resources/ts/drawer-kit/fields/types.ts`

```ts
// The eight verified control types. Verified against every <input>, <select>
// and <textarea> in Admin Station scope: text, number, search, checkbox are in
// live use; email, tel are not yet used but are native and cost nothing;
// select and textarea are in live use. No date, radio, file, range, colour or
// password control exists in Admin Station today.
export type AdminFieldType =
  | 'text' | 'number' | 'email' | 'tel'
  | 'search' | 'select' | 'textarea' | 'checkbox';

export type AdminFieldSize = 'small' | 'default' | 'large';

export interface AdminFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AdminFieldDef {
  id: string;                       // DOM id + label `for`
  type: AdminFieldType;
  label: string;
  size?: AdminFieldSize;            // default 'default'
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  error?: string | null;            // presence drives the invalid presentation
  options?: AdminFieldOption[];     // select only
  rows?: number;                    // textarea only
  min?: number; max?: number; step?: number;   // number only
}

// Binding is deliberately separate from definition so a definition can be a
// static constant while the value stays in the owning controller's draft.
export interface AdminFieldBinding<V = string> {
  value: V;
  onChange: (next: V) => void;
}
```

### 8.2 Body block contract — extends the existing renderer

```ts
// resources/ts/drawer-kit/fields/blocks.ts
import type { ComponentChildren } from 'preact';
import type { AdminFieldDef, AdminFieldBinding } from './types';

export type AdminBodyBlock =
  | { kind: 'overview';  items: { label: string; value: ComponentChildren }[] }
  | { kind: 'fields';    fields: AdminFieldDef[] }
  | { kind: 'group';     title: string; description?: string; blocks: AdminBodyBlock[] }
  | { kind: 'list';      items: ComponentChildren[]; empty?: string }
  | { kind: 'notice';    tone: 'info' | 'warning' | 'error' | 'success'; message: string }
  // The escape hatch. Rate Sheet grids, relationship pickers, repeatable
  // collections and drag-and-drop editors render here and are NOT expressed
  // as metadata fields.
  | { kind: 'custom';    render: () => ComponentChildren };
```

### 8.3 Component surface

```ts
// resources/ts/drawer-kit/fields/AdminField.tsx
export function AdminField<V = string>(
  props: { def: AdminFieldDef } & AdminFieldBinding<V>
): ComponentChildren;

// resources/ts/drawer-kit/fields/AdminFieldGroup.tsx  — the wrapper + label + hint + error shell
// resources/ts/drawer-kit/fields/AdminBody.tsx        — renders AdminBodyBlock[]
```

**Explicitly out of scope:** no validation engine, no schema compiler, no page builder, no universal form runtime. Validation stays where it lives today — in the entity controllers (`useCategoryDrawerController.ts` and peers) — and reaches the field only as `error?: string`.

---

## 9. CSS and token contract

### 9.1 Selector model (the complete shared field surface)

```
.cz-tf-form                          form stack                       (exists)
.cz-tf-field                         wrapper                          (exists)
.cz-tf-field--inline                 label beside control (checkbox)  NEW — replaces inline style=
.cz-tf-label                         label                            (exists)
.cz-tf-label--required::after        required marker                  NEW
.cz-tf-hint                          hint                             (exists)
.cz-tf-error                         validation message               NEW
.cz-tf-control                       shared base for input/select/textarea/checkbox   NEW alias
  .cz-tf-input / .cz-tf-select / .cz-tf-textarea / .cz-tf-checkbox    (3 exist, checkbox NEW)
.cz-tf-control--sm / --lg            two size modifiers (default unmodified)          NEW
.cz-tf-control--accent               the scope-select treatment                       NEW
states: :hover  :focus-visible  :disabled  :read-only  [aria-invalid='true']          NEW (4 of 5)
```

Nine base selectors, two size modifiers, one variant, five states — **not 24 authored combinations**.

### 9.2 Token contract — the smallest useful addition

Add to `admin-station-tokens.css` (one owner). Existing tokens reused wherever possible:

```css
/* Field system — the only new tokens required. */
--station-field-height-sm:  30px;
--station-field-height:     var(--station-control-height);   /* 38px, exists */
--station-field-height-lg:  46px;
--station-field-pad-x-sm:   10px;
--station-field-pad-x:      var(--station-control-pad-x);    /* 14px, exists */
--station-field-pad-x-lg:   16px;
--station-field-gap:        6px;    /* settles the 5px/6px wrapper drift */
--station-field-radius:     var(--station-control-radius);   /* 14px, exists */
--station-field-bg:         var(--station-surface);
--station-field-border:     var(--station-border);
--station-field-ring:       var(--station-focus-ring);       /* exists */
--station-field-error:      var(--station-status-inactive-fg);   /* exists */
--station-field-error-bg:   var(--station-status-inactive-bg);   /* exists */
--station-field-disabled-opacity: var(--station-disabled-opacity); /* 0.5, exists */
```

**11 new names, 8 of them aliases over existing tokens.** Everything else the field system needs (`--station-text`, `--station-text-muted`, `--station-text-sm`, `--station-accent-*`) already exists.

### 9.3 One focus ring, one disabled treatment

Standardise on the treatment already used by 5 shell sites:

```css
:focus-visible { outline: 2px solid var(--station-field-ring); outline-offset: 2px; }
:disabled, [aria-disabled='true'] { opacity: var(--station-field-disabled-opacity); cursor: not-allowed; }
```

This retires focus variants 2, 3 and 4 and disabled opacities `0.38` and `0.45` inside Admin Station. `0.45` on `.cz-admin-btn` is a *button* concern — leave it unless the same pass covers buttons.

### 9.4 Token namespace resolution

| Namespace | Defined | Used | Decision |
|---|---|---|---|
| `--station-*` | 81 (`admin-station-tokens.css`) | 672 refs, 79/81 used | **Survives. Sole owner.** |
| `--admin-*` | 86 (`drawer-kit.css:15-153`) | 258 refs, all inside `drawer-kit.css`; **35 unused** | Delete the 35 dead. Migrate the ~51 live ones to `--station-*` equivalents; keep only names with no equivalent. |
| `--cz-*` | 58 (`atomic-engine/css/00-tokens.css`) | 121 refs from admin sheets | **Untouched** — global asset, outside Admin Station scope. Admin keeps consuming spacing/motion from it. |

Dead `--admin-*` tokens to delete (35): `--admin-accent-a30`, `--admin-depth-2`, `--admin-depth-drawer`, `--admin-error-a04/a06/a07/a08/a12/a15`, `--admin-font`, `--admin-fs-heading`, `--admin-fs-icon`, `--admin-fs-icon-l`, `--admin-fs-l-heading`, `--admin-fs-l-label`, `--admin-fs-l-sub`, `--admin-fs-s-heading`, `--admin-fw-light`, `--admin-lh-l-heading`, `--admin-lh-l-label`, `--admin-lh-l-sub`, `--admin-sidebar-border`, `--admin-sidebar-collapsed-w`, `--admin-sidebar-w`, `--admin-space-cell-h`, `--admin-space-cell-v`, `--admin-space-header-v`, `--admin-status-h`, `--admin-success-a07`, `--admin-success-a12`, `--admin-topbar-h`, `--admin-warning-a30`, `--admin-z-overlay`, `--admin-z-sidebar`, `--admin-z-topbar`.

Note the shape of that list: `sidebar-w`, `topbar-h`, `z-sidebar`, `z-topbar`, `status-h`, `cell-v/h` are all **Command Centre chrome** — direct confirmation that the `--admin-*` palette is a residue of the removed admin page.

---

## 10. Migration blueprint

### Phase 0 — Baseline and safety net

- **Objective:** a reproducible before-state.
- **Files:** none modified.
- **Actions:**
  1. `npx tsc --noEmit`; `npm run build`; `npm run docs:check`.
  2. Contract scripts: `contract:package-family-capability`, `contract:package-tier-workspace`, `contract:tier-instance-scope`, `contract:tier-instance-tool`, `contract:rate-sheet-tool`, `contract:tier-occupant-admin`, `contract:cost-builder-isolation`; `php tests/tier-capability-invariants.php`.
  3. Record `wc -l` for the four in-scope sheets and `dist/css/{admin-station,drawer-kit}.css`.
  4. Capture reference screenshots — light and dark, at 1440 / 1100 / 767 / 560px — for: Service Catalogue surface; Tier Workspace (Focus and Grid); Tier lower deck (Details, Connections, Settings); and the drawers listed in §13.
- **Risks:** none.
- **Verification:** all commands green; screenshots archived.
- **Done when:** baseline metrics and images are stored outside the repo.

### Phase 1 — Freeze ownership boundaries

- **Objective:** stop the bleeding before changing anything.
- **Files:** `docs/code-map/admin-station-styles.md` (modify), `resources/ts/admin-station/CLAUDE.md` and `resources/ts/drawer-kit/CLAUDE.md` (create or modify).
- **Actions:** document the §7 three-way split; add the rule "feature CSS must not declare `border`, `border-radius`, `height`, `min-height`, `outline`, `box-shadow`, `background` or `color` on an `input`, `select`, `textarea` or `label`"; correct `docs/code-map/admin-station-drawer.md`, whose registration table lists 6 keys and omits `tier-inclusion`, `tier-rate-sheet` and `tier-rate-sheet-group`.
- **Risks:** none (documentation only).
- **Done when:** the boundary is written down and the drawer code map matches `register.ts`.

### Phase 2 — Establish shared field primitives (CSS only)

- **Objective:** make `cz-tf-*` complete enough that nothing needs to route around it.
- **Files:** `resources/ts/admin-station/styles/admin-station-tokens.css` (modify — add §9.2 tokens); `resources/css/modules/drawer-kit.css`:661-745 (modify — extend the field block).
- **Actions:**
  1. Add the 11 field tokens.
  2. Extend `drawer-kit.css:693-745`: add `.cz-tf-control` as the shared base; add `--sm` / `--lg`; add `--accent`; extend `:disabled` to select and textarea; add `:hover`, `:read-only`, `[aria-invalid='true']`; add `.cz-tf-checkbox` and `.cz-tf-field--inline`; add `.cz-tf-error` and `.cz-tf-label--required`.
  3. **Do not delete anything yet.** Existing selectors keep working.
- **Dependencies:** Phase 1.
- **Risks:** Low. Additive only. The one hazard is `.cz-tf-control` colliding with an existing class — verified it does not exist today.
- **Verification:** `npm run build`; visually diff every drawer against Phase 0 screenshots — **nothing should change yet**.
- **Done when:** the complete field surface in §9.1 exists and no screenshot has moved.

### Phase 3 — Introduce the renderer contract (TS)

- **Objective:** one place that renders a field correctly.
- **Files:** new — `resources/ts/drawer-kit/fields/{types.ts,blocks.ts,AdminField.tsx,AdminFieldGroup.tsx,AdminBody.tsx,index.ts}`.
- **Actions:** implement §8. `AdminField` maps `AdminFieldDef` → the Phase 2 classes. Export from `drawer-kit`. Adopt nowhere yet.
- **Dependencies:** Phase 2.
- **Risks:** Low — new code, zero consumers.
- **Verification:** `npx tsc --noEmit`; `npm run build` (bundle grows by the new module only).
- **Done when:** `AdminField` renders all eight types × three sizes × five states, proven by a scratch harness.

### Phase 4 — Migrate representative drawers

Four targets, chosen because each proves a different property:

| # | Target | Files | Proves |
|---|---|---|---|
| 4a | **Category drawer** (simple entity) | `entity-drawers/editors/CategoryOverviewEditor.tsx` (1 input, 1 select, 1 textarea) | The plain case. Smallest possible surface — 3 fields, 3 types. **Note: template key `'category'` is registered at `admin-station/register.ts:49-56` but named by no binding or intent — verify reachability before using it as a visual reference.** |
| 4b | **Tier drawer** (overview-heavy) | `package-station/drawer/editors/TierOverviewEditor.tsx` | Read-only fields, conditional fields, and the checkbox+inline-style case. Also fixes the `<textarea class="cz-tf-input">` defect at `:69` and removes the inline styles at `:72,75`. |
| 4c | **Service drawer** (form-heavy) | `service-station/drawer/editors/{ServiceOverview,ServiceFaqs,ServiceInclusions}Editor.tsx` | Repeatable rows, hints, and the only live control-level error presentation (`ServiceOverviewEditor.tsx:160`) → `.cz-tf-error`. |
| 4d | **Rate Sheet tool** (specialised editor) | `package-station/presentation/rate-sheet-tool/{RateSheetTool.tsx,rateSheetParts.tsx}` + `admin-station.css:2813-2953` | That a specialised editor **keeps its own layout** (`__grid`, `__groups`, `__picker`) while its controls become shared. This is the case that proves we are not forcing everything into a generic renderer. |

- **Actions per target:** replace hand-authored markup with `AdminField`; delete the feature-local wrapper/label rule it made redundant; keep the feature's layout rules.
- **Risks:** Medium. Highest at 4d — the Rate Sheet grid has `min-width: 88px` control constraints (`admin-station.css:2894-2897`) that must survive.
- **Verification:** per target, diff against Phase 0 screenshots in both themes and all four widths; run `contract:rate-sheet-tool` after 4d.
- **Done when:** all four render identically and no editor hand-authors a control.

### Phase 5 — Remove duplicate and dead CSS

- **Objective:** collect the reduction.
- **Files:** `drawer-kit.css`, `admin-station.css`, `admin-station-responsive.css`.
- **Actions, in this order:**
  1. **Verified dead** (~172 lines): `admin-station.css:1014-1041`; `drawer-kit.css:1343-1387`, `411-455` (host parts only — keep `__back`), `199-202`, `579`, `657-659`, `747-751`, `996-1000`, `1011-1014`, `1141-1145`, and `.cz-admin-root` from the `:15` selector.
  2. **Dead tokens** (35 names, ~40 lines) from `drawer-kit.css:15-153`.
  3. **Collapse cluster A**: delete the `.cz-admin-station .cz-tf-*` override at `drawer-kit.css:1502-1509` by moving `--station-*` values into the base at `:693-709`.
  4. **Collapse the re-skin block** `drawer-kit.css:1388-1514` into the base rules it overrides (`drawerModule`, `cz-ies`, `cz-sv-tab`, `cz-tf-footer`, `cz-module-notes`), now that `.cz-admin-station` is the only root.
  5. **Migrate the remaining `--admin-*` references** (~51 live names, 258 refs) to `--station-*`, then delete the token block.
  6. **Collapse clusters B and C**: retire `.cz-service-catalogue__toolbar select|search|reset|page-controls` control styling (`admin-station.css:1191-1273`), `.cz-tier-deck__control` (`2217-2247`), `.cz-tier-workspace__scope-select` control styling (`1613-1632`), `.cz-rate-sheet-tool__field/-label` (`2819-2829`), `.cz-tier-settings__field/label` (`2769-2780`). Keep the layout-only remainders.
  7. **Fix the two undefined tokens** at `InlineEditorShell.tsx:59` and `ServiceDrawerDialogs.tsx:116`.
  8. Consolidate the responsive rules that referenced deleted selectors.
- **Dependencies:** Phase 4 complete for every migrated surface.
- **Risks:** **High** — this is where regressions appear. Step 5 in particular touches 258 references.
- **Verification:** after **each** sub-step: `npm run build`, then re-run the §13 matrix. Re-run the dead-class check (§ Appendix A) to confirm no live class lost its rule.
- **Done when:** the dead-class check returns only known dynamic modifiers, and every §13 cell matches baseline.

### Phase 6 — Enforce the architecture

- **Objective:** prevent recurrence without heavy tooling.
- **Files:** new `scripts/admin-station-css-contract.mjs`; `package.json` (add `contract:admin-station-css`); code maps.
- **Actions:** one script, following the existing `scripts/*-contract.ts` convention, asserting:
  1. No selector in `admin-station.css` outside the shared field block declares `border`/`height`/`outline`/`box-shadow` on `input`/`select`/`textarea`/`label`.
  2. No `--admin-*` token is defined or referenced (after Phase 5.5).
  3. Every class in the in-scope sheets appears in TS/TSX/PHP (with an allowlist for dynamically composed modifiers: `cz-station-drawer--*`, `cz-footer-split--*`, `cz-service-stat__icon--*`).
  4. Every `var(--…)` referenced resolves to a defined token.
- **Risks:** Low. Rule 3 needs a maintained allowlist — keep it small and explicit.
- **Done when:** the script runs in the standard validation set and passes.

### Phase 7 — Final verification

- `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, all 7 contract scripts, `php tests/tier-capability-invariants.php`, the new CSS contract.
- Full §13 matrix, both themes.
- Accessibility: every interactive element has a visible `:focus-visible` treatment (this phase should *improve* on baseline — several bare `outline: none` sites are fixed); label/control association via `id`/`for`; `aria-invalid` set wherever `.cz-tf-error` renders.
- Line-count comparison against Phase 0.
- Dead-selector re-verification.
- Update `docs/code-map/admin-station-styles.md` and `admin-station-drawer.md`.

---

## 11. File-by-file impact map

| File | Lines | Classification | Note |
|---|---|---|---|
| `resources/ts/admin-station/AdminStation.tsx` | 35 | **retain unchanged** | |
| `resources/ts/admin-station/AdminStationContext.tsx` | 53 | **retain unchanged** | |
| `resources/ts/admin-station/shell/AdminStationLayout|Header|Body|SlideMenu|Dropdown.tsx` | 351 | **retain unchanged** | |
| `resources/ts/admin-station/shell/AdminStationFooter.tsx` | 5 | **investigate further** | Renders an always-empty `<footer>` |
| `resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx` | 162 | **retain unchanged** | The host is correct |
| `resources/ts/admin-station/shell/drawer/AdminStationDrawerContext.tsx` | 106 | **retain unchanged** | |
| `resources/ts/admin-station/home/AdminStationGroups.tsx` | 132 | **investigate further** | Always returns `null` — `AdminStationBody.tsx:40-46` never passes `groups` |
| `resources/ts/admin-station/presentation/service-categories/ServiceCategoryCarousel.tsx` | — | **investigate further** | Registered kit, no binding names it |
| `resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx` | 70 | **investigate further** | Template `'category'` registered but named by no binding/intent |
| `resources/ts/station-manager/**` | — | **retain unchanged** | Registry, modes, sizes all correct |
| `resources/ts/drawer-kit/schema/**` | 922 | **retain unchanged** | Block layer already exists |
| `resources/ts/drawer-kit/EntityActionFooter.tsx` | 99 | **retain unchanged** | Canonical footer grammar |
| `resources/ts/drawer-kit/CanonicalEntityFooter.tsx` | 87 | **retain unchanged** | |
| `resources/ts/service-station/drawer/ServiceDrawerFooter.tsx` | 58 | **investigate further** | `:40-57` duplicates `CanonicalEntityFooter.tsx:68-85`; TSX not CSS — separate pass |
| `resources/ts/entity-drawers/category/CategoryDrawerFooter.tsx` | 3 | **delete after migration** | Pure re-export shim |
| `resources/ts/drawer-kit/InlineEditorShell.tsx` | 98 | **modify** | Fix undefined `--admin-text-secondary` at `:59` |
| `resources/ts/drawer-kit/fields/**` | — | **new (Phase 3)** | Field contract + components |
| `resources/ts/entity-drawers/editors/CategoryOverviewEditor.tsx` | — | **migrate** (Phase 4a) | |
| `resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx` | 87 | **migrate** (Phase 4b) | Also fixes `:69` textarea class and `:72,75` inline styles |
| `resources/ts/package-station/drawer/editors/{TierRegistration,TierInclusionQuantity,PackageFamilyOverview,PoolInclusions,PoolFaqs}Editor.tsx` | — | **migrate** (Phase 4, follow-on) | |
| `resources/ts/service-station/drawer/editors/{ServiceOverview,ServiceFaqs,ServiceInclusions}Editor.tsx` | — | **migrate** (Phase 4c) | |
| `resources/ts/service-station/drawer/ServiceDrawerDialogs.tsx` | — | **modify** | Fix undefined `--cz-text-sm` / `--admin-text-secondary` at `:116,155` |
| `resources/ts/package-station/presentation/rate-sheet-tool/{RateSheetTool,rateSheetParts}.tsx` | — | **migrate** (Phase 4d) | Layout stays, controls move |
| `resources/ts/service-station/presentation/ServiceCatalogue.tsx` | — | **migrate** | Toolbar controls → shared; table stays |
| `resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx` | — | **migrate** | `__control` → shared |
| `resources/ts/admin-station/styles/admin-station-tokens.css` | 220 | **modify** | +11 field tokens; absorbs surviving `--admin-*` |
| `resources/ts/admin-station/styles/admin-station.css` | 2953 | **split** | Shell (920) + drawer (148) stay; 1866 feature lines move out (see below) |
| `resources/ts/admin-station/styles/admin-station-responsive.css` | 264 | **split** | ~50 shell lines stay; ~214 feature lines follow their features |
| `resources/css/modules/drawer-kit.css` | 1514 | **modify** | Complete the field block; delete dead + re-skin + `--admin-*` |
| `atomic-engine/css/06-forms.css` | 49 | **retain unchanged** | 100% dead repo-wide, but **outside Admin Station — do not touch** |
| `atomic-engine/css/*` (others) | 696 | **retain unchanged** | Global |
| `resources/css/modules/{cost-builder,homepage}.css` | 5175 | **retain unchanged** | Out of scope |

**Proposed split of the 1866 feature lines** (Phase 5+, optional but recommended — pure file organisation, cascade order preserved by import order in `resources/ts/modules/admin-station.ts`):

| New file | Source lines | Count |
|---|---|---|
| `resources/ts/service-station/styles/service-catalogue.css` | `admin-station.css:1087-1570` | 484 |
| `resources/ts/package-station/styles/tier-workspace.css` | `admin-station.css:1571-2057` | 487 |
| `resources/ts/package-station/styles/tier-deck.css` | `admin-station.css:2058-2792` | 735 |
| `resources/ts/package-station/styles/rate-sheet-tool.css` | `admin-station.css:2794-2953` | 160 |

This aligns CSS placement with the peer-station ownership model already documented in `resources/ts/package-station/CLAUDE.md`. `admin-station.css` drops to ~1090 lines of genuine shell + drawer.

---

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Token migration breaks drawer appearance.** 258 `--admin-*` references migrate to `--station-*` with different values (e.g. `--admin-radius` 4px → `--station-control-radius` 14px). | High | High | Migrate name-by-name in Phase 5.5, not in bulk. Where values genuinely differ, keep the `--admin-*` value under a `--station-*` name rather than silently adopting the station value. Screenshot-diff after each group. |
| R2 | **Deleting the re-skin block changes what the base rules produce.** `drawer-kit.css:1388-1514` overrides base rules that other (non-station) contexts once used. | Medium | High | `.cz-admin-station` is the only live root (verified). Fold overrides *into* the base rather than deleting them, so the resulting value is the one the station currently sees. |
| R3 | **Specificity inversion.** `.cz-admin-station .cz-tf-input` (0,2,0) collapsing to `.cz-tf-input` (0,1,0) lets previously-losing rules win — notably the feature rules in `admin-station.css`, which loads *after* `drawer-kit.css`. | High | Medium | Delete the competing feature rules (Phase 5.6) **before** lowering specificity (5.3/5.4), not after. |
| R4 | **Stylesheet load order changes.** Splitting feature CSS into new files could reorder the cascade. | Medium | High | Keep every new file imported from `resources/ts/modules/admin-station.ts` in the documented order (tokens → shell → features → responsive). Do not add new Rollup entries. Verify `dist/css/admin-station.css` byte order after build. |
| R5 | **Rate Sheet editor breakage.** The grid depends on `min-width: 88px` on controls (`admin-station.css:2894-2897`) and `max-width: 320px` (`:2854-2856`). | Medium | High | Phase 4d last among the migrations; run `contract:rate-sheet-tool`; explicitly preserve those two rules as feature layout. |
| R6 | **Responsive drift.** 214 of 264 responsive lines target feature selectors being renamed. | Medium | Medium | Move responsive rules together with their feature block in the same commit; verify at all four widths. |
| R7 | **Uncontrolled local overrides return.** 20 inline `style=` sites today. | High (without Phase 6) | Medium | The Phase 6 contract script; plus a documented boundary in Phase 1. |
| R8 | **Accidental platform-wide impact.** `drawer-kit.css` was authored as shared. | Low | High | Verified: only `.cz-admin-station` is live. `cost-builder.css` and `homepage.css` are separate entries and are **not** touched. Constraint honoured: no change outside Admin Station. |
| R9 | **Dead-code deletion removes something live.** Dynamic class construction (`cz-station-drawer--${size}`, `cz-footer-split--${tone}`) defeats naive greps. | Medium | High | Use the Appendix A method — token-level index of all TS/PHP identifiers — plus the explicit dynamic-modifier allowlist. Never delete on a single grep. |
| R10 | **Mode differences.** `view` vs `edit` render different content; a rule verified in one mode may regress in the other. | Medium | Medium | §13 matrix covers both modes for every drawer. |
| R11 | **Theme regressions.** Two themes × every change. | Medium | Medium | Every screenshot check is light **and** dark. `--station-*` is theme-switched; `--admin-*` is not — so R1 is also a dark-mode risk specifically. |
| R12 | **`dist/` is committed and may be stale.** | Low | Low | Rebuild in Phase 0 and confirm `dist` matches `resources` before measuring. |

---

## 13. Verification matrix

For every cell: light theme and dark theme, at 1440 / 1100 / 767 / 560 px.

| Surface / drawer | Template key | Modes | Size | Why it is in the matrix |
|---|---|---|---|---|
| Admin Station home | — | — | — | Shell frame, header, nav, slide menu |
| Service Catalogue surface | — | — | — | Toolbar controls (cluster B), responsive table collapse at 767px |
| Tier Workspace (Focus) | — | — | — | Three-column engine, 1100px intermediate breakpoint, scope-select (cluster B) |
| Tier Workspace (Grid) | — | — | — | Card grid, 767px single-column |
| Tier lower deck — Details | — | — | — | `__control` filters (cluster B), checkbox, row grid |
| Tier lower deck — Connections | — | — | — | Disclosure accordion |
| Tier lower deck — Settings | — | — | — | `__field` wrapper (cluster C), launcher/form |
| Service drawer | `service` | view, edit | normal | Form-heavy; error presentation; tabs |
| Tier drawer | `tier` | view, edit | normal | Overview-heavy; checkbox; readonly field |
| Tier registration | `tier` (`tier-register:` id) | edit | normal | Create-shaped flow through an edit-mode template |
| Package Family drawer | `package-family` | view, edit | normal | Canonical footer + publish confirm |
| Package Family create | `package-family-create` | edit | normal | Edit-only template (no `create` mode exists) |
| Tier inclusion drawer | `tier-inclusion` | view, edit | normal | Quantity editor, readonly field |
| Rate Sheet drawer | `rate-sheet` | view, edit | **extra-wide** | Specialised grid; 1080px at ≥1200px viewport |
| Tier Rate Sheet | `tier-rate-sheet` | view, edit | **extra-wide** | Same content, different scope |
| Tier Rate Sheet group | `tier-rate-sheet-group` | view, edit | **wide** | The only `wide` consumer — and `wide`≡`normal` between 561–719px (`admin-station.css:1069-1083`) |
| Category drawer | `category` | view, edit | normal | **Verify reachability first** — registered but unbound |

Per-drawer checks: header/title/close; tab bar (`.cz-sv-tabs`); body scroll; footer band (`.cz-station-drawer__foot`); `InlineEditorShell` save/cancel; publish-confirm dialog; backdrop click; Escape; focus restore on close.

Per-control checks (all eight types × three sizes): default, hover, focus-visible, disabled, readonly, error, required.

---

## 14. Reduction estimate

### Measured baseline

| Metric | Value | Method |
|---|---|---|
| Admin Station CSS (base) | **2953** | `wc -l admin-station.css` |
| Admin Station responsive | **264** | `wc -l admin-station-responsive.css` |
| Admin Station tokens | **220** | `wc -l admin-station-tokens.css` |
| Drawer CSS | **1514** | `wc -l drawer-kit.css` |
| **Total in scope** | **4951** | sum |
| Token CSS (both palettes) | **373** | 220 + `drawer-kit.css:15-153` |
| Responsive CSS (all in-scope) | **~330** | 264 + 5 inline `@media` in `admin-station.css` + 4 in `drawer-kit.css` |
| Distinct classes in in-scope CSS | **401** | `rg -o '\.[a-zA-Z][a-zA-Z0-9_-]*' \| sort -u` |
| Field-related selectors | **~78** | `cz-tf-*` (34) + 4 feature control/wrapper families (44) |
| Drawer-related selectors | **~60** | `cz-station-drawer*` (12 top-level, 33 rules) + `cz-ies` (12) + `cz-sv-tab` (10) + `cz-tf-footer`/`cz-footer-split` region |
| Feature-specific control families | **4** | service-catalogue, tier-deck, tier-workspace scope, rate-sheet-tool/tier-settings wrappers |
| Duplicated declaration clusters | **7** | Clusters A–G, §4 |
| Dead-class candidates | **42** raw → **~20** confirmed | Appendix A minus dynamic modifiers |
| `!important` | **10** | 9 in `admin-station.css`, 1 in responsive, 0 in `drawer-kit.css` |
| `--station-*` | 81 defined / 2 unused / 672 refs | |
| `--admin-*` | 86 defined / **35 unused** / 258 refs | |

### Classified rules

| Class | Lines | Disposition |
|---|---|---|
| 1. Shell structure | 920 | Retain |
| 2. Drawer structure | 148 (−28 dead) → 120 | Retain |
| 3. Shared fields (`cz-tf-*` + footer grammar) | 297 | Retain, **grows** with sizes/states |
| 4. Feature layout | ~1600 | Retain (legitimate domain layout) |
| 5. Responsive | ~330 | Retain, minor consolidation |
| 6. Dead / superseded | ~172 confirmed, +98 pending investigation | **Delete** |
| 7. Duplicated control styling | ~430 | **Collapse to ~120** |
| Other drawer-kit content (dialogs, tables, read cards, buttons) | ~1054 | Retain |

### Estimates

| Scenario | Removed | Added | Net | Final | Reduction |
|---|---|---|---|---|---|
| **Conservative** — dead CSS + clusters B/C only; both palettes kept | 306 | +130 | −176 | **~4775** | **3.6%** |
| **Expected** — the full Phase 5, palettes merged, re-skin folded | 496 | +130 | −366 | **~4585** | **7.4%** |
| **Aggressive but safe** — plus the investigate items resolved dead, plus the `.cz-station-panel` surface consolidation | 692 | +130 | −562 | **~4389** | **11.4%** |

**Realistic final range: 4400–4800 lines (7–11% reduction).**

### Why the number is modest — and why that is the right answer

The brief warned against arbitrary targets, and the evidence justifies that caution. Of the 4951 in-scope lines:

- **~1600 lines are genuine feature layout.** The Tier Workspace engine grid, the lower-deck row grids, the Service Catalogue's card-collapse responsive table and the Rate Sheet grid describe real domain structure. Consolidation does not touch them, and should not.
- **~1054 lines are drawer-kit content** — dialogs, read cards, status pills, buttons, tables — outside the field/shell question this audit scoped.
- **The field system is already small.** `cz-tf-*` is 165 lines and is *undersized*, not oversized. Finishing it **adds** ~130 lines. The "24 combinations" the brief feared do not exist as 24 CSS implementations; they exist as 4 partial families totalling ~430 lines, which collapse to ~120.

The measurable wins are correctness, not size:

- 4 focus-ring implementations → **1**
- 4 disabled opacities (0.38 / 0.45 / 0.5 / none) → **1**
- 3 control heights (38 / 38 / 42 / implicit) → **3 deliberate sizes**
- 4 field wrappers, 5 label styles → **1 each**
- 2 token palettes, 35 dead tokens, 2 undefined token references → **1 palette, 0 dead, 0 undefined**
- 0 readonly / error / required / hover states → **4 states, applied consistently**
- 20 inline `style=` patches → **~5** (only genuinely one-off positioning)

If the file-split in §11 is also taken, `admin-station.css` drops from 2953 to **~1090 lines** — a 63% reduction *of that file* — with the feature CSS relocated to its owning peer station rather than deleted. That is likely the number that motivated the original brief, and it is achievable; it is a relocation, not a deletion.

---

## 15. Recommended first implementation slice

**Slice: complete the shared control base and prove it on the Tier drawer's overview editor.**

Chosen because it is the smallest change that exercises every part of the architecture — tokens, CSS, the TS contract, and a real drawer — while fixing three live defects.

**Files touched (4):**
1. `resources/ts/admin-station/styles/admin-station-tokens.css` — add the 11 field tokens (§9.2).
2. `resources/css/modules/drawer-kit.css`:693-745 — extend the control block: `--sm`/`--lg`, `:hover`, `:read-only`, `[aria-invalid='true']`, `:disabled` on select and textarea, `.cz-tf-checkbox`, `.cz-tf-field--inline`, `.cz-tf-error`.
3. `resources/ts/drawer-kit/fields/{types.ts,AdminField.tsx,AdminFieldGroup.tsx,index.ts}` — new.
4. `resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx` — rewrite its 7 fields through `AdminField`.

**Defects it fixes:**
- `TierOverviewEditor.tsx:69` — `<textarea class="cz-tf-input">` loses `resize`, `min-height: 74px` and `line-height: 1.5` from `drawer-kit.css:741-745`.
- `TierOverviewEditor.tsx:72,75` — two inline `style=` attributes patching a missing checkbox layout.
- `TierOverviewEditor.tsx:51` — a `readOnly` price field that is visually indistinguishable from an editable one.

**Why this drawer:** it is the only editor that exercises select, text, textarea, checkbox, readonly and a conditional field in one 87-line file; it is reachable through a live template (`tier`, `package-station/register.ts:65-70`) dispatched from `PackageTierWorkspace.tsx:106,128,163`; and it is covered by existing contract scripts.

**Deliberately excluded:** no CSS deletion, no token migration, no re-skin changes, no other editor. The `--admin-*` palette and every existing selector stay exactly as they are. If the slice regresses, reverting one commit restores the prior state.

**Acceptance:**
- `npx tsc --noEmit`, `npm run build` green.
- `contract:package-tier-workspace`, `contract:tier-instance-scope`, `contract:tier-instance-tool` green.
- Tier drawer in `view` and `edit`, light and dark, at 1440/1100/767/560 — visually identical to baseline **except** the textarea now sizes correctly, the checkbox row aligns without inline styles, and the readonly price reads as readonly.
- Net line change roughly +90 (the field system paying for itself later).

---

## Appendix A — Reproducing the dead-class check

```bash
cd wp-content/plugins/compuzign-platform

# Every identifier that appears in any TS/TSX/PHP source (catches dynamic fragments)
rg -o --no-filename '[A-Za-z][A-Za-z0-9_-]*' resources/ts src app templates \
   -g '*.ts' -g '*.tsx' -g '*.php' | sort -u > /tmp/used-tokens.txt

# Every class defined in the in-scope stylesheets
for f in resources/ts/admin-station/styles/admin-station.css \
         resources/ts/admin-station/styles/admin-station-responsive.css \
         resources/css/modules/drawer-kit.css; do
  rg -o '\.[a-zA-Z][a-zA-Z0-9_-]*' "$f" | sed 's/^\.//' | sort -u
done | sort -u > /tmp/css-classes.txt

comm -23 /tmp/css-classes.txt /tmp/used-tokens.txt
```

Raw result: 42 candidates. Subtract these **dynamically composed** modifiers before deleting anything:

- `cz-station-drawer--wide|--extra-wide` — built at `AdminStationDrawer.tsx:84`
- `cz-footer-split--danger|--secondary` — built from `tone` in `EntityActionFooter.tsx`
- `cz-service-stat__icon--accent|--active|--neutral|--pending` — built from a tone value
- `cz-tier-deck__button--destructive`, `cz-manager-*` sub-parts of live bases, `is-error`

Confirmed dead after that subtraction (~20 classes, ~172 lines): `cz-station-drawer__tabs|__tab|__tab--active`, the whole `cz-manager-*` family, `cz-rate-sheet-editor__*`, `cz-action-shell--drawer|__panel|__body`, `cz-sp-browse-area`, `cz-sp-search-wrap`, `cz-tf-addon-row`, `cz-tf-chip__edit`, `cz-tf-count`, `cz-tf-price-row`, `cz-ws-header`, `cz-promo-table__actions`, `cz-admin-root`.

## Appendix B — Reproducing the token analysis

```bash
# Definitions
rg -o '^\s*--station-[a-z0-9-]+:' resources/ts/admin-station/styles/admin-station-tokens.css | sort -u | wc -l   # 81
rg -o '^\s*--admin-[a-z0-9-]+:'   resources/css/modules/drawer-kit.css                        | sort -u | wc -l   # 86

# References per sheet per namespace
rg -o 'var\(--station-[a-z0-9-]+' resources/ts/admin-station/styles/admin-station.css | wc -l  # 635
rg -o 'var\(--admin-[a-z0-9-]+'   resources/ts/admin-station/styles/admin-station.css | wc -l  # 0
rg -o 'var\(--admin-[a-z0-9-]+'   resources/css/modules/drawer-kit.css                | wc -l  # 258
rg -o 'var\(--station-[a-z0-9-]+' resources/css/modules/drawer-kit.css                | wc -l  # 25

# Unused tokens: comm -23 <definitions> <references>
# Undefined references: comm -23 <references> <definitions>  → --admin-text-secondary, --cz-text-sm
```
