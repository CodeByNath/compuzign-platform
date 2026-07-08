// Category shell bindings (Schema architecture S6).
//
// Per-module configuration of the overview archetype for the Category
// station: the owned Category Overview shell and the Assigned Services
// summary gateway (D4 — the Package Summary pattern). Everything here is
// presentation; behaviour arrives at render time through ShellBinding,
// assembled by the Category drawer step from useCategoryStation.
//
// The shared serviceOverviewShell is NOT re-declared here: the Category
// Services collection surface (v1.2) resolves it through the category
// manifest's `shells` record under the `service` key.

import type { CategoryOverviewDraft } from '@/api/types/admin';
import {
  categoryOverviewModule,
  categoryServicesModule,
} from '@/components/admin/utils/moduleNotifications';
import { CategoryOverviewEditor } from '../../../editors/CategoryOverviewEditor';
import type { ShellActionSchema, ShellSchema } from '../../types';
import type { MetricsValue, RichTextValue, TextValue } from '../../elements/library';

// The canonical owning-workspace footer pair, exactly as the service/tier/
// promotion bindings declare it.
const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
  view: { id: 'view', label: 'View', intent: 'secondary' },
};

const DETAILS_FOOTER = { actions: ['discard-draft', 'edit'] };

// ── Category Overview ─────────────────────────────────────────────────────────
// Presentation projection delivered by the drawer step: name/description are
// draft-preferred (the station projection is server-merged); slug is settled
// display only (immutable, D5 — read-only here, absent from the editor).

export interface CategoryOverviewShellData {
  name:        string;
  slug:        string;
  description: string;
}

export const categoryOverviewShell: ShellSchema<CategoryOverviewShellData> = {
  archetype: 'overview',
  dna:       categoryOverviewModule,
  header: {
    title:       'Category Overview',
    subtitle:    'General information about the category.',
    icon:        'category',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview',
  },
  content: [
    {
      id: 'name', element: 'text', label: 'Name',
      bind: (d): TextValue => ({ value: d.name, fallback: 'New Category' }),
    },
    {
      id: 'slug', element: 'text', label: 'Slug',
      bind: (d): TextValue => ({ value: d.slug }),
    },
    {
      id: 'description', element: 'rich-text', label: 'Description',
      bind: (d): RichTextValue => ({
        value: d.description,
        placeholder: d.name
          ? `Enter a description for ${d.name}.`
          : 'Enter a description for the category.',
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <CategoryOverviewEditor
        draft={s.draft as CategoryOverviewDraft}
        onChange={(patch) => s.patch?.(patch)}
      />
    ),
  },
};

// ── Services (relation summary, D4) ───────────────────────────────────────────
// The category's assigned services at a glance — the servicePackageSummaryShell
// pattern (metrics element). It heads the Connections tab, above the Services
// collection (the Collection placement, mapped by the drawer step into the same
// tab's `trailing` slot). No footer: the collection renders inline in the same
// canonical drawer, so there is nothing to transit to — each service card owns
// its own `view` into the real Service drawer. Read-only in v1: assignment
// stays on the service side (the service is the anchor; the category emphasises
// the relationship).

export interface CategoryServicesShellData {
  headline: string;   // e.g. '3 services'
  copy:     string;   // e.g. '2 active · 1 inactive'
}

export const categoryServicesShell: ShellSchema<CategoryServicesShellData> = {
  archetype: 'overview',
  dna:       categoryServicesModule,
  header: {
    title:    'Services',
    subtitle: 'Services assigned to this category.',
    icon:     'category',
  },
  content: [
    {
      id: 'summary', element: 'metrics',
      bind: (d): MetricsValue => ({ headline: d.headline, copy: d.copy }),
    },
  ],
  footer:  { actions: [] },
  actions: {},
};
