export interface AdminOverview {
  services_published: number;
  services_draft: number;
  health: Record<string, boolean>;
  platform_version: string | null;
}

export type WorkstationId =
  | 'overview'
  | 'service-catalog'
  | 'pricing'
  | 'promotions'
  | 'bundles'
  | 'featured'
  | 'requests'
  | 'health';

export interface WorkstationDef {
  id: WorkstationId;
  label: string;
  icon: string;
  group: string;
}

export const WORKSTATIONS: WorkstationDef[] = [
  { id: 'overview',        label: 'Overview',          icon: '◈', group: 'command'    },
  { id: 'service-catalog', label: 'Service Catalog',   icon: '⚙', group: 'catalog'    },
  { id: 'pricing',         label: 'Pricing',           icon: '¤', group: 'catalog'    },
  { id: 'promotions',      label: 'Promotions',        icon: '◷', group: 'catalog'    },
  { id: 'bundles',         label: 'Bundles',           icon: '❐', group: 'catalog'    },
  { id: 'featured',        label: 'Featured Controls', icon: '◆', group: 'catalog'    },
  { id: 'requests',        label: 'Requests & Quotes', icon: '◎', group: 'operations' },
  { id: 'health',          label: 'Health & Status',   icon: '◉', group: 'operations' },
];

export const WORKSTATION_LABELS: Record<WorkstationId, string> = Object.fromEntries(
  WORKSTATIONS.map((w) => [w.id, w.label]),
) as Record<WorkstationId, string>;
