import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package builder flow contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const app = read('resources/ts/components/package-builder/PackageBuilderApp.tsx');
const adapter = read('resources/ts/components/package-builder/FamilyTierAdapter.tsx');
const fullBuild = read('resources/ts/components/package-builder/FullBuildDetail.tsx');
const moduleSource = read('src/Modules/CostBuilder/CostBuilderModule.php');
const repository = read('src/Modules/SurfacePackages/Repositories/PackageRepository.php');
const familyMethod = repository.slice(repository.indexOf('public function findAllActiveFamiliesForCostBuilder'));

check(moduleSource.includes("add_shortcode('compuzign_package_builder'"), 'the additive shortcode is registered');
check(app.includes('usePackageBuilder()'), 'the Family surface uses its direct public read');
check(!app.includes('useCostBuilder'), 'the Family surface never reads the Service-rooted Cost Builder response');
check(!app.includes('ServiceCard') && !app.includes('SubcategoryNav'), 'the Family surface has no Service selection UI');
check(app.includes('Plans &amp; pricing'), 'the Family surface renders the centered plans and pricing hero');
check(app.includes('All plans include:'), 'the focused Family renders its category inclusion summary');
check(app.includes('family.included_categories.map'), 'the inclusion summary follows the focused Family projection');
check(!app.includes('onClick={category'), 'category inclusions are not navigation controls');
check(!app.includes('cz-package-builder__selector'), 'no extra Family navigation sits between the hero and focused Family');
check(adapter.includes('<PricingTiers'), 'the existing PricingTiers renderer is reused');
check(adapter.includes('renderFullBuild='), 'the Family adapter opts into the existing Tier card disclosure seam');
check(fullBuild.includes('inclusionLabels'), 'full-build detail receives compiled effective inclusion labels');
check(!fullBuild.includes('fetch') && !fullBuild.includes('price'), 'full-build detail neither queries nor prices anything');
check(adapter.includes('familyPlatformId: family.family_platform_id'), 'the Family business identifier enters the quote snapshot');
check(adapter.includes('tierInstancePlatformId: family.tier_instance_platform_id'), 'the Tier Instance business identifier enters the quote snapshot');
check(adapter.includes('tierPlatformId: tierData?.tier_platform_id'), 'the Tier or Add-on business identifier enters the quote snapshot');
check(!familyMethod.includes('resolveInstanceForService('), 'the direct Family read never falls through Service discovery');

console.log('Package builder flow contract passed.');
