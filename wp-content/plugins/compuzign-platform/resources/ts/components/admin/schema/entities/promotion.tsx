import type { PromotionOverviewDraft, PromotionTier } from '@/api/types/admin';
import { promotionOverviewModule } from '@/components/admin/utils/moduleNotifications';
import { PromotionOverviewEditor } from '../../editors/PromotionOverviewEditor';
import type { EntitySchema, ShellSchema } from '../types';
import type { TextValue } from '../elements/library';
import { serviceOverviewShell } from '../shells/bindings/service';

export interface PromotionOverviewShellData {
  name: string;
  tier: string;
  pricing: string;
  headline: string;
  description: string;
  campaign: string;
  badge: string;
}

export const promotionOverviewShell: ShellSchema<PromotionOverviewShellData> = {
  archetype: 'overview',
  dna: promotionOverviewModule,
  header: {
    title: 'Promotion Overview',
    subtitle: 'Pricing and presentation for this promotion.',
    icon: 'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview promotion',
  },
  content: [
    { id: 'name', element: 'text', label: 'Name', bind: (d): TextValue => ({ value: d.name, fallback: 'Promotion' }) },
    { id: 'tier', element: 'text', label: 'Tier', bind: (d): TextValue => ({ value: d.tier }) },
    { id: 'pricing', element: 'text', label: 'Pricing', bind: (d): TextValue => ({ value: d.pricing }) },
    { id: 'headline', element: 'text', label: 'Headline', bind: (d): TextValue => ({ value: d.headline || 'Not configured' }) },
    { id: 'description', element: 'text', label: 'Description', bind: (d): TextValue => ({ value: d.description || 'Not configured' }) },
    { id: 'campaign', element: 'text', label: 'Campaign', bind: (d): TextValue => ({ value: d.campaign || 'Not configured' }) },
    { id: 'badge', element: 'text', label: 'Badge', bind: (d): TextValue => ({ value: d.badge || 'Not configured' }) },
  ],
  footer: { actions: ['edit'] },
  actions: { edit: { id: 'edit', label: 'Edit', intent: 'secondary' } },
  editor: {
    render: (session) => <PromotionOverviewEditor draft={session.draft as PromotionOverviewDraft} onChange={(value) => session.patch?.(value)} />,
  },
};

export const PROMOTION_ENTITY: EntitySchema = {
  id: 'promotion',
  label: { singular: 'Promotion', plural: 'Promotions' },
  identity: { idOf: (d: PromotionTier) => d.id, titleOf: (d: PromotionTier) => d.name },
  lifecycle: { participation: 'travelling-instance', statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'] },
  ownership: { parent: 'service', label: 'Service' },
  shells: { overview: promotionOverviewShell, service: serviceOverviewShell },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [{ module: 'service', mode: 'connections' }],
    },
  },
};
