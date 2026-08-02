import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family lifecycle acceptance: ${message}`);
  console.log(`  ok — ${message}`);
}

const station = source('resources/ts/package-station/usePackageFamilyStation.ts');
const controller = source('resources/ts/package-station/drawer/package-family/usePackageFamilyDrawerController.ts');
const content = source('resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx');
const bindings = source('resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx');
const notifications = source('resources/ts/drawer-kit/utils/moduleNotifications/packageFamily.ts');
const backend = source('src/Modules/SurfacePackages/Http/PackageFamiliesController.php');

console.log('Package Family locked lifecycle acceptance\n');

check(
  station.includes("if (family.group_id === '')") && station.includes('createPackageFamily({ name: draft.name'),
  'complete Overview Save owns pending Family creation',
);
check(!station.includes('const createFamily ='), 'no separate footer-facing create operation remains');
check(!controller.includes('station.createFamily'), 'Publish contains no create call');
check(
  controller.includes("if (station.family.group_id === '') return"),
  'Publish defensively requires a persisted native identity',
);
check(
  station.includes('disablePackageFamily(family.group_id)')
    && station.includes('enablePackageFamily(family.group_id)'),
  'Disable and Enable use explicit Package-owned actions',
);
check(
  content.includes('isDisabledMasked={c.isDisabledMasked}'),
  'the canonical record footer receives the explicit mask',
);
check(
  backend.includes("PackageCategoryGroups::applyDisabledMask"),
  'the Package controller retains lifecycle endpoint ownership',
);
check(!content.includes('api.') && !content.includes('fetch('), 'presentation owns no endpoint orchestration');
check(!bindings.includes('requiresParent'), 'Package Family bindings add no parent prerequisite');
check(!notifications.includes('requiresParent'), 'Package Family notifications add no child lock');
check(!notifications.includes('save Overview first'), 'Package Family adds no save-first child notice');
check(
  controller.includes('const relationshipsBinding')
    && controller.includes('handlers: {}')
    && bindings.includes("footer: { actions: [] }"),
  'Relationships remains a read-only projection',
);
check(
  content.includes('<CanonicalEntityFooter') && !content.includes('<PackageFamilyDrawerFooter'),
  'Package Family reuses the shared record-footer grammar',
);

console.log('\nPackage Family locked lifecycle acceptance passed.');
