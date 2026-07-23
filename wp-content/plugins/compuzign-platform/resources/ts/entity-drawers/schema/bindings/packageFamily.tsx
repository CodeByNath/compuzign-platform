import type { PackageFamilyOverviewDraft } from '@/package-station';
import {
  packageFamilyOverviewModule,
  packageFamilyRelationshipsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import { PackageFamilyOverviewEditor } from '../../editors/PackageFamilyOverviewEditor';

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (binding) => binding.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export interface PackageFamilyOverviewShellData {
  groupId: string;
  name: string;
  description: string;
}

export const packageFamilyOverviewShell: ShellSchema<PackageFamilyOverviewShellData> = {
  archetype: 'overview',
  dna: packageFamilyOverviewModule,
  header: {
    title: 'Family Overview',
    subtitle: 'General information about this Package Family.',
    icon: 'package',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'name', element: 'text', label: 'Name', bind: (data): TextValue => ({ value: data.name, fallback: 'New Package Family' }) },
    { id: 'group-id', element: 'text', label: 'Group ID', bind: (data): TextValue => ({ value: data.groupId }) },
    {
      id: 'description', element: 'rich-text', label: 'Description',
      bind: (data) => ({
        value: data.description,
        placeholder: data.name
          ? `Enter a description for ${data.name}.`
          : 'Enter a description for this Package Family.',
      }),
    },
  ],
  footer: { actions: ['discard-draft', 'edit'] },
  actions: OVERVIEW_ACTIONS,
  editor: {
    render: (session) => (
      <PackageFamilyOverviewEditor
        draft={session.draft as PackageFamilyOverviewDraft}
        onChange={(patch) => session.patch?.(patch)}
      />
    ),
  },
};

export interface PackageFamilyRelationshipsShellData {
  services: number;
  rateSheetRows: number;
  tierSelections: number;
}

export const packageFamilyRelationshipsShell: ShellSchema<PackageFamilyRelationshipsShellData> = {
  archetype: 'overview',
  dna: packageFamilyRelationshipsModule,
  header: {
    title: 'Connected Records',
    subtitle: 'Live Package Station relationships using this Family.',
    icon: 'package',
    count: (data) => data.services + data.rateSheetRows + data.tierSelections,
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'services', element: 'text', label: 'Services', bind: (data): TextValue => ({ value: String(data.services) }) },
    { id: 'rate-sheet-rows', element: 'text', label: 'Rate Sheet rows', bind: (data): TextValue => ({ value: String(data.rateSheetRows) }) },
    { id: 'tier-selections', element: 'text', label: 'Tier selections', bind: (data): TextValue => ({ value: String(data.tierSelections) }) },
  ],
  footer: { actions: [] },
  actions: {},
};
