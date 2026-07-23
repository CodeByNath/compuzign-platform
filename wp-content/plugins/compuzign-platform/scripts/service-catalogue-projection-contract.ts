import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  packageFamiliesForService,
  toPackageFamilyRelationship,
  type PackageFamilyRelationship,
} from '../resources/ts/admin-station/stations/packageFamily/relationships';
import type { PackageFamilyListItem } from '../resources/ts/api/types/admin';
import {
  packageFamilyOptions,
  serviceMatchesCategory,
  serviceMatchesPackageFamily,
} from '../resources/ts/admin-station/presentation/service-catalogue/model';
import type { ServiceCatalogueItem } from '../resources/ts/admin-station/presentation/service-catalogue/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Service catalogue projection contract: ${message}`);
}

const familyRow = (group_id: string, label: string, related_service_ids: number[]): PackageFamilyListItem => ({
  group_id,
  label,
  related_service_ids,
} as PackageFamilyListItem);
const relationships: PackageFamilyRelationship[] = [
  familyRow('pcg_kairos', 'KAIROS', [42]),
  familyRow('pcg_aptos', 'APTOS', [7, 42]),
  familyRow('pcg_other', 'Other', [7]),
].map(toPackageFamilyRelationship);

const packageFamilies = packageFamiliesForService(relationships, 42);
check(packageFamilies.length === 2, 'one Service projects every related Package Family');
check(packageFamilies.map((family) => family.id).join(',') === 'pcg_kairos,pcg_aptos', 'native string Family IDs are preserved');

const service: ServiceCatalogueItem = {
  id: 42,
  name: 'Virtual Machines',
  slug: 'virtual-machines',
  description: 'Managed compute.',
  createdAt: null,
  categories: [{ id: 5, name: 'Compute', slug: 'compute' }],
  packageFamilies,
  inclusionCount: 2,
  faqCount: 1,
  platformStatus: 'active',
  presentationStatus: 'active',
  scope: 'current',
};

check(serviceMatchesPackageFamily(service, 'pcg_kairos'), 'first related Family matches');
check(serviceMatchesPackageFamily(service, 'pcg_aptos'), 'second related Family matches');
check(!serviceMatchesPackageFamily(service, 'KAIROS'), 'Family display name is not used as filter identity');
check(!serviceMatchesPackageFamily(service, 'pcg_other'), 'unrelated Family does not match');
check(serviceMatchesCategory(service, 'compute'), 'Category filtering uses the direct Service Category');
check(!serviceMatchesCategory(service, 'infrastructure-group'), 'an unrelated grouping label does not match Category');

const options = packageFamilyOptions([service]);
check(options.map((option) => option.value).join(',') === 'pcg_aptos,pcg_kairos', 'Family options use native string IDs and readable labels');

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const catalogue = source('resources/ts/admin-station/presentation/service-catalogue/ServiceCatalogue.tsx');
const model = source('resources/ts/admin-station/presentation/service-catalogue/model.ts');
const adapter = source('resources/ts/admin-station/stations/serviceSurface/serviceCatalogueAdapter.ts');
const serviceTypes = source('resources/ts/service-station/types.ts').split('// ── DETAIL')[0];
const serviceController = source('src/Modules/Service/Http/ServiceController.php')
  .split('public function listServices')[1]
  .split('public function createService')[0];
const packageController = source('src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php');
const packageRelationships = source('src/Modules/SurfacePackages/Support/PackageCategoryGroups.php')
  .split('public static function relatedServiceIds')[1]
  .split('public static function dependents')[0];

check(!/apiClient|fetch[A-Z]|api\/endpoints/.test(catalogue), 'presentation contains no endpoint call');
check(!/familyGroups|group_name/.test(`${catalogue}\n${model}\n${adapter}`), 'Family filtering contains no Service Category Group projection');
check(!/group_id|group_name/.test(serviceTypes), 'Service catalogue summary exposes no taxonomy-parent fields');
check(!/group_id|group_name/.test(serviceController), 'Service catalogue response exposes no taxonomy-parent fields');
check(serviceController.includes('CategoryMeta::STATION_ROLE_CATEGORY'), 'Service catalogue response retains direct Category-role terms');
check(packageController.includes("$projection['related_service_ids'] = PackageCategoryGroups::relatedServiceIds"), 'Package Family list boundary exposes related Service identities');
check(/is_int\(\$serviceId\)/.test(packageRelationships) && !/\(int\).*entity_id/.test(packageRelationships), 'Package relationship projection preserves native numeric Service identity');
check(model.includes('family.id === selectedFamilyId'), 'Family matching is strict against native Family ID');
check(catalogue.includes("onIntent(service.id, 'view')"), 'mature Service drawer intent keeps the native Service ID');
check(!/Number\(.*(?:service|family).*id|String\(.*(?:service|family).*id/i.test(`${catalogue}\n${model}\n${adapter}`), 'catalogue introduces no Service or Family ID coercion');

console.log('Service catalogue projection contract checks passed.');
