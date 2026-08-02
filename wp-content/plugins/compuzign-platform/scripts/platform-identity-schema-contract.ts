import { CATEGORY_DRAWER_ENTITY } from '../resources/ts/entity-drawers/schema/entities/category';
import { SERVICE_ENTITY } from '../resources/ts/service-station/drawer/schema/entities/service';
import { PACKAGE_FAMILY_ENTITY } from '../resources/ts/package-station/drawer/schema/entities/packageFamily';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Platform identity schema contract: ${message}`);
  console.log(`  ok — ${message}`);
}

const service = {
  id: 41,
  platformId: 'CZS2A7KZ',
  title: 'Network design',
} as Parameters<typeof SERVICE_ENTITY.identity.idOf>[0];

const category = {
  id: 7,
  platformId: 'CZC2A7KZ',
  name: 'Networking',
} as Parameters<typeof CATEGORY_DRAWER_ENTITY.identity.idOf>[0];

const packageFamily = {
  group_id: 'pcg_kairos',
  platform_id: 'CZPG2A7KZ',
  label: 'KAIROS',
} as Parameters<typeof PACKAGE_FAMILY_ENTITY.identity.idOf>[0];

console.log('Platform identity schema contract\n');

check(SERVICE_ENTITY.identity.idOf(service) === 41, 'Service idOf preserves numeric native identity');
check(SERVICE_ENTITY.identity.platformIdOf?.(service) === 'CZS2A7KZ', 'Service exposes additive Platform identity');
check(CATEGORY_DRAWER_ENTITY.identity.idOf(category) === 7, 'Category idOf preserves numeric native identity');
check(CATEGORY_DRAWER_ENTITY.identity.platformIdOf?.(category) === 'CZC2A7KZ', 'Category exposes additive Platform identity');
check(PACKAGE_FAMILY_ENTITY.identity.idOf(packageFamily) === 'pcg_kairos', 'Package Family idOf preserves string native identity');
check(PACKAGE_FAMILY_ENTITY.identity.platformIdOf?.(packageFamily) === 'CZPG2A7KZ', 'Package Family exposes additive Platform identity');

console.log('\nAll Platform identity schema checks passed.');
