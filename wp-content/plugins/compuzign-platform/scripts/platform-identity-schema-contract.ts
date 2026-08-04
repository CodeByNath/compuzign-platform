import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
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

// ── The Platform Identifier engine owns the prefix vocabulary ─────────────────
//
// `PlatformIdentifierPolicy` is the closed, single source of truth for entity
// types, prefixes, alphabet, and suffix length. Nothing downstream may coin a
// prefix of its own: a frontend file or Code Map that names `CZ…` is making a
// claim about that engine, and an unrecognised one is an invention — it names
// an entity the platform cannot mint, resolve, or tombstone.
//
// This lock derives the vocabulary FROM the policy rather than restating it, so
// adding an entity type there is all that is ever needed here. It is what a
// hand-written prefix cannot survive: a plausible-looking `CZTS` shares the
// real `CZT` prefix, so a startsWith test would wave it through — a token must
// therefore be exactly a canonical prefix, or a canonical prefix followed by a
// full-length suffix drawn from the policy's own alphabet.
const repoRoot = resolve(import.meta.dirname, '../../../..');
const pluginRoot = resolve(import.meta.dirname, '..');
const policySource = readFileSync(
  resolve(pluginRoot, 'src/PlatformIdentifier/PlatformIdentifierPolicy.php'),
  'utf8',
);

const canonicalPrefixes = new Map(
  [...policySource.matchAll(/self::([A-Z_]+)\s*=>\s*'(CZ[A-Z]*)'/g)].map((m) => [m[1], m[2]]),
);
const alphabet = policySource.match(/ALPHABET\s*=\s*'([^']+)'/)?.[1] ?? '';
const suffixLength = Number(policySource.match(/SUFFIX_LENGTH\s*=\s*(\d+)/)?.[1] ?? 0);

check(
  canonicalPrefixes.size >= 10 && alphabet !== '' && suffixLength > 0,
  `the prefix vocabulary is read from PlatformIdentifierPolicy (${canonicalPrefixes.size} entity types)`,
);
check(
  canonicalPrefixes.get('TIER_GROUP') === 'CZTG' && canonicalPrefixes.get('TIER') === 'CZT',
  'Tier Group and Tier keep distinct engine-owned prefixes',
);

const suffixPattern = new RegExp(`^[${alphabet}]{${suffixLength}}$`);
function isEngineOwned(token: string): boolean {
  for (const prefix of canonicalPrefixes.values()) {
    if (token === prefix) return true;
    if (token.startsWith(prefix) && suffixPattern.test(token.slice(prefix.length))) return true;
  }
  return false;
}

// Proof the lock discriminates, pinned to the exact invention it exists to stop.
check(!isEngineOwned('CZTS'), 'a coined prefix sharing a real one (CZTS over CZT) is rejected');
check(isEngineOwned('CZTG') && isEngineOwned('CZPRCG'), 'every canonical prefix is accepted bare');
check(isEngineOwned('CZPG2A7KZ'), 'a minted identifier is accepted whole');

function sourceFiles(directory: string, extensions: RegExp): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'vendor') return [];
    const path = resolve(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path, extensions)
      : extensions.test(entry) ? [path] : [];
  });
}

// `CZ` alone is not an identifier claim — it is a log tag (`[CZ PricingTiers]`)
// or an unrelated quote reference (`CZ-…`), so a claim needs at least one
// entity letter after it.
const TOKEN = /CZ[A-Z][A-Z0-9]*/g;
const scanned = [
  ...sourceFiles(resolve(pluginRoot, 'resources/ts'), /\.(ts|tsx)$/),
  ...sourceFiles(resolve(pluginRoot, 'scripts'), /\.(ts|mjs)$/),
  ...sourceFiles(resolve(repoRoot, 'docs'), /\.md$/),
];
const coined = new Set<string>();
for (const file of scanned) {
  // This contract is the one file that must name a coined prefix: the
  // discrimination proof above pins the exact invention the lock exists to stop.
  if (file === import.meta.filename) continue;
  for (const match of readFileSync(file, 'utf8').matchAll(TOKEN)) {
    if (!isEngineOwned(match[0])) coined.add(`${file.replace(`${repoRoot}/`, '')} → ${match[0]}`);
  }
}
check(
  coined.size === 0,
  `no frontend source, contract, or Code Map coins a Platform ID prefix outside the engine${
    coined.size === 0 ? '' : `:\n    ${[...coined].join('\n    ')}`
  }`,
);

console.log(`\n  scanned ${scanned.length} frontend/contract/doc files against the engine vocabulary`);
console.log('\nAll Platform identity schema checks passed.');
