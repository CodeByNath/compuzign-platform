// Destination resolver — the Admin Station's route/destination seam.
//
// There is no URL router yet, so the front of the chain is an ACTIVATION key
// (the Header pill / slide-menu item id), never a URL route. A URL router can
// later resolve into the same destination id without changing this engine.
//
//   activation key
//     → destination resolver (this file)
//       → lean Station registration      (stationId + surfaceId)
//         → schema placement             (body | presentation | drawer)
//           → mode                       (ShellMode viewpoint)
//             → conditions / record id   (StationConditions)
//               → AdminStation shell region
//
// The resolver only SELECTS registrations; it holds no entity logic. It is
// deliberately local to the Admin Station tree (this tree owns routing). Its one
// cross-tree reference is the `ShellMode` type — a type-only import, erased at
// build, so the admin-station bundle stays runtime-isolated (the bundle-boundary
// rule: contracts cross free, renderers fork).

import type { ShellMode } from '@/drawer-kit/schema/types';

// Placement — the shell REGION a destination projects into (an environment, not
// a viewpoint). 'body' exists today (currently shows Home); 'presentation' (the
// wall) and 'drawer' projections are declared here but intentionally not built
// yet.
export type StationPlacement = 'presentation' | 'body' | 'drawer';

// Station-level conditions — WHAT a surface resolves: which records, which
// lifecycle scope, which record identity, which relation. This is a different
// axis from the runtime MountCondition (which resolves WHERE the app mounts in
// the DOM) and deliberately does not reuse it. Identity stays native/numeric:
// recordId and categoryTermId are not stringified display keys.
export interface StationConditions {
  scope?: 'current' | 'archived' | 'trashed';
  recordId?: string | number;
  categoryTermId?: number;
  relatedTo?: { entity: string; id: string | number };
}

// A resolved destination: the lean registration + surface it addresses, the
// region it lands in, the viewpoint it is seen through, and its conditions. One
// registration can be addressed by several destinations (body, archived,
// presentation, drawer) — each a distinct entry with different conditions.
export interface StationDestination {
  // Stable destination key. An activation key resolves to the destination whose
  // id it matches (today the nav item id and the destination id are 1:1).
  id: string;
  // Addresses a lean Station registration. Kept as an opaque key: the resolver
  // maps to it, the (future) lean registry owns it. Not the old station-registry
  // id — these are Admin-Station-native keys.
  stationId: string;
  // The registration's surface / template key within that station.
  surfaceId: string;
  placement: StationPlacement;
  mode: ShellMode;
  conditions?: StationConditions;
}

// The destination table — the resolver's data, mapping the CURRENT Admin Station
// navigation (Services / Packages / Promotions) to its landing destination. Each
// lands in the body as a current-scope catalog (mode 'table'); archived,
// presentation, and drawer destinations for these stations arrive as those
// surfaces are built. `stationId` selects the active station composition today;
// the remaining destination metadata is declarative or reserved.
export const STATION_DESTINATIONS: StationDestination[] = [
  { id: 'services',   stationId: 'services',   surfaceId: 'catalog', placement: 'body', mode: 'table', conditions: { scope: 'current' } },
  { id: 'packages',   stationId: 'packages',   surfaceId: 'catalog', placement: 'body', mode: 'table', conditions: { scope: 'current' } },
  { id: 'promotions', stationId: 'promotions', surfaceId: 'catalog', placement: 'body', mode: 'table', conditions: { scope: 'current' } },
];

// Stable key for a destination's full projection identity. Two destinations are
// the SAME view only when station, surface, placement, mode, and conditions all
// match; any difference (a different placement, mode, or scope) is a deliberate
// second view of one surface and is allowed.
function projectionKey(d: StationDestination): string {
  const c = d.conditions;
  const conditions = c
    ? [c.scope ?? '', c.recordId ?? '', c.categoryTermId ?? '', c.relatedTo ? `${c.relatedTo.entity}#${c.relatedTo.id}` : ''].join('|')
    : '';
  return `${d.stationId}::${d.surfaceId}::${d.placement}::${d.mode}::${conditions}`;
}

// Authoring guard — runs once at module load. The resolver keys on `id`, so a
// duplicate id silently drops a destination; and a fully-identical projection
// (same station + surface + placement + mode + conditions) is a copy-paste slip
// that adds a dead, ambiguous entry. Both are static authoring errors, never
// valid runtime data, so we fail loudly here rather than let the table resolve
// silently as it grows. Sharing a stationId + surfaceId across different
// placements/modes/scopes is intended and passes.
export function assertDestinationsWellFormed(list: StationDestination[]): void {
  const ids = new Set<string>();
  const projections = new Set<string>();
  const dupIds: string[] = [];
  const dupProjections: string[] = [];

  for (const d of list) {
    if (ids.has(d.id)) dupIds.push(d.id);
    else ids.add(d.id);

    const key = projectionKey(d);
    if (projections.has(key)) dupProjections.push(key);
    else projections.add(key);
  }

  const problems: string[] = [];
  if (dupIds.length) problems.push(`duplicate destination id(s): ${dupIds.join(', ')}`);
  if (dupProjections.length) problems.push(`duplicate projection(s) [station::surface::placement::mode::conditions]: ${dupProjections.join(', ')}`);
  if (problems.length) {
    throw new Error(`[AdminStation] destination table is malformed — ${problems.join('; ')}.`);
  }
}

assertDestinationsWellFormed(STATION_DESTINATIONS);

const DESTINATION_INDEX: Record<string, StationDestination> = Object.fromEntries(
  STATION_DESTINATIONS.map((d) => [d.id, d]),
);

// activation key → destination. Returns null for a null/unmapped key, in which
// case the shell falls back to Home exactly as it does today. Pure lookup — no
// entity branching lives here.
export function resolveDestination(activation: string | null): StationDestination | null {
  if (!activation) return null;
  return DESTINATION_INDEX[activation] ?? null;
}
