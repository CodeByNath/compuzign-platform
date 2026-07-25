// Contract: every Tier lifecycle operation requires tier_instance_id before
// slot or bin resolution. The unscoped ti_primary compatibility aliases are
// retired; no missing identity may silently select an instance.

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
const contextStart = controller.indexOf('private function tierInstanceContext');
const contextEnd = controller.indexOf('private function persistTierInstance', contextStart);
const contextBody = contextStart >= 0 && contextEnd > contextStart
  ? controller.slice(contextStart, contextEnd)
  : '';
check(
  contextBody.includes("$request->get_param('instance')")
    && !contextBody.includes('TierInstanceSchema::PRIMARY_INSTANCE_ID'),
  'the common resolver requires the route identity and has no ti_primary fallback',
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

for (const legacyFragment of [
  'package-station/tiers/',
  'package-station/bin/',
  'package-station/popular',
]) {
  check(!api.includes(legacyFragment), `retired unscoped API fragment ${legacyFragment} is absent`);
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
