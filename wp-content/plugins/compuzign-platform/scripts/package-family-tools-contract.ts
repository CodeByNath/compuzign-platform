// Package Family Tools architecture contract.
//
// Proves the corrected ownership model and the Package Station composition
// invariants from the blueprint, using pure (alias-free) modules only:
//   - the tool-assignment owner is the Package Family / Group, never a global
//     package-manager / package-station singleton;
//   - Tier is the only real tool; Promotion / Bundle / Campaign are declared
//     future tools and are not activatable;
//   - the Package Station Home surfaces the Package Families domain (it is not
//     generated solely from a tool registry) and opens the Family drawer;
//   - the full tool catalogue lives ONCE at Station level, as a presentation
//     wall after the Families wall, and mutates nothing (no drawer, no intent).
//
// Run: npx tsx scripts/package-family-tools-contract.ts

import { PACKAGE_TOOLS, isToolEnabled } from '../resources/ts/modules/packages/packageTools';
import {
  SURFACE_BINDINGS,
  resolveSurfaceBindings,
} from '../resources/ts/admin-station/stations/surfaceBindings';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family Tools contract: ${message}`);
}

// ── Ownership: every tool is owned by the Package Family, not a singleton ─────

for (const tool of PACKAGE_TOOLS) {
  check(
    tool.supportedOwnerType === 'package-family',
    `${tool.key} must be owned by the package-family, never a global package-manager/package-station singleton`,
  );
}

// ── Tier is the first and only real tool; futures are unavailable ─────────────

const tier = PACKAGE_TOOLS.find((t) => t.key === 'tier');
check(tier?.available === true, 'Tier is a real, available tool');

for (const key of ['promotion', 'bundle', 'campaign'] as const) {
  const future = PACKAGE_TOOLS.find((t) => t.key === key);
  check(future !== undefined, `${key} is registry-compatible (declared)`);
  check(future!.available === false, `${key} is a future tool and must not be activatable`);
  check(
    typeof future!.unavailableReason === 'string',
    `${key} states why it is unavailable`,
  );
}

// ── Activation state derivation ───────────────────────────────────────────────

check(isToolEnabled({ tier: { enabled: true } }, 'tier') === true, 'enabled assignment reads as active');
check(isToolEnabled({ tier: { enabled: false } }, 'tier') === false, 'disabled assignment reads as inactive');
check(isToolEnabled({}, 'tier') === false, 'a Family with no assignment reads as inactive');
check(isToolEnabled(undefined, 'tier') === false, 'a missing tools map reads as inactive');

// ── Package Station Home surfaces the domain (not a tool-only screen) ─────────

const packagesHome = resolveSurfaceBindings('packages', 'presentation');
check(packagesHome.length >= 1, 'the Package Station Home binds at least one presentation wall');
const familiesWall = packagesHome.find((b) => b.dataSourceKey === 'package-families');
check(familiesWall !== undefined, 'the Package Station Home surfaces Package Families as first-class records');
check(
  familiesWall!.drawerTemplateKey === 'package-family',
  'opening a Family on the Package Station Home leads to the Family drawer (Settings → Tools)',
);

// ── The full catalogue lives ONCE at Station level, after the Families wall ───

const toolsWall = packagesHome.find((b) => b.dataSourceKey === 'package-tools');
check(toolsWall !== undefined, 'the Package Station Home binds a Station-level Tools / Skills catalogue wall');
check(
  packagesHome.indexOf(familiesWall!) < packagesHome.indexOf(toolsWall!),
  'the Tools / Skills wall follows the Package Families wall (workstation, not a tools-only page)',
);
check(
  toolsWall!.templateKitKey === 'package-tools',
  'the Tools / Skills wall renders the Station tool catalogue kit',
);
// Presentation performs no mutation: the Station catalogue opens no drawer and
// dispatches no action intent. Assignment is owned by the Family and edited from
// the Family drawer's Settings, never from this wall.
check(
  toolsWall!.drawerTemplateKey === undefined,
  'the Station Tools / Skills wall opens no drawer — assignment is edited from a Family, not the catalogue',
);
check(
  toolsWall!.actionIntents.length === 0,
  'the Station Tools / Skills wall dispatches no intent — it reads the catalogue and mutates nothing',
);

// The Station catalogue is the single place the full registry (including the
// future-tool roadmap) is presented; a Family drawer must not repeat it. The
// registry itself remains the one source both the Station wall and the Family
// panel read, so there is exactly one catalogue definition.
check(
  PACKAGE_TOOLS.filter((t) => !t.available).length >= 1,
  'future tools exist in the registry and are presented at Station level only',
);

// ── Families remain first-class on the Service Home too ───────────────────────

const serviceHome = resolveSurfaceBindings('services', 'presentation');
check(
  serviceHome[0]?.dataSourceKey === 'package-families',
  'Service Home still leads with the Package Families wall',
);

// ── No global Package-Station-level tool owner leaked into the bindings ───────

for (const binding of SURFACE_BINDINGS) {
  check(
    !(binding.conditions as { ownerType?: string } | undefined)?.ownerType,
    'no surface binding carries a global tool ownerType — activation ownership stays on the Family row',
  );
}

console.log('Package Family Tools contract checks passed.');
