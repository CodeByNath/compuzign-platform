// Admin Station surface bindings — the dynamic destination → template table.
//
// This is the lean registration layer the shell was always heading toward, in
// its correct DYNAMIC form. It is NOT the dropped `stationId + surfaceId →
// EntitySchema` idea: it binds a station surface to a data source KEY and a
// template kit KEY (indirection, resolved at mount), never to a fixed entity
// schema, and never value-imports an old renderer.
//
//   destination (station + surface + placement)
//     → data source key      (which read supplies the records)
//       → template kit key    (which presentation kit loops them)
//         → conditions        (what the source resolves — scope, etc.)
//           → action intents  (what the kit may dispatch, and where it goes)
//
// The shell stays entity-agnostic: it prints whatever kit a binding names into
// the placement region, and never branches on entity. Adding a future surface is
// one row here plus one data-source and (if new) one kit entry — no shell edit.
//
// This table is data only. Key existence in the data-source / template-kit
// registries is validated where those registries are in scope
// (StationSurfaceHost), so a typo fails loudly at load rather than silently
// rendering nothing.

import type { StationPlacement, StationConditions } from '../navigation/destinations';
import type { DrawerTemplateKey } from './drawers/drawerTypes';

// Registry keys. Kept as string-literal unions so a binding can only name a
// source / kit the registries actually define (the registries are typed by the
// same unions), and a new surface is a deliberate, type-checked addition.
export type DataSourceKey = 'service-category-groups';
export type TemplateKitKey = 'category-group-cards';

// One action a surface may dispatch — entity-agnostic. `id` matches the kit's
// own action id; `target` + `mode` say where the dispatched record identity
// goes. 'drawer' is the only target this phase declares; `mode` names the drawer
// tab to open ('view' | 'edit'), kept a plain string so this contract stays
// decoupled from the drawer registry's mode type.
export interface StationActionIntent {
  id: string;
  target: 'drawer';
  mode: string;
}

// One bound surface. A station may own several (a presentation wall, a body
// table, …); each placement is a separate row.
export interface AdminStationSurfaceBinding {
  stationId: string;
  surfaceId: string;
  placement: StationPlacement;
  dataSourceKey: DataSourceKey;
  templateKitKey: TemplateKitKey;
  conditions?: StationConditions;
  actionIntents: StationActionIntent[];
  // The drawer template a 'drawer'-targeted intent opens. Optional: a surface
  // whose intents open no drawer (or which has none) simply omits it.
  drawerTemplateKey?: DrawerTemplateKey;
}

// The station whose presentation wall the Home body shows when no nav
// destination is active — the Service home is the landing surface. Kept named
// rather than a bare literal in the Body so the default is one documented place.
export const DEFAULT_HOME_STATION = 'services';

// The table. One real row this phase: the Service home presentation wall, the
// Service Category Groups as cards. Packages / Promotions presentation surfaces
// are intentionally absent — no row is invented before a real data source and
// kit exist for them (they resolve to nothing and the region shows its neutral
// empty state).
export const SURFACE_BINDINGS: AdminStationSurfaceBinding[] = [
  {
    stationId: 'services',
    surfaceId: 'category-groups',
    placement: 'presentation',
    dataSourceKey: 'service-category-groups',
    templateKitKey: 'category-group-cards',
    conditions: { scope: 'current' },
    drawerTemplateKey: 'service-category-group',
    actionIntents: [
      { id: 'view', target: 'drawer', mode: 'view' },
      { id: 'edit', target: 'drawer', mode: 'edit' },
    ],
  },
];

// Structural key for a binding's addressable identity: one surface per
// station + surface + placement. Two rows sharing it are an authoring slip that
// would make resolution ambiguous.
function bindingKey(b: AdminStationSurfaceBinding): string {
  return `${b.stationId}::${b.surfaceId}::${b.placement}`;
}

// Authoring guard — runs once at load. Fails loudly on a duplicate
// station + surface + placement so the table can never resolve ambiguously as it
// grows.
export function assertBindingsWellFormed(list: AdminStationSurfaceBinding[]): void {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const b of list) {
    const key = bindingKey(b);
    if (seen.has(key)) dupes.push(key);
    else seen.add(key);
  }
  if (dupes.length) {
    throw new Error(
      `[AdminStation] surface binding table is malformed — duplicate station::surface::placement: ${dupes.join(', ')}.`,
    );
  }
}

assertBindingsWellFormed(SURFACE_BINDINGS);

const BINDING_INDEX: Record<string, AdminStationSurfaceBinding> = Object.fromEntries(
  SURFACE_BINDINGS.map((b) => [`${b.stationId}::${b.placement}`, b]),
);

// Resolve the binding for a station's placement region. Returns null when the
// station has no surface bound there (the region then shows its empty state).
// Keyed by station + placement: a station has at most one surface per region.
export function resolveSurfaceBinding(
  stationId: string,
  placement: StationPlacement,
): AdminStationSurfaceBinding | null {
  return BINDING_INDEX[`${stationId}::${placement}`] ?? null;
}
