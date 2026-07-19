// Station registry (Schema architecture S5, §8).
//
// The galaxy layer: one entry per station, grouped by GroupSchema.
// StationRouter dispatches from this registry and Sidebar renders it —
// adding a station is one entry here (plus its surface component, unless
// it is an entity-table surface resolved through a station manifest).
//
// Surfaces are environments, never modes (§7):
// - { kind: 'entity-table' } — a manifest-driven table surface; the generic
//   EntityTableStation resolves the entity's TableSchema from ENTITIES.
//   Data flow and transition handlers stay renderer-side (Station DNA
//   boundary) — this registry declares intent only.
// - { kind: 'component' } — a bespoke page. Requests keeps its own
//   RequestLifecycle and registers here, out of scope for station manifests
//   in v1 (§8).

import type { ComponentType } from 'preact';
import type { StationDef, StationId } from '@/api/types/admin';
import type { ActionConfig } from '../ActionShell';
import type { NavIconId } from '@/drawer-kit/schema/icons';
import { OverviewStation } from '../stations/OverviewStation';
import { ServiceCatalogStation } from '../stations/ServiceCatalogStation';
import { PackageManagerStation } from '../stations/PackageManagerStation';
import { CategoryCatalogStation } from '../stations/CategoryCatalogStation';
import { ServiceCategoryGroupCatalogStation } from '../stations/ServiceCategoryGroupCatalogStation';
import { BundlesStation } from '../stations/BundlesStation';
import { FeaturedStation } from '../stations/FeaturedStation';
import { RequestsStation } from '../stations/RequestsStation';
import { HealthStation } from '../stations/HealthStation';
import { BinStation } from '../stations/BinStation';
import type { EntityTravelSource } from '../stations/entityTravelSources';
import {
  serviceTravelSource,
  categoryTravelSource,
  serviceCategoryGroupTravelSource,
} from '../stations/entityTravelSources';

export interface GroupSchema { id: string; label: string; order: number }

// Sidebar navigation guard: a surface with unsaved page state registers an
// interceptor; AdminShell routes station switches through it. The
// interceptor decides (possibly after its own confirmation UI) whether to run
// `proceed`. Registering null releases the guard.
export type StationNavigationInterceptor = (proceed: () => void) => void;

// Every surface component receives the same props; components that need less
// (no openAction) simply declare less — assignability is contravariant.
export interface StationSurfaceProps {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
  setNavigationInterceptor?: (interceptor: StationNavigationInterceptor | null) => void;
}

export type StationSurface =
  // The runtime `source` (row loader + transition handlers) rides with the
  // registration — the owning surface — so the generic EntityTableStation
  // engine holds no per-entity branch. The manifest (ENTITIES[entity]) stays
  // declaration-only; see stations/entityTravelSources.ts.
  | { kind: 'entity-table'; entity: string; scope: 'current' | 'archived' | 'trashed'; source: EntityTravelSource }
  | { kind: 'component'; component: () => ComponentType<StationSurfaceProps> };

export interface StationSchema extends StationDef {
  // Nav glyph (NAV_ICONS section of the icon registry). Optional: hidden and
  // child entries render without one.
  iconId?: NavIconId;
  // Hidden from nav UI — routes and surfaces remain fully intact.
  // service-archived / service-trash are surfaced through the consolidated
  // Bin view; their standalone surfaces stay routable but leave the menu.
  hiddenFromNav?: boolean;
  surface: StationSurface;
}

export const STATION_GROUPS: GroupSchema[] = [
  { id: 'command',    label: 'Command',    order: 1 },
  { id: 'catalog',    label: 'Catalog',    order: 2 },
  { id: 'operations', label: 'Operations', order: 3 },
];

export const STATIONS: StationSchema[] = [
  { id: 'overview',         label: 'Overview',          group: 'command',    iconId: 'overview',
    surface: { kind: 'component', component: () => OverviewStation } },
  { id: 'service-catalog',  label: 'Service Catalog',   group: 'catalog',    iconId: 'catalog',
    surface: { kind: 'component', component: () => ServiceCatalogStation } },
  { id: 'service-archived', label: 'Archived',          group: 'catalog',    parent: 'service-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'service', scope: 'archived', source: serviceTravelSource } },
  { id: 'service-trash',    label: 'Trash',             group: 'catalog',    parent: 'service-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'service', scope: 'trashed', source: serviceTravelSource } },
  { id: 'package-manager',  label: 'Packages',          group: 'catalog',    iconId: 'package',
    surface: { kind: 'component', component: () => PackageManagerStation } },
  { id: 'category-catalog', label: 'Categories',        group: 'catalog',    iconId: 'category',
    surface: { kind: 'component', component: () => CategoryCatalogStation } },
  // Category / Service Category Group travel surfaces, rendered by the same
  // generic engine via registration-supplied sources. hiddenFromNav mirrors the
  // Service pair above: routable by destination id, fronted for users by the
  // consolidated Bin. NOTE: this supersedes the earlier S6/Option-B "bin is the
  // sole travel surface" note (no standalone category-archived/trash routes) —
  // the generic engine makes these one registration entry, not a bespoke screen.
  { id: 'category-archived', label: 'Archived',         group: 'catalog',    parent: 'category-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'category', scope: 'archived', source: categoryTravelSource } },
  { id: 'category-trash',    label: 'Trash',            group: 'catalog',    parent: 'category-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'category', scope: 'trashed', source: categoryTravelSource } },
  { id: 'category-group-catalog', label: 'Service Category Groups', group: 'catalog', iconId: 'category',
    surface: { kind: 'component', component: () => ServiceCategoryGroupCatalogStation } },
  { id: 'category-group-archived', label: 'Archived',   group: 'catalog',    parent: 'category-group-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'category-group', scope: 'archived', source: serviceCategoryGroupTravelSource } },
  { id: 'category-group-trash',    label: 'Trash',      group: 'catalog',    parent: 'category-group-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'category-group', scope: 'trashed', source: serviceCategoryGroupTravelSource } },
  { id: 'bundles',          label: 'Bundles',           group: 'catalog',    hiddenFromNav: true,
    surface: { kind: 'component', component: () => BundlesStation } },
  { id: 'featured',         label: 'Featured Controls', group: 'catalog',    iconId: 'featured',
    surface: { kind: 'component', component: () => FeaturedStation } },
  { id: 'requests',         label: 'Requests & Quotes', group: 'operations', iconId: 'requests',
    surface: { kind: 'component', component: () => RequestsStation } },
  { id: 'health',           label: 'Health & Status',   group: 'operations', hiddenFromNav: true,
    surface: { kind: 'component', component: () => HealthStation } },
  { id: 'bin',              label: 'Bin',               group: 'operations', iconId: 'bin',
    surface: { kind: 'component', component: () => BinStation } },
];

export const STATION_INDEX: Record<StationId, StationSchema> = Object.fromEntries(
  STATIONS.map((w) => [w.id, w]),
) as Record<StationId, StationSchema>;

export const STATION_LABELS: Record<StationId, string> = Object.fromEntries(
  STATIONS.map((w) => [w.id, w.label]),
) as Record<StationId, string>;
