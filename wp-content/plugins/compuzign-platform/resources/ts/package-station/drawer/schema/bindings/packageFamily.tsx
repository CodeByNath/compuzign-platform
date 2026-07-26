import type { PackageFamilyOverviewDraft } from '../../../usePackageFamilyStation';
import {
  packageFamilyOverviewModule,
  packageFamilyCapabilitiesModule,
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
    {
      // The stored id, or an honest statement that none exists yet — this shell
      // is also the surface a Family is created through, where PHP has not
      // minted one.
      id: 'group-id', element: 'text', label: 'Group ID',
      bind: (data): TextValue => ({ value: data.groupId, fallback: 'Minted when saved' }),
    },
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

export interface PackageFamilyCapabilitiesShellData {
  tier: { enabled: false }
    | { enabled: true; instanceId: string; instanceTitle: string; readiness: string };
}

const CAPABILITY_ACTIONS: Record<string, ShellActionSchema> = {
  'add-tier-capability': {
    id: 'add-tier-capability', label: 'Add Tier capability', intent: 'primary',
    when: (binding) => !(binding.data as PackageFamilyCapabilitiesShellData).tier.enabled,
  },
  'open-tier-tool': {
    id: 'open-tier-tool', label: 'Manage Tier system', intent: 'primary',
    when: (binding) => (binding.data as PackageFamilyCapabilitiesShellData).tier.enabled,
  },
  'remove-tier-capability': {
    id: 'remove-tier-capability', label: 'Remove Tier capability', intent: 'danger',
    when: (binding) => (binding.data as PackageFamilyCapabilitiesShellData).tier.enabled,
  },
};

export const packageFamilyCapabilitiesShell: ShellSchema<PackageFamilyCapabilitiesShellData> = {
  archetype: 'overview',
  dna: packageFamilyCapabilitiesModule,
  header: {
    title: 'Capabilities',
    subtitle: 'Optional Package capabilities used by this Family.',
    icon: 'package',
    scopeClass: 'drawerOverview',
  },
  content: [
    {
      id: 'tier-capability', element: 'text', label: 'Tier capability',
      bind: (data): TextValue => ({ value: data.tier.enabled ? 'Enabled' : 'Not enabled' }),
    },
    {
      id: 'tier-instance', element: 'text', label: 'Tier instance',
      when: (data) => data.tier.enabled,
      bind: (data): TextValue => ({ value: data.tier.enabled ? data.tier.instanceTitle : '' }),
    },
    {
      id: 'tier-readiness', element: 'text', label: 'Readiness',
      when: (data) => data.tier.enabled,
      bind: (data): TextValue => ({ value: data.tier.enabled ? data.tier.readiness : '' }),
    },
  ],
  footer: { actions: ['add-tier-capability', 'open-tier-tool', 'remove-tier-capability'] },
  actions: CAPABILITY_ACTIONS,
};
