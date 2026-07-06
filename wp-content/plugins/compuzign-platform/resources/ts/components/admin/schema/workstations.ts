// Workstation registry (Schema architecture S5, §8).
//
// The galaxy layer: one entry per workstation, grouped by GroupSchema.
// WorkstationRouter dispatches from this registry and Sidebar renders it —
// adding a workstation is one entry here (plus its surface component, unless
// it is an entity-table surface resolved through a station manifest).
//
// Surfaces are environments, never modes (§7):
// - { kind: 'entity-table' } — a manifest-driven table surface; the generic
//   EntityTableWorkstation resolves the entity's TableSchema from ENTITIES.
//   Data flow and transition handlers stay renderer-side (Station DNA
//   boundary) — this registry declares intent only.
// - { kind: 'component' } — a bespoke page. Requests keeps its own
//   RequestLifecycle and registers here, out of scope for station manifests
//   in v1 (§8).

import type { ComponentType } from 'preact';
import type { WorkstationDef, WorkstationId } from '@/api/types/admin';
import type { ActionConfig } from '../ActionShell';
import type { NavIconId } from './icons';
import { OverviewWorkstation } from '../workstations/OverviewWorkstation';
import { ServiceCatalogWorkstation } from '../workstations/ServiceCatalogWorkstation';
import { BundlesWorkstation } from '../workstations/BundlesWorkstation';
import { FeaturedWorkstation } from '../workstations/FeaturedWorkstation';
import { RequestsWorkstation } from '../workstations/RequestsWorkstation';
import { HealthWorkstation } from '../workstations/HealthWorkstation';
import { BinWorkstation } from '../workstations/BinWorkstation';

export interface GroupSchema { id: string; label: string; order: number }

// Every surface component receives the same props; components that need less
// (no openAction) simply declare less — assignability is contravariant.
export interface WorkstationSurfaceProps {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

export type WorkstationSurface =
  | { kind: 'entity-table'; entity: string; scope: 'current' | 'archived' | 'trashed' }
  | { kind: 'component'; component: () => ComponentType<WorkstationSurfaceProps> };

export interface WorkstationSchema extends WorkstationDef {
  // Nav glyph (NAV_ICONS section of the icon registry). Optional: hidden and
  // child entries render without one.
  iconId?: NavIconId;
  // Hidden from nav UI — routes and surfaces remain fully intact.
  // service-archived / service-trash are surfaced through the consolidated
  // Bin view; their standalone surfaces stay routable but leave the menu.
  hiddenFromNav?: boolean;
  surface: WorkstationSurface;
}

export const WORKSTATION_GROUPS: GroupSchema[] = [
  { id: 'command',    label: 'Command',    order: 1 },
  { id: 'catalog',    label: 'Catalog',    order: 2 },
  { id: 'operations', label: 'Operations', order: 3 },
];

export const WORKSTATIONS: WorkstationSchema[] = [
  { id: 'overview',         label: 'Overview',          group: 'command',    iconId: 'overview',
    surface: { kind: 'component', component: () => OverviewWorkstation } },
  { id: 'service-catalog',  label: 'Service Catalog',   group: 'catalog',    iconId: 'catalog',
    surface: { kind: 'component', component: () => ServiceCatalogWorkstation } },
  { id: 'service-archived', label: 'Archived',          group: 'catalog',    parent: 'service-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'service', scope: 'archived' } },
  { id: 'service-trash',    label: 'Trash',             group: 'catalog',    parent: 'service-catalog', hiddenFromNav: true,
    surface: { kind: 'entity-table', entity: 'service', scope: 'trashed' } },
  { id: 'bundles',          label: 'Bundles',           group: 'catalog',    hiddenFromNav: true,
    surface: { kind: 'component', component: () => BundlesWorkstation } },
  { id: 'featured',         label: 'Featured Controls', group: 'catalog',    iconId: 'featured',
    surface: { kind: 'component', component: () => FeaturedWorkstation } },
  { id: 'requests',         label: 'Requests & Quotes', group: 'operations', iconId: 'requests',
    surface: { kind: 'component', component: () => RequestsWorkstation } },
  { id: 'health',           label: 'Health & Status',   group: 'operations', hiddenFromNav: true,
    surface: { kind: 'component', component: () => HealthWorkstation } },
  { id: 'bin',              label: 'Bin',               group: 'operations', iconId: 'bin',
    surface: { kind: 'component', component: () => BinWorkstation } },
];

export const WORKSTATION_INDEX: Record<WorkstationId, WorkstationSchema> = Object.fromEntries(
  WORKSTATIONS.map((w) => [w.id, w]),
) as Record<WorkstationId, WorkstationSchema>;

export const WORKSTATION_LABELS: Record<WorkstationId, string> = Object.fromEntries(
  WORKSTATIONS.map((w) => [w.id, w.label]),
) as Record<WorkstationId, string>;
