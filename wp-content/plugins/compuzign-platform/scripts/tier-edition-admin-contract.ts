// Contract: the Tier Edition admin frontend (types, api.ts, useTierEditions,
// TierEditionDeclarationSwitcher) stays wired to the exact backend route
// family PackageStationController registers — the same source-scanning
// technique tier-instance-scope-contract.ts already uses for the parent
// occupant routes, extended one level deeper to Editions.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Edition admin contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const controller = readFileSync(resolve(
  root,
  'src/Modules/SurfacePackages/Http/PackageStationController.php',
), 'utf8');
const api = readFileSync(resolve(root, 'resources/ts/package-station/api.ts'), 'utf8');
const types = readFileSync(resolve(root, 'resources/ts/package-station/types.ts'), 'utf8');
const hook = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierSurface/useTierEditions.ts',
), 'utf8');
const panel = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx',
), 'utf8');
const drawerContent = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
), 'utf8');
const editionEditor = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionEditor.tsx',
), 'utf8');

// ── Route family: every api.ts Edition call targets a registered route ──────

const scopedFragments = [
  '/tiers/${tierId}/editions',
  '/tiers/${tierId}/editions/${editionId}/modules/overview',
  '/tiers/${tierId}/editions/${editionId}/modules/overview/settle',
  '/tiers/${tierId}/editions/${editionId}/modules/overview/revert',
  '/tiers/${tierId}/editions/${editionId}/status',
  '/tiers/${tierId}/editions/${editionId}/restore',
  '/tiers/${tierId}/editions/${editionId}`',
];
for (const fragment of scopedFragments) {
  check(
    api.includes(`package-station/tier-instances/\${tierInstanceId}${fragment}`),
    `API operation ${fragment} targets the instance-scoped Edition route`,
  );
}

const controllerFragments = [
  "/tiers/(?P<tier>[a-z]+)/editions'",
  "/editions/(?P<edition>edt_[a-z0-9]+)/modules/(?P<module>[a-z]+)'",
  "/editions/(?P<edition>edt_[a-z0-9]+)/modules/(?P<module>[a-z]+)/settle'",
  "/editions/(?P<edition>edt_[a-z0-9]+)/modules/(?P<module>[a-z]+)/revert'",
  "/editions/(?P<edition>edt_[a-z0-9]+)/status'",
  "/editions/(?P<edition>edt_[a-z0-9]+)/restore'",
  "/editions/(?P<edition>edt_[a-z0-9]+)'",
];
for (const fragment of controllerFragments) {
  check(controller.includes(fragment), `the controller registers ${fragment}`);
}

// The one generic engine-transition endpoint carries both platform_status
// and the explicit action mask — never a named route per transition.
check(
  controller.includes("'methods' => 'PATCH', 'callback' => [\$this, 'updateTierEditionStatus']"),
  'status transitions use one PATCH endpoint, not one route per transition',
);
check(
  !controller.includes('editions/(?P<edition>edt_[a-z0-9]+)/archive')
    && !controller.includes('editions/(?P<edition>edt_[a-z0-9]+)/trash'),
  'no Edition-specific /archive or /trash route exists — both ride the generic /status endpoint',
);

// ── TIER_MODULES is not touched: Edition is not a module entry ──────────────

const schema = readFileSync(resolve(
  root,
  'src/Modules/SurfacePackages/Support/PackageSchema.php',
), 'utf8');
const tierModulesLine = schema.split('\n').find((line) => line.includes('TIER_MODULES') && line.includes('='));
check(
  !!tierModulesLine && !tierModulesLine.toLowerCase().includes('edition'),
  'PackageSchema::TIER_MODULES is never extended with an Edition entry',
);

// ── Types: the admin frontend and the backend agree on shape ────────────────

