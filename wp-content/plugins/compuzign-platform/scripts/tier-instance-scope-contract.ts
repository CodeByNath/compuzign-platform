// Contract: every Tier lifecycle operation is scoped by tier_instance_id before
// slot or bin resolution. The old URLs remain only as ti_primary aliases for
// the compatibility window.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier instance scope contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const controller = readFileSync(resolve(
  root,
  'src/Modules/SurfacePackages/Http/PackageStationController.php',
), 'utf8');
const api = readFileSync(resolve(root, 'resources/ts/package-station/api.ts'), 'utf8');
const hook = readFileSync(resolve(root, 'resources/ts/package-station/usePackageStation.ts'), 'utf8');

check(
  !controller.includes("$station['tiers']"),
  "PackageStationController must never read or write the legacy station tiers key",
);
check(
  controller.includes("?P<instance>[a-z0-9_]+") && controller.includes("$this->tierInstanceContext($request)"),
  'the scoped route family and common instance-first resolver remain registered',
);
check(
  controller.includes("TierInstanceSchema::PRIMARY_INSTANCE_ID")
    && controller.includes("$request->get_param('instance')"),
  'a missing route instance aliases explicitly to ti_primary',
);

const scopedFragments = [
  '/read',
  '/tiers/${tierId}',
  '/tiers/${tierId}/enabled',
  '/tiers/${tierId}/modules/${module}',
  '/tiers/${tierId}/modules/${module}/revert',
  '/tiers/${tierId}/settle',
  '/tiers/${tierId}/archive',
  '/bin/${binId}/restore',
  '/bin/${binId}/trash',
  '/bin/${binId}',
  '/popular',
];
for (const fragment of scopedFragments) {
  check(
    api.includes(`package-station/tier-instances/\${tierInstanceId}${fragment}`),
    `API operation ${fragment} includes tierInstanceId in its route`,
  );
}

check(
  /usePackageStation\(\s*serviceId: number,\s*tierInstanceId: string \| null,/m.test(hook),
  'usePackageStation accepts tierInstanceId as its second positional argument',
);
check(
  hook.includes('if (serviceId <= 0 || tierInstanceId === null)')
    && hook.includes('fetchServicePackageStation(serviceId, tierInstanceId)'),
  'null instance identity holds the hook unloaded and valid identities scope reads',
);

console.log('Tier instance scope contract passed.');
