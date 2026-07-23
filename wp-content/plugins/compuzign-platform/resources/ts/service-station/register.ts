import { ServicesIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { ServiceCatalogue } from './presentation/ServiceCatalogue';
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

  registerTemplateKits({
    'service-catalogue': ServiceCatalogue,
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
