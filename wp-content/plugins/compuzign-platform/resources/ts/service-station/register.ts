import { ServicesIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { ServiceLowerDeck } from './presentation/ServiceLowerDeck';
import { ServiceDrawerHost } from './surface/ServiceDrawerHost';
import { useServiceCards } from './surface/useServiceCards';
import { useServiceCatalogue } from './surface/useServiceCatalogue';

export function registerServiceStation(): void {
  registerNavItems([
    {
      id: 'services',
      label: 'Services',
      icon: ServicesIcon,
      activationKey: 'services',
      showInHeader: true,
      showInMenu: true,
      order: 10,
    },
  ]);

  registerDestinations([
    {
      id: 'services',
      stationId: 'services',
      surfaceId: 'catalog',
      placement: 'body',
      mode: 'table',
      conditions: { scope: 'current' },
    },
  ]);

  registerDataSources({
    services: useServiceCards,
    'service-catalogue': useServiceCatalogue,
  });

  // Service Home's presentation placement is the lower deck; the catalogue is
  // one lane inside it rather than a surface of its own.
  registerTemplateKits({
    'service-lower-deck': ServiceLowerDeck,
  });

  registerDrawerTemplates([
    {
      key: 'service',
      title: 'Service',
      supportedModes: ['view', 'edit'],
      content: ServiceDrawerHost,
    },
  ]);
}
