import { registerDataSources } from '@/station-manager/registry/dataSources';
import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import {
  registerSurfaceBindings,
  setDefaultHomeStation,
} from '@/station-manager/registry/surfaceBindings';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { CategoryGroupCardsKit } from './presentation/category-groups/CategoryGroupCardsKit';
import { ServiceCategoryCarousel } from './presentation/service-categories/ServiceCategoryCarousel';
import { PromotionsIcon } from './shell/icons';
import { CategoryDrawerHost } from './stations/serviceCategory/CategoryDrawerHost';
import { useServiceCategoryCards } from './stations/serviceCategory/useServiceCategoryCards';

export function registerAdminStation(): void {
  registerNavItems([
    {
      id: 'promotions',
      label: 'Promotions',
      icon: PromotionsIcon,
      activationKey: 'promotions',
      showInHeader: true,
      showInMenu: true,
      order: 30,
    },
  ]);

  registerDestinations([
    {
      id: 'promotions',
      stationId: 'promotions',
      surfaceId: 'catalog',
      placement: 'body',
      mode: 'table',
      conditions: { scope: 'current' },
    },
  ]);

  registerDataSources({
    'service-categories': useServiceCategoryCards,
  });

  registerTemplateKits({
    'category-group-cards': CategoryGroupCardsKit,
    'service-category-carousel': ServiceCategoryCarousel,
  });

  registerDrawerTemplates([
    {
      key: 'category',
      title: 'Category',
      supportedModes: ['view', 'edit'],
      content: CategoryDrawerHost,
    },
  ]);
}

export function registerPresentationPolicy(): void {
  registerSurfaceBindings([
    {
      stationId: 'services',
      surfaceId: 'package-families',
      placement: 'presentation',
      order: 0,
      title: 'Package Families',
      dataSourceKey: 'package-families',
      templateKitKey: 'category-group-cards',
      conditions: { scope: 'current' },
      drawerTemplateKey: 'package-family',
      actionIntents: [
        { id: 'view', target: 'drawer', mode: 'view' },
      ],
    },
    {
      stationId: 'services',
      surfaceId: 'service-catalogue',
      placement: 'presentation',
      order: 1,
      dataSourceKey: 'service-catalogue',
      templateKitKey: 'service-catalogue',
      conditions: { scope: 'current' },
      drawerTemplateKey: 'service',
      actionIntents: [
        { id: 'view', target: 'drawer', mode: 'view' },
      ],
    },
    {
      stationId: 'packages',
      surfaceId: 'tier-tool',
      placement: 'presentation',
      order: 0,
      title: 'Tier Workspace Engine',
      dataSourceKey: 'package-tier-workspace',
      templateKitKey: 'tier-workspace',
      conditions: { scope: 'current' },
      drawerTemplateKey: 'tier',
      actionIntents: [
        { id: 'view', target: 'drawer', mode: 'view' },
        { id: 'edit', target: 'drawer', mode: 'edit' },
        { id: 'create-package-family', target: 'drawer', mode: 'edit', drawerTemplateKey: 'package-family-create' },
        // Registering a Tier system uses the binding's own `tier` drawer at its
        // registration address — the same mature composition, addressed before
        // any instance exists. It needs no drawer key of its own.
        { id: 'register-tier', target: 'drawer', mode: 'edit' },
        // The lower-deck Settings cards open the Package-owned Rate Sheet drawer
        // from this same surface. Its own drawer key overrides the binding's
        // `tier`, so no second body surface renders beneath the workspace.
        //
        // Settings launches the same drawer in edit mode, because that is where
        // the Rate Sheet tool already keeps `New Rate Sheet` and the per-sheet
        // `Create Group`. Groups have no launcher of their own: a group is stored
        // inside `rate_sheets[].groups[]`, so the sheet that holds it is the only
        // place it can be authored.
        { id: 'rate-sheet', target: 'drawer', mode: 'view', drawerTemplateKey: 'rate-sheet' },
        { id: 'create-rate-sheet', target: 'drawer', mode: 'edit', drawerTemplateKey: 'rate-sheet' },
        // The lower-deck Details rows address ONE inclusion, not the whole
        // Tier, so they carry their own intents and their own drawer key. The
        // binding's `view`/`edit` remain the Tier's, dispatched by the Tier
        // cards and detail panel above the deck.
        { id: 'view-inclusion', target: 'drawer', mode: 'view', drawerTemplateKey: 'tier-inclusion' },
        { id: 'edit-inclusion', target: 'drawer', mode: 'edit', drawerTemplateKey: 'tier-inclusion' },
        // The lower-deck Connections lane addresses what the focused Tier is
        // connected TO — its Package Family, its Rate Sheet groups, and its Rate
        // Sheet — so each section carries its own intents and its own drawer key.
        // The Family sections reuse the mature `package-family` drawer rather
        // than introducing a second Family editor; none of these open `tier`.
        { id: 'view-family', target: 'drawer', mode: 'view', drawerTemplateKey: 'package-family' },
        { id: 'edit-family', target: 'drawer', mode: 'edit', drawerTemplateKey: 'package-family' },
        { id: 'view-connected-group', target: 'drawer', mode: 'view', drawerTemplateKey: 'tier-rate-sheet-group' },
        { id: 'edit-connected-group', target: 'drawer', mode: 'edit', drawerTemplateKey: 'tier-rate-sheet-group' },
        { id: 'view-connected-rate-sheet', target: 'drawer', mode: 'view', drawerTemplateKey: 'tier-rate-sheet' },
        { id: 'edit-connected-rate-sheet', target: 'drawer', mode: 'edit', drawerTemplateKey: 'tier-rate-sheet' },
      ],
    },
  ]);

  setDefaultHomeStation('services');
}
