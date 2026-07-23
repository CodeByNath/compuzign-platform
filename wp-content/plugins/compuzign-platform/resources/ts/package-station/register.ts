import { PackagesIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { PackageTierWorkspace } from './presentation/package-tier-workspace/PackageTierWorkspace';
import { RateSheetToolKit } from './presentation/rate-sheet-tool/RateSheetTool';
import { PackageFamilyDrawerContent } from './surface/packageFamily/PackageFamilyDrawerContent';
import { usePackageFamilyCards } from './surface/packageFamily/usePackageFamilyCards';
import { usePackageTierWorkspace } from './surface/packageTierWorkspace/usePackageTierWorkspace';
import { useRateSheetTool } from './surface/rateSheetTool/useRateSheetTool';
import { TierDrawerHost } from './surface/tierSurface/TierDrawerHost';
import { useServiceTierCards } from './surface/tierSurface/useServiceTierCards';

export function registerPackageStation(): void {
  registerNavItems([
    {
      id: 'packages',
      label: 'Packages',
      icon: PackagesIcon,
      activationKey: 'packages',
      showInHeader: true,
      showInMenu: true,
      order: 20,
    },
  ]);

  registerDestinations([
    {
      id: 'packages',
      stationId: 'packages',
      surfaceId: 'catalog',
      placement: 'body',
      mode: 'table',
      conditions: { scope: 'current' },
    },
  ]);

  registerDataSources({
    'package-families': usePackageFamilyCards,
    'service-tiers': useServiceTierCards,
    'package-tier-workspace': usePackageTierWorkspace,
    'rate-sheet-tool': useRateSheetTool,
  });

  registerTemplateKits({
    'tier-workspace': PackageTierWorkspace,
    'rate-sheet-tool': RateSheetToolKit,
  });

  registerDrawerTemplates([
    {
      key: 'package-family',
      title: 'Package Family',
      supportedModes: ['view', 'edit'],
      content: PackageFamilyDrawerContent,
    },
    {
      key: 'tier',
      title: 'Package Tier',
      supportedModes: ['view', 'edit'],
      content: TierDrawerHost,
    },
  ]);
}