for (const field of [
  'id: string', 'edition_platform_id: string', 'title: string', 'admin_description: string',
  'platform_status:', 'previous_platform_status: string | null', 'is_explicitly_disabled: boolean',
  'rate_sheet_id: string | null', 'rate_sheet_items: TierRateSheetSelection[]',
  'price: number | null', 'contact: boolean', 'billing_cycle: string | null',
  'minimum_term_value: number | null', 'minimum_term_unit: string | null',
  'inclusions_override: InclusionItem[]', 'faq_refs: string[]',
]) {
  check(types.includes(field), `TierEdition carries ${field}`);
}
check(types.includes('tier_editions?: TierEdition[]'), 'SurfaceTierDetail exposes tier_editions');
check(
  !types.includes('default_edition_id'),
  'the retired default_edition_id pointer no longer appears in SurfaceTierDetail — the occupant\'s own fields are the permanent Default',
);

// ── Hook: the full lifecycle surface is exposed, not a subset ───────────────

for (const action of [
  'create', 'saveDraft', 'settle', 'revert', 'publish', 'archive', 'trash',
  'disable', 'enable', 'restore', 'remove',
]) {
  check(
    hook.includes(`const ${action} =`) || hook.includes(`${action}:`),
    `useTierEditions exposes ${action}`,
  );
}
check(
  hook.includes('onMutated?.()'),
  'every successful mutation invokes onMutated — the same refetch contract usePackageStation\'s own actions use',
);

// ── Rate Sheet row/quantity selection reuses the occupant's own editor and
//    catalogue resolver — not a bespoke reimplementation ───────────────────

const tierDetailModel = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/tierDetailModel.ts',
), 'utf8');

check(
  tierDetailModel.includes('export function buildRateSheetCatalogue'),
  'buildRateSheetCatalogue is extracted as a reusable pure function',
);
check(
  !!tierDetailModel.match(/buildTierDetail[\s\S]*?buildRateSheetCatalogue\(svc, detail\.rate_sheet_id, detail\.rate_sheet_selections\)/),
  'the occupant\'s own Overview/Features editor resolves its catalogue through the SAME shared function (behaviour-preserving refactor, not a duplicate)',
);
// The row/quantity editor fields live in one shared component
// (TierEditionOverviewFields) reused verbatim by TierEditionDeclarationSwitcher
// — so this checks the shared component, not the one consumer.
const overviewFields = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionOverviewFields.tsx',
), 'utf8');

check(
  overviewFields.includes("import { PoolInclusionsEditor }"),
  'the shared Edition overview fields reuse the occupant\'s own PoolInclusionsEditor for row/quantity selection, not a bespoke picker',
);
check(
  overviewFields.includes('buildRateSheetCatalogue(svc, draft.rate_sheet_id'),
  'the Edition\'s row catalogue resolves against the EDITION\'S OWN rate_sheet_id, independent of the occupant\'s binding',
);
check(
  overviewFields.includes('rate_sheet_items: []') && overviewFields.includes('changeRateSheet'),
  'switching the Edition\'s bound Rate Sheet clears its row selections, mirroring the occupant\'s own confirm-then-clear rule',
);
check(
  panel.includes('PlacedShell') && panel.includes('TIER_EDITION_ENTITY'),
  'TierEditionDeclarationSwitcher renders the selected Edition through PlacedShell/TIER_EDITION_ENTITY — the same renderer machinery every other module in this drawer uses, not a bespoke summary block',
);
check(
  editionEditor.includes('TierEditionOverviewSection') && editionEditor.includes('TierEditionInclusionsSection')
    && editionEditor.includes("from './TierEditionOverviewFields'"),
  'the combined Edition editor renders through the shared TierEditionOverviewFields sections, not a duplicate inline form',
);

// ── The switcher is actually wired into the mounted Tier drawer, not orphaned ──

check(
  drawerContent.includes("import { TierEditionDeclarationSwitcher }"),
  'TierDrawerContent imports TierEditionDeclarationSwitcher',
);
check(
  drawerContent.includes('<TierEditionDeclarationSwitcher'),
  'TierDrawerContent mounts TierEditionDeclarationSwitcher inside the individual-tier Options group',
);
check(
  !drawerContent.includes('TierEditionsPanel'),
  'the old standalone "Payment Editions" panel is no longer mounted — TierEditionDeclarationSwitcher fully replaced it',
);
check(
  drawerContent.includes('detail.occupant_id &&'),
  'the switcher is gated on a real occupant existing — an empty/unsaved slot cannot own Editions',
);
check(
  drawerContent.includes('selectedId={c.selectedDeclarationId}') && drawerContent.includes('onSelect={c.setSelectedDeclarationId}'),
  'the selected-declaration id is a controlled prop sourced from useTierDrawerController, not local state that a refetch-triggered remount would silently reset',
);

