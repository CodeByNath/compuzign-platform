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
export type DataSourceKey = 'package-families' | 'package-tools' | 'service-categories' | 'services' | 'service-tiers' | 'service-catalogue';
export type TemplateKitKey = 'category-group-cards' | 'package-tools' | 'service-category-carousel' | 'service-catalogue';

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
  // Declared position of this wall within its placement region. The resolver
  // sorts by this — never by array position alone — so where a row sits in the
  // table can't silently decide what renders first. Ties keep registration
  // order (the sort is stable).
  order: number;
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

// The table. Service Home leads with the Package Family card wall (order 0) so
// the family groups are what a visitor meets first, followed by the tall
// browse-first catalogue (order 1). Declared `order` is the authority; rows are
// merely kept in reading order to match.
//
// The list shape is not vestigial. A placement resolves to a LIST of walls; the
// current Home carries two, and the former Category, Service-card, and Tier
// walls were retired from Home by removing binding rows only. The card, grid,
// host, drawer shell, sources, and kits remain reusable.
//
// Packages / Promotions presentation surfaces are intentionally absent — no row
// is invented before a real data source and kit exist for them (they resolve to
// nothing and the region shows its neutral empty state).
export const SURFACE_BINDINGS: AdminStationSurfaceBinding[] = [
  {
    stationId: 'services',
    surfaceId: 'package-families',
    placement: 'presentation',
    order: 0,
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
    surfaceId: 'service-catalogue',
    placement: 'presentation',
    order: 1,
    dataSourceKey: 'service-catalogue',
    templateKitKey: 'service-catalogue',
    conditions: { scope: 'current' },
    drawerTemplateKey: 'service',
    actionIntents: [
      { id: 'view', target: 'drawer', mode: 'view' },
    ],
  },
  // Package Station Home. The `packages` destination previously mounted
  // nothing; binding the Package Families wall makes it a real workstation
  // whose first-class records are the Families/Groups themselves. Opening a
  // Family card leads to its drawer → Settings → Tools. This reuses the existing
  // Package Families source, the card kit, and the Family drawer — one binding
  // row, no shell edit, and no Package Manager authority is copied.
  {
    stationId: 'packages',
    surfaceId: 'package-families',
    placement: 'presentation',
    order: 0,
    title: 'Package Families',
    dataSourceKey: 'package-families',
    templateKitKey: 'category-group-cards',
    conditions: { scope: 'current' },
    drawerTemplateKey: 'package-family',
    actionIntents: [
      { id: 'view', target: 'drawer', mode: 'view' },
    ],
  },
  // Package Station Tools / Skills — the full tool catalogue, at STATION level,
  // once. It sits after the Families wall (order 1) so the Package Station reads
  // as a workstation (Families first, then the tools that extend it), not a
  // tools-only page. The catalogue is presentation only: it names the available
  // tools, their owning authority, and how many Families use each, and it
  // carries no drawer key and no action intent because assignment is owned by
  // the Family and edited from a Family's Settings — this wall never mutates.
  {
    stationId: 'packages',
    surfaceId: 'package-tools',
    placement: 'presentation',
    order: 1,
    title: 'Tools / Skills',
    dataSourceKey: 'package-tools',
    templateKitKey: 'package-tools',
    conditions: { scope: 'current' },
    actionIntents: [],
  },
];

// Service Categories, the former Service card wall, and Package Tiers stay in
// the source/kit registries but are intentionally unbound from Home. Their
// presentation and drawer adapters remain available for future placements.

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

// station + placement → every wall bound there, sorted by declared `order`.
// Built and sorted once at load; the table is static data. The sort is stable,
// so two walls declaring the same order keep their registration order — a
// deterministic tie-break without inventing a second ordering rule.
const BINDING_INDEX: Record<string, AdminStationSurfaceBinding[]> = SURFACE_BINDINGS.reduce(
  (index, binding) => {
    const key = `${binding.stationId}::${binding.placement}`;
    (index[key] ??= []).push(binding);
    return index;
  },
  {} as Record<string, AdminStationSurfaceBinding[]>,
);

for (const walls of Object.values(BINDING_INDEX)) {
  walls.sort((a, b) => a.order - b.order);
}

// Resolve every wall bound to a station's placement region, in declared order.
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
