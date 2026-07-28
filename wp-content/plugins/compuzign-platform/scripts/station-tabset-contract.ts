// Contract: one generic tab system, two station-owned decks.
//
// `admin-station/presentation/StationTabSet.tsx` owns tab behaviour and
// accessibility for every station that presents lanes. Package Home's Tier deck
// and Service Home's lower deck both consume it, and neither one leaks into it.
//
// Two halves:
//
//   1. The primitive stays generic — no station, entity, drawer route, data
//      source, or lane meaning inside it, and no station's class names.
//   2. Service Home's deck stays Service-owned — Family cards above it, the
//      existing catalogue inside `Details`, honest empty Connections and
//      Settings, and no Package or Tier presentation anywhere in it.
//
// This reads composition and registration. It does not execute Preact, so it
// asserts no rendered pixel and no browser behaviour.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`Station tab set contract: ${message}`);
}

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

function sourceFiles(directory: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(resolve(root, directory))) {
    const full = `${directory}/${entry}`;
    if (statSync(resolve(root, full)).isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

const tabSet = source('resources/ts/admin-station/presentation/StationTabSet.tsx');
const serviceDeck = source('resources/ts/service-station/presentation/ServiceLowerDeck.tsx');
const adminRegister = source('resources/ts/admin-station/register.ts');
const serviceRegister = source('resources/ts/service-station/register.ts');

// ── 1. The primitive owns generic tab behaviour and nothing else ──────────────

check(
  tabSet.includes('role="tablist"')
    && tabSet.includes('role="tab"')
    && tabSet.includes('role="tabpanel"')
    && tabSet.includes('aria-selected={selected}')
    && tabSet.includes('aria-controls={panelId(item.id)}')
    && tabSet.includes('aria-labelledby={tabId(item.id)}')
    && tabSet.includes('aria-label={label}'),
  'the primitive carries full tab, tablist, and tabpanel semantics',
);
check(
  tabSet.includes('const uid = useId()')
    && tabSet.includes('`${uid}-tab-${id}`')
    && tabSet.includes('`${uid}-panel-${id}`'),
  'tab and panel ids are scoped to one instance, so two decks on a page cannot collide',
);
check(
  tabSet.includes('tabIndex={selected ? 0 : -1}')
    && tabSet.includes('hidden={item.id !== selectedId}'),
  'the strip is one roving tab stop and every unselected panel is hidden',
);
check(
  ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    .every((key) => tabSet.includes(`'${key}'`))
    && tabSet.includes('items.filter((item) => !item.disabled)')
    && tabSet.includes('disabled={item.disabled}'),
  'keyboard movement covers Arrow, Home, and End and never lands on a disabled tab',
);

// The exclusion list is the point of the extraction: this file must stay usable
// by a station that does not exist yet. Its own header comment explains the
// boundary in the same words, so read the code and not the prose.
const tabSetCode = tabSet.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const FORBIDDEN_IN_PRIMITIVE = [
  'cz-tier-', 'cz-service-', 'cz-package-',
  'Tier', 'Package', 'Service', 'Catalogue',
  'Connections', 'Settings',
  'drawer', 'Drawer', 'onIntent', 'useState', 'fetch', 'api',
];
for (const term of FORBIDDEN_IN_PRIMITIVE) {
  check(
    !tabSetCode.includes(term),
    `the primitive names '${term}'; it must own tab behaviour only`,
  );
}
check(
  (tabSetCode.match(/from '([^']+)'/g) ?? []).every((from) => from.startsWith("from 'preact")),
  'the primitive imports nothing but Preact',
);

// ── 2. Service Home: Family cards above a Service-owned lower deck ────────────

const familyBinding = adminRegister.indexOf("surfaceId: 'package-families'");
const deckBinding = adminRegister.indexOf("surfaceId: 'service-lower-deck'");
check(
  familyBinding !== -1 && deckBinding !== -1 && familyBinding < deckBinding,
  'Service Home binds the Package Family cards above the lower deck',
);
check(
  /surfaceId: 'package-families',[\s\S]*?order: 0,[\s\S]*?templateKitKey: 'category-group-cards'/.test(adminRegister)
    && /surfaceId: 'service-lower-deck',[\s\S]*?order: 1,[\s\S]*?dataSourceKey: 'service-catalogue',[\s\S]*?templateKitKey: 'service-lower-deck'/.test(adminRegister),
  'the Family card wall keeps its own kit and the deck keeps the catalogue source and Service drawer',
);
check(
  serviceRegister.includes("'service-lower-deck': ServiceLowerDeck")
    && !serviceRegister.includes("'service-catalogue': ServiceCatalogue"),
  'Service registers the lower deck as its one presentation kit, not a second catalogue surface',
);

// ── 3. The deck's lanes ───────────────────────────────────────────────────────

check(
  /id: 'details',\s+label: 'Details'/.test(serviceDeck)
    && /id: 'connections',\s+label: 'Connections'/.test(serviceDeck)
    && /id: 'settings',\s+label: 'Settings'/.test(serviceDeck),
  'the deck presents Details, Connections, and Settings in that order',
);
check(
  serviceDeck.includes("useState<ServiceDeckTab>('details')"),
  'Details is the selected lane when Service Home opens',
);
check(
  (serviceDeck.match(/<ServiceCatalogue /g) ?? []).length === 1
    && serviceDeck.includes("tab === 'details'\n            ? <ServiceCatalogue {...props} />"),
  'the catalogue renders once, inside Details, from the props the surface host supplied',
);
check(
  serviceDeck.includes(': <p class="cz-station-empty">{EMPTY_LANE[tab]}</p>')
    && /connections:\s+'[^']+',\s+settings:\s+'[^']+',/.test(serviceDeck),
  'Connections and Settings render one shared empty state carrying one plain sentence each',
);
// The deck cannot grow content it never imported, so its import list is the
// honest boundary: the shared tab primitive, the station glyph its context bar
// draws, and the existing catalogue — nothing with a source, a projection, a
// drawer route, or a model behind it.
const deckImports = (serviceDeck.match(/from '([^']+)'/g) ?? []).map((from) => from.slice(6, -1));
check(
  deckImports.every((from) => [
    'preact',
    'preact/hooks',
    '@/station-manager/registry/templateKits',
    '@/admin-station/presentation/StationTabSet',
    '@/admin-station/shell/icons',
    './ServiceCatalogue',
  ].includes(from)),
  `the deck imports beyond its lanes: ${deckImports.join(', ')}`,
);

// ── 4. No Package presentation reaches Service Station ────────────────────────

// Service consuming Package DOMAIN contracts through the public barrel is the
// documented peer relationship and predates this deck. What must never appear is
// a reach into Package PRESENTATION — the Tier workspace kit, the Package deck,
// or the Tier classes they paint.
for (const file of sourceFiles('resources/ts/service-station')) {
  const text = source(file);
  check(
    !/from '[^']*package-station\/(?!index)/.test(text),
    `${file} reaches past the Package Station barrel`,
  );
  check(
    !text.includes('cz-tier-'),
    `${file} renders a Tier class; Service Home owns no Tier presentation`,
  );
}
check(
  !serviceDeck.includes('package-station'),
  'the Service deck consumes no Package Station module at all',
);

console.log(`Station tab set contract passed: ${checks} checks.`);