// The switcher itself never calls the raw endpoints or mints identity
// directly — every lifecycle action goes through the hook's own functions.
check(
  !panel.includes("from '../../api'") && !panel.includes('from "../../api"'),
  'TierEditionDeclarationSwitcher never imports the raw api.ts endpoints directly — only through useTierEditions',
);
// Lifecycle transitions (publish/disable/enable/trash/restore/remove) moved
// out of TierEditionDeclarationSwitcher in the single-footer, scope-aware
// lifecycle command model (correction plan) — the pinned TierDrawerFooter
// now drives them for the selected Edition (see the Lifecycle presentation
// section below). The switcher itself still drives its own module
// draft/settle/revert (Save on the shared editor).
check(
  panel.includes('ctl.saveDraft(') && panel.includes('ctl.settle(') && panel.includes('ctl.revert('),
  'TierEditionDeclarationSwitcher still drives its own module draft/settle/revert through the hook',
);
check(
  panel.includes('selectedId:') && panel.includes('onSelect:') && !panel.includes('useState<string | null>'),
  'the selected declaration id arrives as a prop (selectedId/onSelect) — TierEditionDeclarationSwitcher declares no local useState<string|null> of its own that a refetch-triggered remount could silently reset',
);

// ── Overview's "Editions" count is derived, never a second persisted field ──
// (docs/code-map/tier-edition.md — audited: the existing tier_editions[]
// length already represents the registered positions cleanly, so no new
// storage was added.)

const schemaForCount = readFileSync(resolve(
  root,
  'src/Modules/SurfacePackages/Support/PackageSchema.php',
), 'utf8');
check(
  !/edition_(count|slots|positions)/i.test(schemaForCount),
  'no new persisted Edition-count field exists on the occupant — the count stays derived from tier_editions.length',
);

const tierBindings = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tier.tsx',
), 'utf8');
check(
  tierBindings.includes('tierEditionsCount: number'),
  'TierOverviewShellData carries the derived Editions count as a plain number, not a stored field',
);
check(
  !tierBindings.includes("id: 'add-edition'"),
  'Overview\'s own footer no longer carries an "+ Edition" action — creation lives only in Options\' own selector row',
);

// UI refinement, Phase 2: "+ Edition" relocated off Options' own selector
// row into the drawer's top nav chrome (TierDrawerContent's own `trailing`
// slot, beside the Tabs/Accordion view toggle), reachable only while
// Options is the active group. The switcher itself no longer renders it.
check(
  !panel.includes('onAddEdition') && !panel.includes("'+ Edition'"),
  'TierEditionDeclarationSwitcher no longer carries the "+ Edition" creation trigger — it moved to the drawer\'s own nav chrome',
);
check(
  drawerContent.includes("'+ Edition'") && drawerContent.includes('c.handleAddEdition') && drawerContent.includes('c.addingEdition'),
  'TierDrawerContent\'s own trailing nav slot carries the "+ Edition" creation trigger, driven by the SAME handleAddEdition/addingEdition useTierDrawerController state',
);
check(
  drawerContent.includes("c.tierTab === 'options'"),
  '"+ Edition" is gated on Options being the active group — never shown while viewing Details/Connections/Support',
);

const tierDetailModelForCount = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/tierDetailModel.ts',
), 'utf8');
check(
  tierDetailModelForCount.includes('1 + (detail.tier_editions?.length ?? 0)'),
  'the Overview count is derived directly from tier_editions.length (1 for the occupant\'s own permanent Default, plus however many Edition children exist) — never read from a separate stored count',
);

