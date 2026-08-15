// Tier System shell schema — presentation description only.
//
// One shared manifest for both the pending (not yet created) and persisted
// states of a Tier System. Overview carries the record's own fields: title,
// description, and the Package Family it may be given to — read as a separate
// assignment rather than a field, because that is what it is: the instance
// schema stores no Family, the `tier_assignments[]` ledger does. Rate Sheet
// Access is instance-level configuration and reads an honest "not available
// yet" state before the Tier System has been published.

import { tierSystemOverviewModule, tierRateSheetAccessModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { ItemCollectionValue, TextValue } from '@/drawer-kit/schema/elements/library';
import type { PackageFamilyListItem } from '../../../types';
import { TierSystemOverviewEditor } from '../../editors/TierSystemOverviewEditor';
import type { TierSystemOverviewDraftFields } from '../../editors/TierSystemOverviewEditor';
import { TierRateSheetAccessEditor } from '../../editors/TierRateSheetAccessEditor';
import type {
  TierRateSheetAccessDraft,
  TierRateSheetAccessProjection,
} from '../../../surface/tierInstance/tierRateSheetAccessModel';

const NOT_SET = 'Not set';

export interface TierSystemOverviewShellData {
  title:       string;
  description: string;
  familyLabel: string | null;
  /** Present only once the backend has minted it; never a placeholder id. */
  reference:   string | null;
  platformId:  string | null;
  platformIdFallback: string;
}

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierSystemOverviewShell: ShellSchema<TierSystemOverviewShellData> = {
  archetype: 'overview',
  dna: tierSystemOverviewModule,
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
      id: 'reference', element: 'text', label: 'Tier system ID',
      bind: (data): TextValue => ({
        value: data.reference ?? '',
        fallback: 'Minted on Publish',
      }),
    },
    {
      id: 'platform-id', element: 'text', label: 'Platform ID',
      bind: (data): TextValue => ({
        value: data.platformId ?? '',
        fallback: data.platformIdFallback,
      }),
    },
  ],
  footer: { actions: ['edit'] },
  actions: OVERVIEW_ACTIONS,
  editor: {
    render: (session) => (
      <TierSystemOverviewEditor
        draft={session.draft as TierSystemOverviewDraftFields}
        onChange={(patch) => session.patch?.(patch)}
        selectable={(session.extras?.selectable ?? []) as PackageFamilyListItem[]}
      />
    ),
  },
};

export interface TierRateSheetAccessShellData {
  selectedNames: string[];
  selectedCount: number;
}

const ACCESS_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierRateSheetAccessShell: ShellSchema<TierRateSheetAccessShellData> = {
  archetype: 'overview',
  dna: tierRateSheetAccessModule,
  header: {
    title: 'Included Rate Sheets',
    subtitle: 'Manage rate sheet access.',
    icon: 'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview tier',
  },
  content: [
    {
      id: 'name', element: 'item-collection',
      bind: (data): ItemCollectionValue => ({
        items: data.selectedNames.map((name, index) => ({ id: `${index}-${name}`, label: name })),
        empty: { title: 'Edit and add ratesheet to this tier system.', copy: '' },
      }),
    },
    {
      id: 'selected-count', element: 'text', label: 'Selected ratesheets',
      bind: (data): TextValue => ({ value: String(data.selectedCount) }),
    },
  ],
  footer: { actions: ['edit'] },
  actions: ACCESS_ACTIONS,
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
