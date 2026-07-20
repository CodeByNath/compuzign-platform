import fs from 'node:fs';
import path from 'node:path';
import { filterTierOccupantsByConditions } from '../resources/ts/admin-station/stations/tierSurface/tierCollectionScope';
import type {
  PackageManagerItem,
  PackageRateSheet,
  PackageSourceRelationship,
  SurfaceTierDetail,
} from '../resources/ts/api/types/admin';
import type { TierOccupant } from '../resources/ts/entity-drawers/shared/tierOccupants';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package capability host contract failed: ${message}`);
}

function tier(occupantId: string, slotId: string, rateItemId: string): TierOccupant<SurfaceTierDetail> {
  return {
    occupantId,
    slotId,
    detail: {
      occupant_id: occupantId,
      label: slotId,
      ideal_for: '',
      price: 10,
      contact: false,
      billing_cycle: 'monthly',
      inclusions_override: [],
      rate_sheet_items: [{ item_id: rateItemId, quantity: 1 }],
      rate_sheet_selections: [],
      features: [],
      faq_refs: [],
      enabled: true,
    },
  };
}

const occupants = [tier('occ_kairos', 'basic', 'rate_kairos'), tier('occ_omnia', 'premium', 'rate_omnia')];
const packageSources: PackageSourceRelationship[] = [
  { relationship_id: 'rel_11', provider_key: 'service', entity_type: 'service', entity_id: 11, sort_order: 0, category_group_id: 'kairos' },
  { relationship_id: 'rel_22', provider_key: 'service', entity_type: 'service', entity_id: 22, sort_order: 1, category_group_id: 'omnia' },
];
const packageRelationships = [
  { item_id: 'manager_kairos', source_service_id: 11 },
  { item_id: 'manager_omnia', source_service_id: 22 },
] as PackageManagerItem[];
const rateSheet = {
  title: 'Rates',
  groups: [],
  items: [
    { item_id: 'rate_kairos', source_item_id: 'manager_kairos', unit_price: 10, per: 'Per item', quantity: 1, group_id: null, sort_order: 0 },
    { item_id: 'rate_omnia', source_item_id: 'manager_omnia', unit_price: 20, per: 'Per item', quantity: 1, group_id: null, sort_order: 1 },
  ],
} satisfies PackageRateSheet;
const scopeData = { packageSources, packageRelationships, rateSheet };

const serviceScoped = filterTierOccupantsByConditions(occupants, { serviceId: 11 }, scopeData);
assert(serviceScoped.map((item) => item.occupantId).join(',') === 'occ_kairos', 'Service scope follows Rate Sheet → Manager item → supplying Service provenance');

const familyScoped = filterTierOccupantsByConditions(occupants, { packageFamilyId: 'omnia' }, scopeData);
assert(familyScoped.map((item) => item.occupantId).join(',') === 'occ_omnia', 'Package Family scope resolves member Services through Package-owned sources');
assert(familyScoped[0].slotId === 'premium', 'scope projection retains slot only as mutation context');
assert(filterTierOccupantsByConditions(occupants, undefined, scopeData) === occupants, 'unscoped collection preserves the authoritative occupant projection');

const pluginRoot = process.cwd();
const read = (relativePath: string): string => fs.readFileSync(path.join(pluginRoot, relativePath), 'utf8');

const registry = read('resources/ts/admin-station/stations/packageCapabilities/capabilityRegistry.ts');
const registeredKeys = [...registry.matchAll(/capabilityKey:\s*'([^']+)'/g)].map((match) => match[1]);
assert(registeredKeys.join(',') === 'tiers', 'only the real Tier capability is registered; no fake Promotion/Bundle/Campaign entries');
assert(registry.includes("dataSourceKey: 'package-tiers'") && registry.includes("templateKitKey: 'tier-list'") && registry.includes("drawerTemplateKey: 'tier'") && registry.includes("authorityKey: 'package-tier'"), 'Tier registration declares the complete composition/authority contract');

const bindings = read('resources/ts/admin-station/stations/surfaceBindings.ts');
assert(bindings.includes('...PACKAGE_CAPABILITIES.map'), 'capability definitions generate rows in the existing surface binding registry');
assert(!/if\s*\([^\n]*tiers|case\s+['"]tiers/.test(bindings), 'surface binding resolver contains no Tier business branch');

const presentationShell = read('resources/ts/admin-station/stations/StationPresentationShell.tsx');
assert((presentationShell.match(/<StationSurfaceHost/g) ?? []).length === 1, 'StationPresentationShell remains the one ordered section loop');

const surfaceHost = read('resources/ts/admin-station/stations/StationSurfaceHost.tsx');
assert(surfaceHost.indexOf('if (!capability?.enabled)') < surfaceHost.indexOf('<Kit'), 'disabled capability content is rejected before its template kit mounts');
assert(surfaceHost.includes('intent.drawerTemplateKey ?? binding.drawerTemplateKey'), 'assignment and entity drawers share one intent path without a second drawer system');

const controller = read('src/Modules/SurfacePackages/Http/PackageCapabilityController.php');
assert(!/\$station\s*\[\s*['"]tiers['"]\s*\]\s*=/.test(controller), 'capability assignment controller never writes Tier slots');
assert(controller.includes("$manager['capability_assignments']"), 'assignment controller writes the Package Manager configuration boundary');
assert(!controller.includes("$body['order']"), 'assignment input cannot override registry-owned section order');

const managerSchema = read('src/Modules/SurfacePackages/Support/PackageManagerSchema.php');
assert(managerSchema.includes("'capability_assignments' => $stored['capability_assignments']"), 'ordinary Manager commits preserve capability assignments');

const tierSource = read('resources/ts/admin-station/stations/tierSurface/usePackageTierCollection.ts');
assert(tierSource.includes('id: occupantId') && tierSource.includes('slotId,'), 'Tier cards use occupant_id as identity and carry slotId separately');
assert(tierSource.includes('pkg.refetch()'), 'Tier source exposes its own targeted refresh handle');
assert(tierSource.includes('usePackageStation(host.service?.id ?? 0, undefined, enabled)'), 'disabled capability gates the authoritative Tier read as well as its presentation');

const tierKit = read('resources/ts/admin-station/stations/tierSurface/TierCollectionKit.tsx');
const tierCollectionTypes = read('resources/ts/admin-station/stations/tierSurface/tierCollectionTypes.ts');
assert(tierKit.includes('tierMeta?.emptyMessage') && tierKit.includes('tierMeta.createLabel') && tierCollectionTypes.includes("'No tiers configured'") && tierCollectionTypes.includes("'Create first tier'"), 'enabled empty Tier capability exposes the required empty/create flow');
assert(!tierKit.includes('api/endpoints') && !tierKit.includes('apiClient'), 'Tier presentation calls no endpoint');

const tierDrawer = read('resources/ts/admin-station/stations/tierSurface/TierDrawerHost.tsx');
assert(tierDrawer.includes('initialOccupantId={create ? undefined : recordId}') && tierDrawer.includes('initialTierId={create ? slotId'), 'create uses owner identity plus slot mutation context while mature occupants keep occupant_id');
assert(tierDrawer.includes("from '@/entity-drawers/tier/TierDrawerContent'") && !tierDrawer.includes('api/endpoints'), 'Tier create/edit enters the mature authoritative drawer composition without adapter-owned endpoint calls');

const presentationDir = path.join(pluginRoot, 'resources/ts/admin-station/presentation');
const presentationFiles = fs.readdirSync(presentationDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
  .map((entry) => read(path.relative(pluginRoot, path.join(entry.parentPath, entry.name))));
assert(presentationFiles.every((source) => !source.includes('api/endpoints') && !source.includes('apiClient')), 'Admin Station presentation remains endpoint-free');

// Runtime-relative import cycle check for the Admin Station tree. Type-only
// imports are erased and deliberately excluded (registry contracts may point
// back to their consumers without creating runtime edges).
const adminRoot = path.join(pluginRoot, 'resources/ts/admin-station');
const sourceFiles = fs.readdirSync(adminRoot, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name));
const sourceSet = new Set(sourceFiles.map((file) => path.normalize(file)));
const resolveRelative = (from: string, specifier: string): string | null => {
  const base = path.resolve(path.dirname(from), specifier);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (sourceSet.has(path.normalize(candidate))) return path.normalize(candidate);
  }
  return null;
};
const graph = new Map<string, string[]>();
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/^import\s+(?!type\b)[^;]+?from\s+['"](\.[^'"]+)['"];?$/gm)]
    .map((match) => resolveRelative(file, match[1]))
    .filter((candidate): candidate is string => candidate !== null);
  graph.set(path.normalize(file), imports);
}
const visiting = new Set<string>();
const visited = new Set<string>();
const walk = (file: string, trail: string[]): void => {
  if (visiting.has(file)) throw new Error(`Package capability host contract failed: new Admin Station dependency cycle: ${[...trail, file].map((item) => path.relative(adminRoot, item)).join(' → ')}`);
  if (visited.has(file)) return;
  visiting.add(file);
  for (const dependency of graph.get(file) ?? []) walk(dependency, [...trail, file]);
  visiting.delete(file);
  visited.add(file);
};
for (const file of sourceFiles) walk(path.normalize(file), []);

console.log('Package capability host checks passed.');