const controllerForAdd = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/useTierDrawerController.ts',
), 'utf8');
check(
  controllerForAdd.includes('createTierEdition(serviceId, tierInstanceId, editingTierId,'),
  'registering one more Edition position calls the SAME createTierEdition endpoint "+ Add Edition" already uses — no second creation route',
);

// ── Edition module reuse (drawer refinement blueprint, Phase 4) — additive,
//    unwired shells/DNA/binding-builder/editor. One consolidated module,
//    never a second Overview/Inclusions module pair. ───────────────────────

const editionDna = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/utils/moduleNotifications/tierEdition.ts',
), 'utf8');
check(
  editionDna.includes('export const tierEditionOverviewModule'),
  'a single tierEditionOverviewModule DNA rule exists for the Edition\'s one consolidated module',
);

const editionBindings = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tierEdition.tsx',
), 'utf8');
check(
  (editionBindings.match(/dna:\s*tierEditionOverviewModule/g) ?? []).length === 2,
  'both Edition Overview and Edition Inclusions shells share the SAME dna rule — never two independently resolved modules',
);
check(
  !/tierEditionInclusionsShell[\s\S]*?editor:/.test(editionBindings),
  'the Inclusions shell carries no editor key — it has no independent draft/save of its own',
);
check(
  !editionBindings.includes("'discard-draft'") || !/tierEditionInclusionsShell[\s\S]*?discard-draft/.test(editionBindings),
  'discard-draft is not duplicated onto the Inclusions card — Overview alone surfaces it for the one shared draft',
);

check(
  editionEditor.includes('DrawerGroupTabs') && editionEditor.includes("from '@/drawer-kit/ui/DrawerGroupTabs'"),
  'the combined Edition editor reuses DrawerGroupTabs — the codebase\'s existing generic tab primitive — rather than a third bespoke tab bar',
);
check(
  !editionEditor.includes("from '@/drawer-kit/DrawerTabs'"),
  'the combined Edition editor never imports the platform-locked DrawerTabs (Overview/Connections only)',
);
check(
  editionEditor.includes('session.extras?.initialTab'),
  'the initial editor tab is read from session.extras (UI-only), never a second module key',
);

const editionDetailModel = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/tierEditionDetailModel.ts',
), 'utf8');
check(
  editionDetailModel.includes('buildRateSheetCatalogue(svc, edition.rate_sheet_id'),
  'the Edition\'s own Inclusions card resolves rows through the SAME shared buildRateSheetCatalogue resolver as the occupant\'s own Default Tier Inclusions and the Edition\'s own editor — not a fourth copy',
);
check(
  (editionDetailModel.match(/onEdit\('overview'\)|onEdit\('inclusions'\)/g) ?? []).length === 2,
  'both cards\' edit handlers route through the same onEdit(initialTab) — one shared session, two entry points',
);
// Correction plan item 1: the Inclusions read card must resolve the
// EDITION'S OWN persisted selection (rate_sheet_items) against the
// catalogue, never filter the whole bound-sheet catalogue directly — that
// rendered every inclusion-type row the sheet has, selected or not.
check(
  editionDetailModel.includes('edition.rate_sheet_items.map'),
  'Edition Inclusions\' read projection resolves edition.rate_sheet_items (the Edition\'s own persisted selection) against the catalogue, selection-first — not a catalogue-filter that ignores which rows are actually selected',
);
check(
  !/const items = catalogue\s*\n\s*\.filter/.test(editionDetailModel),
  'the old catalogue-filter-only Inclusions projection is gone',
);

const editionEntity = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/entities/tierEdition.ts',
), 'utf8');
check(
  editionEntity.includes("overview:   tierEditionOverviewShell") && editionEntity.includes('inclusions: tierEditionInclusionsShell'),
  'TIER_EDITION_ENTITY registers exactly the two Edition shells, both already audited above',
);

// ── Lifecycle presentation — single-footer, scope-aware lifecycle command
//    model (correction plan Phase 4). Edition lifecycle transitions moved
//    OUT of the switcher entirely, into the ONE pinned TierDrawerFooter,
//    scoped to the selected Edition via buildTierLifecycleMenu. Never a
//    second footer architecture, drawer, or lifecycle system. ─────────────

