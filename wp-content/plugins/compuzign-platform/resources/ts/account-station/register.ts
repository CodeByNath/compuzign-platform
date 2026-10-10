import { AccountIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { AccountDrawerHost } from './surface/AccountDrawerHost';
import { useAccountProfileCard } from './surface/useAccountProfileCard';

export function registerAccountStation(): void {
  registerNavItems([
    {
      id: 'account',
      label: 'Account',
      icon: AccountIcon,
      activationKey: 'account',
      showInHeader: true,
      showInMenu: true,
      order: 50,
    },
  ]);

  registerDestinations([
    {
      id: 'account',
      stationId: 'account',
      surfaceId: 'profile',
      placement: 'body',
      // A one-record surface, not a list — the genuine 'card' viewpoint
      // (ShellMode already declares it; no destination has used it yet).
      mode: 'card',
      conditions: { scope: 'current' },
    },
  ]);

  registerDataSources({
    'account-profile': useAccountProfileCard,
  });

  registerDrawerTemplates([
    {
      key: 'account',
      title: 'Account Profile',
      supportedModes: ['view', 'edit'],
      content: AccountDrawerHost,
    },
  ]);
}
