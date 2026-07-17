// Category Group shell bindings (Category Group audit, Option B).
//
// Per-module configuration of the overview archetype for the Service Category Group
// station — a structural clone of shells/bindings/category.tsx, one level up:
// the owned Service Category Group Overview shell and the Assigned Categories summary
// gateway (same D4 Package-Summary-derived pattern). Everything here is
// presentation; behaviour arrives at render time through ShellBinding,
// assembled by the Service Category Group drawer step from useServiceCategoryGroupStation.
//
// The shared categoryOverviewShell is NOT re-declared here: the Service Category Group
// Categories collection surface resolves it through the group manifest's
// `shells` record under the `category` key (S4 related-stations rule), reusing
// the exact same shell object Category itself uses for its own Details tab —
// no new card, no new content elements added to it.

import type { ServiceCategoryGroupOverviewDraft } from '@/api/types/admin';
import { serviceCategoryGroupOverviewModule } from '@/components/admin/utils/moduleNotifications';
import { ServiceCategoryGroupOverviewEditor } from '../../../editors/ServiceCategoryGroupOverviewEditor';
import type { ShellActionSchema, ShellSchema } from '../../types';
import type { RichTextValue, TextValue } from '../../elements/library';

// The canonical owning-workspace footer pair, exactly as the service/tier/
// promotion/category bindings declare it.
const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
  view: { id: 'view', label: 'View', intent: 'secondary' },
};

const DETAILS_FOOTER = { actions: ['discard-draft', 'edit'] };

// ── Service Category Group Overview ───────────────────────────────────────────────────
// Presentation projection delivered by the drawer step: name/description are
// draft-preferred (the station projection is server-merged); slug is settled
// display only (immutable, same D5 rationale as Category — read-only here,
// absent from the editor).

export interface ServiceCategoryGroupOverviewShellData {
  name:        string;
  slug:        string;
  description: string;
}

export const serviceCategoryGroupOverviewShell: ShellSchema<ServiceCategoryGroupOverviewShellData> = {
  archetype: 'overview',
  dna:       serviceCategoryGroupOverviewModule,
  header: {
    title:       'Service Category Group Overview',
    subtitle:    'General information about the category group.',
    icon:        'category',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview',
  },
  content: [
    {
      id: 'name', element: 'text', label: 'Name',
      bind: (d): TextValue => ({ value: d.name, fallback: 'New Service Category Group' }),
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
          : 'Enter a description for the category group.',
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <ServiceCategoryGroupOverviewEditor
        draft={s.draft as ServiceCategoryGroupOverviewDraft}
        onChange={(patch) => s.patch?.(patch)}
      />
    ),
  },
};

// ── Categories (relation summary gateway, D4 precedent) ───────────────────────
// one level up: a metrics element + a `view` footer. Placed in the Connections
// tab; its View transits to the Service Category Group Categories collection surface,
// which repeats the existing categoryOverviewShell once per child category.
// Read-only in v1: group assignment stays on the category side (Category
// chooses its group, the same relational-ecosystem precedent as Service
// choosing its Category).
