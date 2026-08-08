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
for (const action of ['publish', 'archive', 'trash', 'disable', 'enable', 'restore', 'remove']) {
  check(panel.includes(`ctl.${action}(`), `TierEditionDeclarationSwitcher drives ${action} through the hook's own action, never a raw status write`);
}
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

check(
  panel.includes('onAddEdition') && panel.includes("'+ Edition'"),
  'Options\' own selector row (TierEditionDeclarationSwitcher) carries the "+ Edition" creation trigger',
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

const editionEntity = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/entities/tierEdition.ts',
), 'utf8');
check(
  editionEntity.includes("overview:   tierEditionOverviewShell") && editionEntity.includes('inclusions: tierEditionInclusionsShell'),
  'TIER_EDITION_ENTITY registers exactly the two Edition shells, both already audited above',
);

console.log('Tier Edition admin contract checks passed.');
