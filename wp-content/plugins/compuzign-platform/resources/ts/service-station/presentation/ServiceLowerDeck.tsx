// Service Home lower deck — the Service-owned deck beneath the Package Family
// cards.
//
// Composition only. It holds the selected lane and hands the catalogue the exact
// template-kit props the surface host gave it, unchanged, so the Service
// Catalogue keeps its own hooks, filters, table, pagination, and drawer actions
// and this file adds none of its own. Connections and Settings are Service's own
// lanes: Connections reads the authoritative Category projection (its own data
// source, below), Settings renders two creation launchers — neither derives a
// relationship or fetches through the Details lane's catalogue props, and
// neither names a Package or Tier presentation.
//
// The lanes are the shared station tab set's; only which lanes exist and what
// each one holds is Service's.
//
// It presents as one framed deck — context bar, tab strip, active lane — so
// Service Home and Package Home read identically. The proportions are restated
// under Service's own class names: matching Package Home's look is a styling
// decision and carries none of the Tier engine's meaning across.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import {
  StationTabSet,
  type StationTabSetClasses,
} from '@/admin-station/presentation/StationTabSet';
import { ServicesIcon } from '@/admin-station/shell/icons';
import { ServiceCatalogue } from './ServiceCatalogue';
import { ServiceConnectionsLane } from './ServiceConnectionsLane';
import { ServiceSettingsLane } from './ServiceSettingsLane';

export type ServiceDeckTab = 'details' | 'connections' | 'settings';

// The deck opts into the shared strip and adds only what its frame needs: the
// inset that lines the tabs up with the context bar, and the panel spacing the
// active lane sits in.
const DECK_CLASSES: StationTabSetClasses = {
  list:  'cz-station-tabset__list cz-service-deck__tabs',
  tab:   'cz-station-tabset__tab',
  panel: 'cz-station-tabset__panel cz-service-deck__panel',
};

const TABS: { id: ServiceDeckTab; label: string }[] = [
  { id: 'details',     label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

export function ServiceLowerDeck(props: TemplateKitProps): VNode {
  const [activeTab, setActiveTab] = useState<ServiceDeckTab>('details');

  return (
    <section class="cz-service-deck" aria-label="Service Catalogue">
      <div class="cz-service-deck__bar">
        <div class="cz-service-deck__context">
          <span class="cz-service-deck__context-icon" aria-hidden="true"><ServicesIcon /></span>
          <h3 class="cz-service-deck__context-name">Service Catalogue</h3>
        </div>
      </div>

      <StationTabSet
        label="Service sections"
        items={TABS}
        selectedId={activeTab}
        onSelect={setActiveTab}
        classes={DECK_CLASSES}
        renderPanel={(tab) =>
          tab === 'details'
            ? <ServiceCatalogue {...props} />
            : tab === 'connections'
              ? <ServiceConnectionsLane onIntent={props.onIntent} />
              : <ServiceSettingsLane onIntent={props.onIntent} />
        }
      />
    </section>
  );
}
