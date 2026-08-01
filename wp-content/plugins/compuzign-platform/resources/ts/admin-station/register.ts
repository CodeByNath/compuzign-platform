import { registerDestinations } from '@/station-manager/registry/destinations';
import { registerDrawerTemplates } from '@/station-manager/registry/drawerTemplates';
import { registerNavItems } from '@/station-manager/registry/navigation';
import {
  registerSurfaceBindings,
  setDefaultHomeStation,
} from '@/station-manager/registry/surfaceBindings';
import { registerTemplateKits } from '@/station-manager/registry/templateKits';
import { CategoryGroupCardsKit } from './presentation/category-groups/CategoryGroupCardsKit';
import { PromotionsIcon } from './shell/icons';
import { CategoryDrawerHost } from './stations/serviceCategory/CategoryDrawerHost';

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

  registerTemplateKits({
    'category-group-cards': CategoryGroupCardsKit,
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
    // Service Home's lower deck. The surface still reads the catalogue source
    // and still opens the Service drawer; what changed is that Service composes
    // the catalogue as one lane of its own deck rather than as a bare wall.
    {
      stationId: 'services',
      surfaceId: 'service-lower-deck',
      placement: 'presentation',
      order: 1,
      dataSourceKey: 'service-catalogue',
      templateKitKey: 'service-lower-deck',
      conditions: { scope: 'current' },
      drawerTemplateKey: 'service',
      actionIntents: [
        { id: 'view', target: 'drawer', mode: 'view' },
        // Connections addresses a Category, not a Service, so it carries its
        // own intent and its own drawer key rather than overloading the
        // binding's default `service` target — the same one-surface/multiple-
        // drawer-keys shape the Tier binding below already uses for its
        // Connections lane's Family/Rate-Sheet targets.
        { id: 'view-category', target: 'drawer', mode: 'view', drawerTemplateKey: 'category' },
        // Settings' two launchers open the SAME mature Service/Category drawers
        // the binding's own `view`/`view-category` intents already open, at the
        // stable `'new'` recordId sentinel each host resolves into a pending
        // record — no separate creation drawer or registration. `mode: 'view'`
        // for the same reason Package Family's `create-package-family` intent
        // does: a drawer never opens pre-entered into an editor, including a
        // brand-new record — it opens readable, with the empty Overview module
        // carrying its own Pending pill and Edit action.
        { id: 'create-service', target: 'drawer', mode: 'view', drawerTemplateKey: 'service' },
        { id: 'create-category', target: 'drawer', mode: 'view', drawerTemplateKey: 'category' },
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
        // Creating a Family opens the SAME mature `package-family` drawer the
        // 'new' sentinel recordId already understands — no separate creation
        // drawer/registration. `mode: 'view'` because a drawer never opens
        // pre-entered into an editor, including a brand-new record: it opens
        // readable, with the empty Family Overview module carrying its own
        // Pending pill and Edit action.
        { id: 'create-package-family', target: 'drawer', mode: 'view', drawerTemplateKey: 'package-family' },
        // Registering a Tier system uses the binding's own `tier` drawer at its
        // registration address — the same mature composition, addressed before
        // any instance exists. It needs no drawer key of its own.
        { id: 'register-tier', target: 'drawer', mode: 'edit' },
        // The lower-deck Settings cards open the Package-owned Rate Sheet drawer
        // from this same surface. Its own drawer key overrides the binding's
        // `tier`, so no second body surface renders beneath the workspace.
        //
        // Both launchers open that drawer READABLE, like every other module
        // surface: the Rate Sheets module states the pool, carries its own
        // Pending pill, and its Edit opens the authoring editor where `New Rate
        // Sheet` and the per-sheet `Create Group` already live. Settings keeps a
        // separate intent id because it names a different launcher, not a
        // different entry state. Groups have no launcher of their own: a group is
        // stored inside `rate_sheets[].groups[]`, so the sheet that holds it is
        // the only place it can be authored.
        { id: 'rate-sheet', target: 'drawer', mode: 'view', drawerTemplateKey: 'rate-sheet' },
        { id: 'create-rate-sheet', target: 'drawer', mode: 'view', drawerTemplateKey: 'rate-sheet' },
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
