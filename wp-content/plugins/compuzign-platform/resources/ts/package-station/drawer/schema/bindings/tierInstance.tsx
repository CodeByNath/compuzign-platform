// Tier-instance shell bindings. Rate Sheet access belongs to the whole Tier
// system, not to any one fixed-slot occupant.

import type { ShellSchema, ShellActionSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import { tierRateSheetAccessModule } from '@/drawer-kit/utils/moduleNotifications';
import { TierRateSheetAccessEditor } from '../../editors/TierRateSheetAccessEditor';
import type {
  TierRateSheetAccessDraft,
  TierRateSheetAccessProjection,
} from '../../../surface/tierInstance/tierRateSheetAccessModel';

export interface TierRateSheetAccessShellData {
  mode: string;
  availability: string;
  activeCount: number;
  unresolvedCount: number;
}

const ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierRateSheetAccessShell: ShellSchema<TierRateSheetAccessShellData> = {
  archetype: 'overview',
  dna: tierRateSheetAccessModule,
  header: {
    title: 'Rate Sheet Access',
    subtitle: 'Rate Sheets this Tier system may make available to its Tier slots.',
    icon: 'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview tier',
  },
  content: [
    {
      id: 'mode', element: 'text', label: 'Access Mode',
      bind: (data): TextValue => ({ value: data.mode }),
    },
    {
      id: 'availability', element: 'text', label: 'Availability',
      bind: (data): TextValue => ({ value: data.availability }),
    },
    {
      id: 'active-count', element: 'text', label: 'Active Rate Sheets',
      bind: (data): TextValue => ({ value: String(data.activeCount) }),
    },
    {
      id: 'unresolved-count', element: 'text', label: 'Unresolved References',
      when: (data) => data.unresolvedCount > 0,
      bind: (data): TextValue => ({ value: String(data.unresolvedCount) }),
    },
  ],
  footer: { actions: ['edit'] },
  actions: ACTIONS,
  editor: {
    render: (session) => (
      <TierRateSheetAccessEditor
        draft={session.draft as TierRateSheetAccessDraft}
        projection={session.extras?.projection as TierRateSheetAccessProjection}
        onChange={(next) => session.replace(next)}
      />
    ),
  },
};
