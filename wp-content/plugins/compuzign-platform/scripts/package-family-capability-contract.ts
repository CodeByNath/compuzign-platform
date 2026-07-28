import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateModule,
  packageFamilyCapabilitiesModule,
  packageFamilyOverviewModule,
} from '../resources/ts/drawer-kit/utils/moduleNotifications';
import { projectPackageFamilyCapabilities } from '../resources/ts/package-station/surface/packageFamily/usePackageFamilyCapabilities';
import type {
  PackageFamilyCapabilitiesShellData,
} from '../resources/ts/package-station/drawer/schema/bindings/packageFamily';
import type {
  PackageFamilyItem,
  TierAssignment,
  TierInstanceRecord,
} from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family capability contract: ${message}`);
}

function family(): PackageFamilyItem {
  return {
    group_id: 'pcg_kairos', label: 'KAIROS', description: '', platform_status: 'active',
    previous_platform_status: null, module_status: { overview: 'settled' }, has_draft: false,
    sort_order: 0, assigned_service_count: 0,
    dependents: { services: 0, rate_sheet_rows: 0, tier_selections: 0 },
  };
}

function instance(): TierInstanceRecord {
  return {
    tier_instance_id: 'ti_kairos', title: 'KAIROS Tiers', status: 'active',
    allowed_rate_sheet_ids: ['rs_primary'], popular_tier: null, popular_label: '',
    tiers: {}, occupant_bin: [],
  };
}

async function run(): Promise<void> {
const savedFamily = family();
const savedInstance = instance();
const assignment: TierAssignment = {
  assignment_id: 'tasg_kairos', consumer_type: 'package_family',
  consumer_id: savedFamily.group_id, tier_instance_id: savedInstance.tier_instance_id,
};

check(
  JSON.stringify(projectPackageFamilyCapabilities(savedFamily, [], [savedInstance]))
    === JSON.stringify({ tier: { enabled: false } }),
  'a Family without an assignment has a disabled Tier capability row',
);
const disabledData = { tier: { enabled: false as const } };
// The module tracks the FAMILY's lifecycle, not the capability's presence: an
// absent Tier capability is valid and must not dim the module. A Family that is
// not live reads Pending, never Disabled — Disabled is the record footer's
// action, and a Family has no `draft` state to distinguish never-activated from
// deliberately switched off.
check(
  evaluateModule(packageFamilyCapabilitiesModule, disabledData, { platformStatus: 'active' }).status === 'active'
    && evaluateModule(packageFamilyCapabilitiesModule, disabledData, { platformStatus: 'disabled' }).status === 'pending-full',
  'capability module status follows only the Family platform status, and never infers Disabled',
);
check(packageFamilyCapabilitiesModule.problems(disabledData).length === 0, 'capability absence has no problem');
check(
  packageFamilyCapabilitiesModule.problems({ tier: { enabled: true } }).length === 0,
  'capability presence has no readiness problem',
);

const overviewContext = {
  platformStatus: 'active', moduleTransition: 'settled', hasDraft: false,
};
const overview = { name: 'KAIROS', description: '' };
check(
  packageFamilyOverviewModule.resolveStatus?.(overview, overviewContext)
    === packageFamilyOverviewModule.resolveStatus?.(overview, overviewContext),
  'overview readiness is byte-identical with and without an assignment',
);
const instanceBytes = JSON.stringify(savedInstance);
const withoutAssignment = [assignment].filter((row) => row.assignment_id !== assignment.assignment_id);
check(withoutAssignment.length === 0 && JSON.stringify(savedInstance) === instanceBytes, 'assignment removal leaves Tier instance untouched');

type ExtendedCapabilities = PackageFamilyCapabilitiesShellData & { futureCapability: { enabled: false } };
const extensionProof: ExtendedCapabilities = { tier: { enabled: false }, futureCapability: { enabled: false } };
check(!('futureCapability' in savedFamily) && !extensionProof.futureCapability.enabled, 'a second capability row needs no Family field');

// Family creation and "Add Tier capability" are two independent, separately
// authoritative writes — there is no third, create-time-only capability stage
// any more. The mature drawer's own createFamily performs exactly the one
// Family write; usePackageFamilyCapabilities.addTier remains the sole owner of
// the instance-then-assignment sequence, immediately available (no separate
// "saved stage") the moment the drawer shows the created record's Capabilities
// module.
const root = resolve(import.meta.dirname, '..');
const familyStationForCapability = readFileSync(resolve(root, 'resources/ts/package-station/usePackageFamilyStation.ts'), 'utf8');
const createFamilyBody = familyStationForCapability.slice(
  familyStationForCapability.indexOf('const createFamily'),
  familyStationForCapability.indexOf('return {', familyStationForCapability.indexOf('const createFamily')),
);
for (const forbidden of ['createTierInstance', 'createTierAssignment']) {
  check(!createFamilyBody.includes(forbidden), `Family creation performs no ${forbidden} of its own — that stays with Add Tier capability`);
}
const capabilitiesHookSource = readFileSync(resolve(root, 'resources/ts/package-station/surface/packageFamily/usePackageFamilyCapabilities.ts'), 'utf8');
const addTierBody = capabilitiesHookSource.slice(
  capabilitiesHookSource.indexOf('const addTier = useCallback'),
  capabilitiesHookSource.indexOf('const requestRemoveTier'),
);
check(
  addTierBody.indexOf('createTierInstance') < addTierBody.indexOf('createTierAssignment')
    && addTierBody.includes('createdOrphan'),
  'Add Tier capability still performs the instance-then-assignment sequence and remembers a partial-failure orphan for retry',
);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}
const sourceText = [resolve(root, 'src'), resolve(root, 'resources/ts')]
  .flatMap(sourceFiles)
  .filter((path) => /\.(php|ts|tsx)$/.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');
for (const forbidden of ['capability_key', 'capabilities[]', 'capability_assignments']) {
  check(!sourceText.includes(forbidden), `forbidden generic symbol ${forbidden} is absent`);
}
const capabilitySurface = [
  'resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx',
  'resources/ts/package-station/surface/packageFamily/usePackageFamilyCapabilities.ts',
  'resources/ts/package-station/api.ts',
].map((path) => readFileSync(resolve(root, path), 'utf8')).join('\n');
const capabilityBinding = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx',
), 'utf8');
for (const actionId of ['add-tier-capability', 'remove-tier-capability', 'open-tier-tool']) {
  check(capabilityBinding.includes(`id: '${actionId}'`), `approved action ${actionId} is present`);
}
check(
  !/(reassign-tier|change-tier|change-assignment)/i.test(capabilitySurface)
    && !/(?:^|['"\s])move-tier/i.test(capabilitySurface),
  'no Change, Move, or Reassign capability action exists',
);

console.log('Package Family capability contract passed.');
}

void run();
