// Customer Selection Rules shell — standalone entity, not a Tier module.
//
// Admin-authored bounds on which of the composable occupant's own already-
// published Rate Sheet inclusions a future customer may choose, at what
// quantity, see docs/code-map/tier-composable-occupant-customer-ux.md and
// PackageSchema::sanitizeCustomerPolicy(). This shell belongs to its OWN
// TIER_CUSTOMER_POLICY_ENTITY (drawer/schema/entities/tierCustomerPolicy.ts),
// launched from its own drawer key — never placed on TIER_ENTITY. An earlier
// round wired this as a fifth Tier module and the auditor rejected it as an
// architectural mismatch: the composable occupant must remain commercially
// identical to a normal Tier occupant, published through the unchanged
// normal occupant editor; Customer Selection Rules are an external
// controller over that published occupant, never product-definition
// machinery inside the shared Tier drawer. See
// docs/code-map/tier-composable-occupant-admin-customer-policy.md.

import type { CustomerPolicy } from '@/api/types/cost-builder';
import type { TierResolvedRateSheetSelection } from '../../../types';
import { tierCustomerPolicyModule } from '@/drawer-kit/utils/moduleNotifications';
import { CustomerPolicyEditor } from '../../editors/CustomerPolicyEditor';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';

export interface TierCustomerPolicyShellData {
  policy: CustomerPolicy | null;
}

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard pending changes', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierCustomerPolicyOverviewShell: ShellSchema<TierCustomerPolicyShellData> = {
  archetype: 'overview',
  dna:       tierCustomerPolicyModule,
  header: {
    title:       'Customer Selection Rules',
    subtitle:    'What a customer may Add/Remove and at what quantity on Build Your Own.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview',
  },
  content: [
    {
      id: 'summary', element: 'text',
      bind: (d): TextValue => {
        const items = d.policy?.items ?? [];
        if (items.length === 0) return { value: 'Not configured — every inclusion stays not offered.' };
        const required = items.filter((item) => item.mode === 'required').length;
        const optional = items.filter((item) => item.mode === 'optional').length;
        return { value: `${required} always included · ${optional} customer Add/Remove` };
      },
    },
  ],
  footer:  { actions: ['discard-draft', 'edit'] },
  actions: OVERVIEW_ACTIONS,
  editor: {
    render: (s) => (
      <CustomerPolicyEditor
        draft={s.draft as CustomerPolicy | null}
        onChange={(next) => s.replace(next)}
        rateSheetCatalogue={(s.extras?.rateSheetCatalogue ?? []) as TierResolvedRateSheetSelection[]}
      />
    ),
  },
};
