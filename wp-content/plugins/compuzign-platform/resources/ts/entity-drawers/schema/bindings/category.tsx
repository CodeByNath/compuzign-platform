import type { CategoryOverviewDraft } from '@/api/types/admin';
import {
  categoryOverviewModule,
  categoryServicesModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { CategoryOverviewEditor } from '../../editors/CategoryOverviewEditor';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type {
  ItemCollectionValue,
  TextValue,
} from '@/drawer-kit/schema/elements/library';

const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (binding) => binding.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export interface CategoryOverviewShellData {
  name: string;
  /** Permanent `CZC`, read-only. Blank only while the Category is still the
   *  unsaved pending draft — the reservation happens at create. */
  platformId: string;
  description: string;
}

export const categoryOverviewShell: ShellSchema<CategoryOverviewShellData> = {
  archetype: 'overview',
  dna: categoryOverviewModule,
  header: {
    title: 'Category Overview',
    subtitle: 'General information about the Category.',
    icon: 'category',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview',
  },
  content: [
    {
      id: 'name', element: 'text', label: 'Name',
      bind: (data): TextValue => ({ value: data.name, fallback: 'New Category' }),
    },
    {
      // Read-only permanent identity, directly under the name it belongs to —
      // the same pairing Service and Package Family Overview read with.
      id: 'platform-id', element: 'text', label: 'Platform ID',
      bind: (data): TextValue => ({ value: data.platformId, fallback: 'Assigned after Overview save' }),
    },
    {
      id: 'description', element: 'rich-text', label: 'Description',
      bind: (data) => ({
        value: data.description,
        placeholder: data.name
          ? `Enter a description for ${data.name}.`
          : 'Enter a description for the Category.',
      }),
    },
  ],
  footer: { actions: ['discard-draft', 'edit'] },
  actions: DETAILS_ACTIONS,
  editor: {
    render: (session) => (
      <CategoryOverviewEditor
        draft={session.draft as CategoryOverviewDraft}
        onChange={(patch) => session.patch?.(patch)}
      />
    ),
  },
};

export interface CategoryServicesShellData {
  services: Array<{ id: number; title: string }>;
  total: number;
  active: number;
  disabled: number;
}

export const categoryServicesShell: ShellSchema<CategoryServicesShellData> = {
  archetype: 'overview',
  dna: categoryServicesModule,
  header: {
    title: 'Assigned Services',
    subtitle: 'Services currently related to this Category.',
    icon: 'package',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'total', element: 'text', label: 'Total', bind: (data): TextValue => ({ value: String(data.total) }) },
    { id: 'active', element: 'text', label: 'Active', bind: (data): TextValue => ({ value: String(data.active) }) },
    { id: 'disabled', element: 'text', label: 'Disabled', bind: (data): TextValue => ({ value: String(data.disabled) }) },
    {
      id: 'services', element: 'item-collection', label: 'Services',
      bind: (data): ItemCollectionValue => ({
        items: data.services.map((service) => ({ id: String(service.id), label: service.title })),
        empty: {
          title: 'No assigned Services',
          copy: 'Assign this Category from a Service Overview.',
        },
      }),
    },
  ],
  footer: { actions: [] },
  actions: {},
};