check(
  !panel.includes('CanonicalEntityFooter'),
  'the obsolete inline Edition lifecycle footer (CanonicalEntityFooter, mounted inline) is gone from the switcher — the pinned Tier footer is now the one lifecycle command surface',
);

const tierDrawerFooter = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerFooter.tsx',
), 'utf8');
const tierLifecycleMenuSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/tierLifecycleMenu.ts',
), 'utf8');
check(
  tierDrawerFooter.includes('buildTierLifecycleMenu') && tierDrawerFooter.includes('menuOnly: true'),
  'TierDrawerFooter composes the scoped lifecycle menu and mounts the split with menuOnly: true — the visible label never mutates by itself',
);
check(
  tierLifecycleMenuSource.includes('export function buildTierLifecycleMenu'),
  'the scoped lifecycle-menu model is a pure, exported function — no rendering, no state of its own',
);
// UI refinement, Phase 1: Publish moved out of the lifecycle menu into its
// own independent RIGHT split (`splitForward`, buildTierPublishMenu) — the
// footer stays ONE pinned surface with two scope-aware controls, backward/
// travel actions on the left and forward/publish actions on the right.
check(
  tierLifecycleMenuSource.includes('export function buildTierPublishMenu'),
  'the scoped publish-menu model is a pure, exported function, independent of buildTierLifecycleMenu',
);
check(
  tierDrawerFooter.includes('buildTierPublishMenu') && tierDrawerFooter.includes("placement: 'split-forward'"),
  'TierDrawerFooter mounts the publish menu as the footer\'s own splitForward control, alongside the lifecycle split',
);
check(
  tierDrawerFooter.includes('publishSplitOpen') && tierDrawerFooter.includes('setPublishSplitOpen'),
  'the publish split carries its own independent open/closed state, never shared with the lifecycle split\'s splitOpen',
);
const entityActionFooterForSplitForward = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/EntityActionFooter.tsx',
), 'utf8');
check(
  entityActionFooterForSplitForward.includes('splitForward?:'),
  'EntityActionFooter\'s splitForward is optional and additive — every existing single-split caller is unaffected',
);
const supportedActionFooter = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/SupportedActionFooter.tsx',
), 'utf8');
check(
  supportedActionFooter.includes("'split-forward'"),
  'SupportedActionFooter\'s placement union includes split-forward, the second independent split slot',
);
check(
  drawerContent.includes('selectedEditionLifecycle') && drawerContent.includes('editionCtl.publish(') && drawerContent.includes('editionCtl.disable(')
    && drawerContent.includes('editionCtl.enable(') && drawerContent.includes('editionCtl.archive(') && drawerContent.includes('editionCtl.restore(')
    && drawerContent.includes('editionCtl.moveToBin('),
  'TierDrawerContent derives the selected Edition\'s scoped lifecycle handlers from the SAME lifted useTierEditions controller (editionCtl), and hands them to the pinned footer',
);
// Edition lifecycle/Bin UX cleanup: editionCtl.trash/editionCtl.remove no
// longer feed the pinned footer at all — Trash is folded into the atomic
// moveToBin command, and Permanent Delete moved exclusively into the
// Edition Bin. The underlying hook actions still exist (see the "hook
// exposes trash/remove" check above, unchanged) — only this footer's own
// wiring dropped them.
check(
  !drawerContent.includes('onTrash:') && !drawerContent.includes('onDelete:'),
  'TierDrawerContent no longer wires onTrash/onDelete into selectedEditionLifecycle — see tier-edition-move-to-bin-contract.ts for the atomic replacement',
);
check(
  !drawerContent.includes('SupportedActionFooter') && !drawerContent.includes('CanonicalEntityFooter'),
  'TierDrawerContent itself never imports a footer grammar directly — TierDrawerFooter remains the one composition point',
);

