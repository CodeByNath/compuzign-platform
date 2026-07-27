// Service Home lower deck — the Service-owned deck beneath the Package Family
// cards.
//
// Composition only. It holds the selected lane and hands the catalogue the exact
// template-kit props the surface host gave it, unchanged, so the Service
// Catalogue keeps its own hooks, filters, table, pagination, and drawer actions
// and this file adds none of its own. It fetches nothing, opens no drawer,
// derives no relationship, and names no Package or Tier presentation.
//
// The lanes are the shared station tab set's; only which lanes exist and what
// each one holds is Service's.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { StationTabSet } from '@/admin-station/presentation/StationTabSet';
import { ServiceCatalogue } from './ServiceCatalogue';

export type ServiceDeckTab = 'details' | 'connections' | 'settings';

const TABS: { id: ServiceDeckTab; label: string }[] = [
  { id: 'details',     label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

// Connections and Settings are declared lanes with no content yet. They state
// exactly that: Service owns no Connections or Settings presentation, and
// nothing here invents one, reads one, or promises a shape for one. Whatever
// eventually fills them is a decision for the Station that owns the records.
const EMPTY_LANE: Record<Exclude<ServiceDeckTab, 'details'>, string> = {
  connections: 'Service Connections are not available here yet.',
  settings:    'Service Settings are not available here yet.',
};

export function ServiceLowerDeck(props: TemplateKitProps): VNode {
  const [activeTab, setActiveTab] = useState<ServiceDeckTab>('details');

  return (
    <section class="cz-service-deck" aria-label="Service sections">
      <StationTabSet
        label="Service sections"
        items={TABS}
        selectedId={activeTab}
        onSelect={setActiveTab}
        renderPanel={(tab) => (
          tab === 'details'
            ? <ServiceCatalogue {...props} />
            : <p class="cz-station-empty">{EMPTY_LANE[tab]}</p>
        )}
      />
    </section>
  );
}
