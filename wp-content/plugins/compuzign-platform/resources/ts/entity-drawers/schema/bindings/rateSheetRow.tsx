// Rate Sheet row shell bindings — the four read modules of the row drawer.
//
// Details tab: Row Overview (what the row prices) and Commercial Terms (the
// one editable module). Connections tab: Source & Provenance (where the row's
// content comes from) and Connection Status (how the sheet, sources, and Tiers
// meet on this row). Every field is an authoritative station fact; identity
// references appear once, as a restrained labelled field (the same convention
// as the Package Family drawer's Group ID field).

import {
  rateSheetRowModule,
  rateSheetRowCommercialModule,
  rateSheetRowConnectionModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue, ItemCollectionValue } from '@/drawer-kit/schema/elements/library';
import { RateSheetRowEditor } from '../../editors/RateSheetRowEditor';
import type { RateSheetRowDraft } from '../../rate-sheet-row/RateSheetRowDrawerContent';

export interface RateSheetRowOverviewShellData {
  optionLabel: string;
  sourceTypeLabel: string;
  serviceTitle: string | null;
  groupLabel: string;
}

export const rateSheetRowOverviewShell: ShellSchema<RateSheetRowOverviewShellData> = {
  archetype: 'overview',
  dna: rateSheetRowModule,
  header: {
    title: 'Row Overview',
    subtitle: 'What this Rate Sheet row prices.',
    icon: 'package',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'option', element: 'text', label: 'Supplied content', bind: (data): TextValue => ({ value: data.optionLabel }) },
    { id: 'source-type', element: 'text', label: 'Source type', bind: (data): TextValue => ({ value: data.sourceTypeLabel }) },
    { id: 'service', element: 'text', label: 'Supplying Service', bind: (data): TextValue => ({ value: data.serviceTitle ?? '', fallback: 'Unknown Service' }) },
    { id: 'group', element: 'text', label: 'Rate Sheet group', bind: (data): TextValue => ({ value: data.groupLabel }) },
  ],
  footer: { actions: [] },
  actions: {},
};

export interface RateSheetRowCommercialShellData {
  unitPriceLabel: string;
  per: string;
  quantityLabel: string;
  groupLabel: string;
}

export const rateSheetRowCommercialShell: ShellSchema<RateSheetRowCommercialShellData> = {
  archetype: 'overview',
  dna: rateSheetRowCommercialModule,
  header: {
    title: 'Commercial Terms',
    subtitle: 'The pricing this row contributes to Tier totals.',
    icon: 'package',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'unit-price', element: 'text', label: 'Unit price', bind: (data): TextValue => ({ value: data.unitPriceLabel }) },
    { id: 'per', element: 'text', label: 'Per', bind: (data): TextValue => ({ value: data.per }) },
    { id: 'quantity', element: 'text', label: 'Quantity', bind: (data): TextValue => ({ value: data.quantityLabel }) },
    { id: 'group', element: 'text', label: 'Group', bind: (data): TextValue => ({ value: data.groupLabel }) },
  ],
  footer: { actions: ['edit'] },
  actions: {
    edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
  },
  editor: {
    render: (session) => (
      <RateSheetRowEditor
        draft={session.draft as RateSheetRowDraft}
        onChange={(patch) => session.patch?.(patch)}
        groups={(session.extras?.groups ?? []) as { id: string; label: string }[]}
        units={(session.extras?.units ?? []) as string[]}
      />
    ),
  },
};

export interface RateSheetRowProvenanceShellData {
  optionLabel: string;
  serviceTitle: string | null;
  categoriesLabel: string;
  referenceLabel: string;
}

export const rateSheetRowProvenanceShell: ShellSchema<RateSheetRowProvenanceShellData> = {
  archetype: 'overview',
  dna: rateSheetRowModule,
  header: {
    title: 'Source & Provenance',
    subtitle: 'Where this row’s supplied content comes from. Resolved live, never editable here.',
    icon: 'package',
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'option', element: 'text', label: 'Source option', bind: (data): TextValue => ({ value: data.optionLabel }) },
    { id: 'service', element: 'text', label: 'Service', bind: (data): TextValue => ({ value: data.serviceTitle ?? '', fallback: 'Unknown Service' }) },
    { id: 'categories', element: 'text', label: 'Category provenance', bind: (data): TextValue => ({ value: data.categoriesLabel, fallback: 'No categories' }) },
    { id: 'reference', element: 'text', label: 'Identity references', bind: (data): TextValue => ({ value: data.referenceLabel }) },
  ],
  footer: { actions: [] },
  actions: {},
};

export interface RateSheetRowConnectionShellData {
  resolutionLabel: string;
  availabilityLabel: string;
  tierSelections: { id: string; label: string }[];
}

export const rateSheetRowConnectionShell: ShellSchema<RateSheetRowConnectionShellData> = {
  archetype: 'overview',
  dna: rateSheetRowConnectionModule,
  header: {
    title: 'Connection Status',
    subtitle: 'How the sheet, its source, and the Tiers meet on this row.',
    icon: 'package',
    count: (data) => data.tierSelections.length || null,
    scopeClass: 'drawerOverview',
  },
  content: [
    { id: 'resolution', element: 'text', label: 'Source connection', bind: (data): TextValue => ({ value: data.resolutionLabel }) },
    { id: 'availability', element: 'text', label: 'Availability', bind: (data): TextValue => ({ value: data.availabilityLabel }) },
    {
      id: 'tiers', element: 'item-collection', label: 'Selected by Tiers',
      bind: (data): ItemCollectionValue => ({
        items: data.tierSelections,
        empty: { title: 'No Tier selections', copy: 'No Tier currently selects this row.' },
      }),
    },
  ],
  footer: { actions: [] },
  actions: {},
};