const entityActionFooter = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/EntityActionFooter.tsx',
), 'utf8');
check(
  entityActionFooter.includes('close?:') && entityActionFooter.includes('inline?:'),
  'EntityActionFooter\'s close/inline additions are optional — every existing pinned-footer caller (Package Family, Category) is unaffected',
);
check(
  entityActionFooter.includes('menuOnly?:') && entityActionFooter.includes('split.menuOnly ? split.onToggle : split.onSelect'),
  'EntityActionFooter\'s menuOnly addition is optional and additive — every existing caller that omits it keeps today\'s direct-click behavior',
);

const editionModel = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/tierEditionModel.ts',
), 'utf8');

// ── Correction plan: tierEditionDisabledMasked is the single frontend
//    authority for Edition disabled-mask presentation. Edition's own
//    backend (applyTierEditionDisabledMask) never writes
//    is_explicitly_disabled — it stays on the wire/type shape but must never
//    be read directly by presentation code, on pain of the module pill, the
//    pinned footer's scoped menu, and the Enable/Disable branch disagreeing
//    with each other and with reality. ─────────────────────────────────────

check(
  editionModel.includes('export function tierEditionDisabledMasked'),
  'tierEditionDisabledMasked is exported as the single Edition disabled-mask authority',
);
check(
  !panel.includes('.is_explicitly_disabled') && !editionDetailModel.includes('.is_explicitly_disabled')
    && !drawerContent.includes('selectedEdition.is_explicitly_disabled') && !drawerContent.includes('selectedEdition?.is_explicitly_disabled'),
  // TierDrawerContent legitimately reads the PARENT Tier occupant's own
  // detail.is_explicitly_disabled elsewhere (unrelated, pre-existing,
  // correct for that record) — this check is scoped to the selected
  // EDITION specifically, not a blanket ban on the substring across the
  // whole file.
  'TierEditionDeclarationSwitcher, buildTierEditionDetail, and TierDrawerContent never read the selected Edition\'s is_explicitly_disabled directly — only through tierEditionDisabledMasked',
);
check(
  editionDetailModel.includes('tierEditionDisabledMasked(') && drawerContent.includes('tierEditionDisabledMasked('),
  'the module pill (tierEditionModuleState) and the pinned footer\'s scoped menu (TierDrawerContent) both call the SAME tierEditionDisabledMasked — no independent derivation left',
);
check(
  !panel.includes('cz-tier-edition-declaration__status') && !panel.includes('tierEditionStatusLabel')
    && !editionModel.includes('export function tierEditionStatusLabel'),
  'the obsolete loose lifecycle-status text (and its standalone derivation) is gone — the module pill and the pinned footer\'s own action label are the only lifecycle presentation, matching Package Family/Category',
);

// ── Edition Bin presentation (Edition lifecycle/Bin UX correction) — the
//    Edition Bin is its own focused drawer task (TierEditionBinFocusedView,
//    built on the SAME FocusedTaskShell the Edition module editor already
//    uses), mounted EXCLUSIVELY in place of BOTH the ChildChipStrip band
//    and the normal module cards — never a second "Drawer Bin" secondary-
//    nav row alongside it. Never a second bin store, never a change to
//    moveToBin/restoreFromBin/trashBinEntry/deleteBinEntry,
//    tier_edition_bin[] storage, or ordering. ──────────────────────────────

