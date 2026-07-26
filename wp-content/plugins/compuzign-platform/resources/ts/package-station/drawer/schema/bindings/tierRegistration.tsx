// Tier system registration shell schema — presentation description only.
//
// One overview module carrying the record's OWN fields: title, description, and
// the Package Family it will be given to. The Family reads as a separate
// assignment rather than a field, because that is what it is — the instance
// schema stores no Family, the `tier_assignments[]` ledger does.

import { tierRegistrationModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import type { PackageFamilyListItem } from '../../../types';
import { TierRegistrationEditor } from '../../editors/TierRegistrationEditor';
import type { TierRegistrationDraftFields } from '../../editors/TierRegistrationEditor';

const NOT_SET = 'Not set';

export interface TierRegistrationShellData {
  title:       string;
  description: string;
  familyLabel: string | null;
  reference:   string | null;
  slots:       number;
}

const REGISTRATION_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierRegistrationOverviewShell: ShellSchema<TierRegistrationShellData> = {
  archetype: 'overview',
  dna: tierRegistrationModule,
  header: {
    title: 'Tier System',
    subtitle: 'Identity and Package Family for this Tier system.',
    icon: 'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview',
  },
  content: [
    {
      id: 'title', element: 'text', label: 'Title',
      bind: (data): TextValue => ({ value: data.title, fallback: NOT_SET }),
    },
    {
      id: 'description', element: 'text', label: 'Description',
      bind: (data): TextValue => ({ value: data.description, fallback: NOT_SET }),
    },
    {
      id: 'family', element: 'text', label: 'Package Family',
      bind: (data): TextValue => ({
        value: data.familyLabel ?? '',
        fallback: 'Standalone — no Family',
      }),
    },
    {
      // Present only once the backend has minted it; never a placeholder id.
      id: 'reference', element: 'text', label: 'Tier system ID',
      bind: (data): TextValue => ({
        value: data.reference ?? '',
        fallback: 'Minted when registered',
      }),
    },
    {
      id: 'slots', element: 'text', label: 'Fixed slots',
      bind: (data): TextValue => ({
        value: data.reference === null ? '' : `${data.slots} empty`,
        fallback: 'Created when registered',
      }),
    },
  ],
  footer: { actions: ['edit'] },
  actions: REGISTRATION_ACTIONS,
  editor: {
    render: (session) => (
      <TierRegistrationEditor
        draft={session.draft as TierRegistrationDraftFields}
        onChange={(patch) => session.patch?.(patch)}
        selectable={(session.extras?.selectable ?? []) as PackageFamilyListItem[]}
      />
    ),
  },
};
