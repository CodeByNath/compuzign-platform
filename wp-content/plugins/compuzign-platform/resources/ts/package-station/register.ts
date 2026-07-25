import { PackagesIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { PackageTierWorkspace } from './presentation/package-tier-workspace/PackageTierWorkspace';
import { RateSheetDrawerContent } from './presentation/rate-sheet-tool/RateSheetTool';
import { PackageFamilyDrawerContent } from './surface/packageFamily/PackageFamilyDrawerContent';
import { PackageFamilyCreateDrawerHost } from './surface/packageFamily/PackageFamilyCreateDrawerHost';
import { usePackageFamilyCards } from './surface/packageFamily/usePackageFamilyCards';
import { usePackageTierWorkspace } from './surface/packageTierWorkspace/usePackageTierWorkspace';
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
  });

  registerTemplateKits({
    'tier-workspace': PackageTierWorkspace,
  });

  registerDrawerTemplates([
    {
      key: 'package-family-create',
      title: 'New Package Family',
      supportedModes: ['edit'],
      content: PackageFamilyCreateDrawerHost,
    },
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
    {
      // Package-owned Rate Sheet authoring, mounted in the generic Admin drawer.
      // Reuses `useRateSheetTool` and the Package Manager save contract; opened
      // from the Tier workspace Settings cards via the `rate-sheet` action intent.
      //
      // A normal registered Package drawer, not a special one: it supports the
      // same view → edit mode flow as `package-family` and `tier`, so it opens
      // readable and switches to authoring through the shell's own mode control.
      // The pricing grid needs more horizontal room than a record drawer, which
      // it declares with the generic `size` key rather than any bespoke width.
      key: 'rate-sheet',
      title: 'Rate Sheet',
      supportedModes: ['view', 'edit'],
      size: 'extra-wide',
      content: RateSheetDrawerContent,
    },
  ]);
}