check(
  !panel.includes('Show') && !panel.includes('Hide') && !panel.includes('showBin') && !panel.includes('setShowBin'),
  'the old large "Show/Hide Edition bin (n)" content button and its showBin state are completely gone from the switcher',
);
check(
  panel.includes('TierEditionBinFocusedView') && panel.includes("from './TierEditionBinFocusedView'"),
  'TierEditionDeclarationSwitcher renders the Edition Bin through the dedicated TierEditionBinFocusedView focused-task component, not an inline block and not TierEditionBinList directly',
);
check(
  panel.includes('binActive') && panel.includes('onBinActiveChange'),
  'the switcher receives binActive/onBinActiveChange as a controlled prop — the same controlled-prop pattern as selectedId/onSelect, for the identical remount-survival reason',
);
check(
  /if \(binActive\) \{\s*return <TierEditionBinFocusedView/.test(panel),
  'the Edition Bin is an early, exclusive return — it replaces BOTH the ChildChipStrip band and the normal module cards, never renders alongside either, and there is only one visible Bin identity',
);
check(
  !panel.includes('.editionBin.') && !panel.includes('ctl.editionBin.map'),
  'the switcher itself no longer iterates ctl.editionBin directly — TierEditionBinList (rendered by TierEditionBinFocusedView) owns that rendering now',
);

const binFocusedView = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionBinFocusedView.tsx',
), 'utf8');
check(
  binFocusedView.includes('FocusedTaskShell') && binFocusedView.includes("from '@/drawer-kit/FocusedTaskShell'"),
  'TierEditionBinFocusedView is built on the shared FocusedTaskShell — the same focused-task structure the Edition module editor (InlineEditorShell) already uses, not a second bespoke shell',
);
check(
  binFocusedView.includes('title="Drawer Bin"'),
  'the focused Bin task carries the title "Drawer Bin"',
);
check(
  binFocusedView.includes('Bin Active') && binFocusedView.includes('cz-module-status-pill--draft') && !binFocusedView.includes('cz-module-status-pill--active'),
  'the Bin\'s own state badge reads "Bin Active" in the neutral/muted pill tone, never the editor\'s green "Live Editor"/active tone — presentation state, not a lifecycle state',
);
check(
  !/cz-admin-btn--danger|cz-admin-error|--inactive/.test(binFocusedView),
  'the focused Bin task chrome (title/badge/Back/Close) carries no red/danger treatment — that tone stays reserved for TierEditionBinList\'s own explicit destructive row actions',
);
check(
  binFocusedView.includes('onBack={onClose}') && binFocusedView.includes('onClick={onClose}'),
  'both the shell\'s own Back control and the footer\'s Close button call the SAME onClose — no divergent behaviour between the two exit paths',
);
check(
  !/\bapi\.|fetch\(|Endpoint|Command\(/.test(binFocusedView),
  'TierEditionBinFocusedView calls no endpoint of its own — onClose is presentation-only (setEditionBinActive(false), owned by the caller), and TierEditionBinList remains the only thing in this tree that drives Restore/Trash/Delete',
);

const tierEditionBinList = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionBinList.tsx',
), 'utf8');
check(
  tierEditionBinList.includes('TravelStatusPill') && tierEditionBinList.includes("from '@/drawer-kit/ui/TravelStatusPill'"),
  'TierEditionBinList renders status through the shared TravelStatusPill, not raw "Archived"/"Trashed" text',
);
check(
  !tierEditionBinList.includes('function binPill'),
  'TierEditionBinList declares no local pill function of its own — TravelStatusPill is the one implementation',
);
for (const action of ['restoreFromBin', 'trashBinEntry', 'deleteBinEntry']) {
  check(tierEditionBinList.includes(`ctl.${action}(`), `TierEditionBinList still drives ${action} through the hook's own action — unchanged behavior, only the rendering moved`);
}
check(
  tierEditionBinList.includes("entry.status === 'archived'") && tierEditionBinList.includes('trashBinEntry') && tierEditionBinList.includes('deleteBinEntry'),
  'TierEditionBinList maps its destructive icon to the correct operation per row status — Archived -> trashBinEntry, Trashed -> deleteBinEntry — never guessed',
);
check(
  tierEditionBinList.includes('TrashIcon') && tierEditionBinList.includes('RestoreIcon') && !/>Restore</.test(tierEditionBinList) && !/>Delete/.test(tierEditionBinList),
  'TierEditionBinList uses icon-only row actions (TrashIcon/RestoreIcon), never large text buttons, with the real operation carried in aria-label/title instead of visible text',
);

const tierBinList = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierBinList.tsx',
), 'utf8');
check(
  tierBinList.includes('TravelStatusPill') && !tierBinList.includes('function binPill'),
  'the occupant\'s own bin (TierBinList.tsx) still uses the SAME shared TravelStatusPill too — one implementation, not two copies of identical logic',
);

