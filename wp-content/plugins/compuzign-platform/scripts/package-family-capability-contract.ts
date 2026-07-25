import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateModule,
  packageFamilyCapabilitiesModule,
  packageFamilyOverviewModule,
} from '../resources/ts/drawer-kit/utils/moduleNotifications';
import {
  PACKAGE_FAMILY_CREATE_ACTIONS,
  addTierCapabilityAfterSave,
  completePackageFamilyCreate,
  type PackageFamilyCreateCommands,
} from '../resources/ts/package-station/surface/packageFamily/usePackageFamilyCreate';
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
check(
  evaluateModule(packageFamilyCapabilitiesModule, disabledData, { platformStatus: 'active' }).status === 'active'
    && evaluateModule(packageFamilyCapabilitiesModule, disabledData, { platformStatus: 'disabled' }).status === 'disabled',
  'capability module status follows only the Family platform status',
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
check(
  PACKAGE_FAMILY_CREATE_ACTIONS.form.length === 0
    && PACKAGE_FAMILY_CREATE_ACTIONS.saved.join(',') === 'not-now,add-tier-capability'
    && PACKAGE_FAMILY_CREATE_ACTIONS['capability-added'].join(',') === 'open-tier-tool',
  'capability actions exist only after the independent Family save',
);

const calls: string[] = [];
const commands: PackageFamilyCreateCommands = {
  createFamily: async () => {
    calls.push('create-family');
    return { success: true, group: savedFamily };
  },
  createTierInstance: async () => {
    calls.push('create-tier-instance');
    return { success: true, tier_instance: savedInstance };
  },
  createTierAssignment: async () => {
    calls.push('create-tier-assignment');
    return { success: true, assignment, tier_assignments: [assignment] };
  },
};
await completePackageFamilyCreate(commands, { name: 'KAIROS', description: '' }, () => calls.push('on-saved'));
check(calls.join(',') === 'create-family,on-saved', 'onSaved fires at saved stage before any optional write');
check(calls.length === 2, 'Not now and close at saved stage produce zero capability writes');
await addTierCapabilityAfterSave(commands, savedFamily);
check(
  calls.slice(2).join(',') === 'create-tier-instance,create-tier-assignment',
  'explicit Add Tier capability performs exactly two ordered writes',
);

const familyBytes = JSON.stringify(savedFamily);
const failedInstance = await addTierCapabilityAfterSave({
  ...commands,
  createTierInstance: async () => { throw new Error('forced instance failure'); },
}, savedFamily);
check(failedInstance.status === 'instance-failed' && JSON.stringify(savedFamily) === familyBytes, 'instance failure leaves saved Family untouched');
const failedAssignment = await addTierCapabilityAfterSave({
  ...commands,
  createTierAssignment: async () => { throw new Error('forced assignment failure'); },
}, savedFamily);
check(failedAssignment.status === 'assignment-failed' && JSON.stringify(savedFamily) === familyBytes, 'assignment failure leaves saved Family untouched and reports its orphan');

const instanceBytes = JSON.stringify(savedInstance);
const withoutAssignment = [assignment].filter((row) => row.assignment_id !== assignment.assignment_id);
check(withoutAssignment.length === 0 && JSON.stringify(savedInstance) === instanceBytes, 'assignment removal leaves Tier instance untouched');

type ExtendedCapabilities = PackageFamilyCapabilitiesShellData & { futureCapability: { enabled: false } };
const extensionProof: ExtendedCapabilities = { tier: { enabled: false }, futureCapability: { enabled: false } };
check(!('futureCapability' in savedFamily) && !extensionProof.futureCapability.enabled, 'a second capability row needs no Family field');

const root = resolve(import.meta.dirname, '..');
const createContent = readFileSync(resolve(root, 'resources/ts/package-station/drawer/package-family/PackageFamilyCreateContent.tsx'), 'utf8');
check(!createContent.includes('setCloseGuard('), 'the saved stage installs no close guard');

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
