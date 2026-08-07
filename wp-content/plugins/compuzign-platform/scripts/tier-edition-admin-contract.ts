// Contract: the Tier Edition admin frontend (types, api.ts, useTierEditions,
// TierEditionsPanel) stays wired to the exact backend route family
// PackageStationController registers — the same source-scanning technique
// tier-instance-scope-contract.ts already uses for the parent occupant
// routes, extended one level deeper to Editions.

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
  'resources/ts/package-station/drawer/tier/TierEditionsPanel.tsx',
), 'utf8');
const drawerContent = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
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
// (TierEditionOverviewFields) reused verbatim by BOTH TierEditionsPanel
// (inline) and the scoped tier-edition:{...} drawer's own editor — so this
// checks the shared component, not either individual consumer.
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
  panel.includes('TierEditionOverviewFields') && panel.includes("from './TierEditionOverviewFields'"),
  'TierEditionsPanel renders its editor through the shared TierEditionOverviewFields, not a duplicate inline form',
);

// ── Panel is actually wired into the mounted Tier drawer, not orphaned ──────

check(
  drawerContent.includes("import { TierEditionsPanel }"),
  'TierDrawerContent imports TierEditionsPanel',
);
check(
  drawerContent.includes('<TierEditionsPanel'),
  'TierDrawerContent mounts TierEditionsPanel inside the individual-tier Details tab',
);
check(
  drawerContent.includes('detail.occupant_id &&'),
  'the panel is gated on a real occupant existing — an empty/unsaved slot cannot own Editions',
);

// The panel itself never calls the raw endpoints or mints identity directly
// — every lifecycle action goes through the hook's own functions.
check(
  !panel.includes("from '../../api'") && !panel.includes('from "../../api"'),
  'TierEditionsPanel never imports the raw api.ts endpoints directly — only through useTierEditions',
);
for (const action of ['publish', 'archive', 'trash', 'disable', 'enable', 'restore', 'remove']) {
  check(panel.includes(`ctl.${action}(`), `TierEditionsPanel drives ${action} through the hook's own action, never a raw status write`);
}

console.log('Tier Edition admin contract checks passed.');
