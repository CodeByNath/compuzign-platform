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
export type DataSourceKey = 'package-families' | 'service-categories';
export type TemplateKitKey = 'category-group-cards' | 'service-category-carousel';

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

// One bound surface — one "wall". A station may own several at the SAME
// placement (card walls stacked in the presentation region) as well as at
// different placements (a presentation wall and a body table). Each is a row.
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
  // Optional heading rendered above this wall. Data, not a shell branch — it
  // exists because a region holding more than one wall must say which is which.
  // A lone wall can omit it and render bare.
  title?: string;
}

// The station whose presentation wall the Home body shows when no nav
// destination is active — the Service home is the landing surface. Kept named
// rather than a bare literal in the Body so the default is one documented place.
export const DEFAULT_HOME_STATION = 'services';

// The table. The Service home presentation region holds Package Families and a
// compact Service Categories carousel. Rows render in the order they appear.
//
// The list shape is not vestigial. A placement resolves to a LIST of walls, and
// this table carried two of them (Package Families beside a Service Category
// Groups wall) without a single edit to the card, the grid, the host, the drawer
// shell, or the Body. Removing that wall was likewise one row: a wall is a row,
// which is exactly what makes adding, reordering, or retiring one cheap.
//
// Packages / Promotions presentation surfaces are intentionally absent — no row
// is invented before a real data source and kit exist for them (they resolve to
// nothing and the region shows its neutral empty state).
export const SURFACE_BINDINGS: AdminStationSurfaceBinding[] = [
  {
    stationId: 'services',
    surfaceId: 'package-families',
    placement: 'presentation',
    title: 'Package Families',
    dataSourceKey: 'package-families',
    templateKitKey: 'category-group-cards',
    conditions: { scope: 'current' },
    drawerTemplateKey: 'package-family',
    // One intent, because the card offers one action. Edit is NOT withdrawn:
    // the drawer this opens registers both modes as tabs, so edit stays one
    // click away without the card face carrying a menu.
    actionIntents: [
      { id: 'view', target: 'drawer', mode: 'view' },
    ],
  },
  {
    stationId: 'services',
    surfaceId: 'service-categories',
    placement: 'presentation',
    title: 'Service Categories',
    dataSourceKey: 'service-categories',
    templateKitKey: 'service-category-carousel',
    conditions: { scope: 'current' },
    actionIntents: [],
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

// station + placement → every wall bound there, in table order. Built once at
// load; the table is static data.
const BINDING_INDEX: Record<string, AdminStationSurfaceBinding[]> = SURFACE_BINDINGS.reduce(
  (index, binding) => {
    const key = `${binding.stationId}::${binding.placement}`;
    (index[key] ??= []).push(binding);
    return index;
  },
  {} as Record<string, AdminStationSurfaceBinding[]>,
);

// Resolve every wall bound to a station's placement region, in table order.
// Returns an empty array when the station has nothing bound there (the region
// then shows its empty state).
//
// A placement holds a LIST, not one surface: a region can stack several walls,
// each with its own source, kit, actions, and drawer, and the Service home
// region has done so. `surfaceId` is what keeps walls at one placement distinct
// — the well-formedness guard still rejects two rows sharing
// station + surface + placement, which would be a genuine ambiguity.
export function resolveSurfaceBindings(
  stationId: string,
  placement: StationPlacement,
): AdminStationSurfaceBinding[] {
  return BINDING_INDEX[`${stationId}::${placement}`] ?? [];
}