// Move Edition to Bin is reachable from the pinned footer's scoped menu —
// same handler (editionCtl.moveToBin), now driving the atomic command (see
// tier-edition-move-to-bin-contract.ts) rather than the narrow endpoint,
// but still the SAME call site in TierDrawerContent.
check(
  drawerContent.includes('editionCtl.moveToBin('),
  'Move Edition to Bin drives through TierDrawerContent\'s lifted controller — the Edition Bin list itself is untouched by which endpoint moveToBin calls underneath',
);

// ── Edition Bin icon — ChildChipStrip's fixed trailing control ─────────────
// The icon only ever renders in the non-Bin state now (the Edition Bin's
// early return removes the whole ChildChipStrip band, icon included), so it
// only ever activates the Bin (aria-pressed stays false here) — the Bin's
// own focused-task badge, not a persistent pressed toggle, is what shows the
// active state (see the "Bin Active" checks above).

check(
  panel.includes('trailing={') && panel.includes('cz-drawer-groups__bin-toggle') && panel.includes('aria-pressed={false}'),
  'the switcher renders the Bin icon through ChildChipStrip\'s own trailing seam — since it only exists in the non-Bin state, it is never itself the pressed-state indicator',
);
check(
  panel.includes('onClick={toggleBin}') && panel.includes('const toggleBin = () => onBinActiveChange(true)'),
  'clicking the icon only ever activates the Bin — the icon does not exist anymore once binActive is true, so there is no toggle-off click path through it (Close/Back own that instead)',
);
check(
  !panel.includes("id: 'bin'") && !/chips=.*bin/.test(panel),
  'the Bin icon is never appended to the chips array — it is not an Edition/CZTE child chip, it is nav chrome',
);

// ── Terminology cleanup (drawer refinement blueprint, Phase 8) — no visible
//    "declaration" UI copy in Options; internal code vocabulary (component
//    name, CSS class names, comments) is a deliberate, separate decision and
//    stays untouched. ───────────────────────────────────────────────────────

check(
  !panel.includes('Inclusions &amp; Editions') && !panel.includes('additional declarations'),
  'the "Inclusions & Editions — additional declarations" banner heading is gone — Options reads as a normal child-management area',
);
check(
  !panel.includes('Showing the Default declaration'),
  'the old Default pointer note (already removed in Phase 1) has not resurfaced',
);

// ── Child-chip navigation strip (UI refinement, Phase 3) — the Edition
//    selector reuses the shared drawer-kit primitive instead of hand-rolling
//    Cost Builder's own public tool classes. ───────────────────────────────

const childChipStrip = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/ui/ChildChipStrip.tsx',
), 'utf8');
check(
  childChipStrip.includes('export function ChildChipStrip'),
  'ChildChipStrip is a generic, exported drawer-kit primitive',
);
check(
  childChipStrip.includes('trailing?: ComponentChildren') && childChipStrip.includes('cz-drawer-groups__chip-strip-trailing'),
  'ChildChipStrip carries the additive, optional trailing seam (Edition lifecycle/Bin UX cleanup) — generic, not Tier/Edition-shaped',
);
check(
  childChipStrip.includes('cz-drawer-groups__chip-strip-scroll'),
  'ChildChipStrip\'s horizontally-scrolling chip region is a distinct inner element from the outer sticky/hide-reveal row, so a fixed trailing control never scrolls away with the chip labels',
);
check(
  panel.includes('ChildChipStrip') && panel.includes("from '@/drawer-kit/ui/ChildChipStrip'"),
  'TierEditionDeclarationSwitcher renders its Edition selector through the shared ChildChipStrip primitive',
);
check(
  !panel.includes('cz-cost-builder__tier-edition\'') && !panel.includes('cz-cost-builder__tier-edition${'),
  'the switcher no longer hand-rolls Cost Builder\'s own public tool classes for its chip row',
);

const editionBindingsForCopy = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tierEdition.tsx',
), 'utf8');
check(
  !/subtitle:\s*'[^']*declaration/i.test(editionBindingsForCopy),
  'Edition Inclusions\' own subtitle carries no "declaration" copy either',
);

console.log('Tier Edition admin contract checks passed.');
