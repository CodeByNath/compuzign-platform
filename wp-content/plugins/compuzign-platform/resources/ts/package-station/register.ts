import { PackagesIcon } from '@/admin-station/shell/icons';
import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { PackageTierWorkspace } from './presentation/package-tier-workspace/PackageTierWorkspace';
import { RateSheetDrawerContent } from './presentation/rate-sheet-tool/RateSheetTool';
import { TierRateSheetDrawerContent } from './presentation/rate-sheet-tool/TierRateSheetDrawer';
import { PackageFamilyDrawerContent } from './surface/packageFamily/PackageFamilyDrawerContent';
import { usePackageFamilyCards } from './surface/packageFamily/usePackageFamilyCards';
import { usePackageTierWorkspace } from './surface/packageTierWorkspace/usePackageTierWorkspace';
import { TierDrawerHost } from './surface/tierSurface/TierDrawerHost';
import { TierInclusionDrawerHost } from './surface/tierSurface/TierInclusionDrawerHost';
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
      // One Tier's use of ONE Rate Sheet row, opened from the focused-Tier
      // lower deck's inclusion rows. A sibling of `tier`, not a variant of it:
      // the Tier drawer edits the whole Tier, this one edits the quantity that
      // Tier commits to a single inclusion. Its own drawer key overrides the
      // `tier-tool` binding's `tier`, the same per-intent override `rate-sheet`
      // uses, so the row action no longer opens the Tier overview.
      key: 'tier-inclusion',
      title: 'Inclusion',
      supportedModes: ['view', 'edit'],
      content: TierInclusionDrawerHost,
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
    {
      // ONE Tier's connection to ONE Rate Sheet, opened from the focused-Tier
      // Connections lane. Siblings of `rate-sheet`, addressed by
      // (tier_instance_id, slotId, rate_sheet_id[, group_id]): the sheet scope
      // shows only the grid filtered to that Tier's connected rows, the group
      // scope only the addressed group. Their own drawer keys override the
      // `tier-tool` binding's `tier`, so no Connections action opens the Tier
      // drawer. Both mount the same content, which reads the scope from the
      // routing token.
      key: 'tier-rate-sheet',
      title: 'Connected Rate Sheet',
      supportedModes: ['view', 'edit'],
      size: 'extra-wide',
      content: TierRateSheetDrawerContent,
    },
    {
      key: 'tier-rate-sheet-group',
      title: 'Connected Group',
      supportedModes: ['view', 'edit'],
      size: 'wide',
      content: TierRateSheetDrawerContent,
    },
  ]);
}
