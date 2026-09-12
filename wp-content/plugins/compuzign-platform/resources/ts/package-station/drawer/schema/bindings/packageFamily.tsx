import type { PackageFamilyOverviewDraft } from '../../../usePackageFamilyStation';
import {
  packageFamilyOverviewModule,
  packageFamilyCapabilitiesModule,
  packageFamilyRelationshipsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import { PackageFamilyOverviewEditor } from '../../editors/PackageFamilyOverviewEditor';
import { buildFamilyCompositionMetrics } from '../../../surface/packageTierWorkspace/familySummary';
import type { TierGroupComposition } from '../../../types';

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (binding) => binding.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export interface PackageFamilyOverviewShellData {
  groupId: string;
  platformId: string;
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
      // The Platform ID is the only identity this read surface shows. Native
      // `groupId` stays in the data — the mutation address, and what tells
      // "not assigned yet" apart from "this Family does not exist yet" below —
      // but an admin never needs to read it.
      id: 'platform-id', element: 'text', label: 'Platform ID',
      bind: (data): TextValue => ({
        value: data.platformId,
        fallback: data.groupId ? 'Not assigned' : 'Assigned after Overview save',
      }),
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
  // What this Family's assigned Tier Group composes — the SAME canonical
  // four counts the Tier Workspace summary card shows (buildFamilyCompositionMetrics),
  // never a second, differently-derived count. Null when unassigned/unresolved.
  composition: TierGroupComposition | null;
}

export const packageFamilyRelationshipsShell: ShellSchema<PackageFamilyRelationshipsShellData> = {
  archetype: 'overview',
  dna: packageFamilyRelationshipsModule,
  header: {
    title: 'Connected Records',
    subtitle: "What this Family's assigned Tier Group composes.",
    icon: 'package',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'tiers', element: 'text', label: 'Tiers', bind: (data): TextValue => ({ value: String(buildFamilyCompositionMetrics(data.composition).find((metric) => metric.id === 'tiers')!.value) }) },
    { id: 'service-categories', element: 'text', label: 'Service Categories', bind: (data): TextValue => ({ value: String(buildFamilyCompositionMetrics(data.composition).find((metric) => metric.id === 'service-categories')!.value) }) },
    { id: 'services', element: 'text', label: 'Services', bind: (data): TextValue => ({ value: String(buildFamilyCompositionMetrics(data.composition).find((metric) => metric.id === 'services')!.value) }) },
    { id: 'inclusions', element: 'text', label: 'Inclusions', bind: (data): TextValue => ({ value: String(buildFamilyCompositionMetrics(data.composition).find((metric) => metric.id === 'inclusions')!.value) }) },
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
