// Service shell bindings (Schema architecture S2).
//
// Per-module configuration of the two shell archetypes for the Service
// station: Overview = overview archetype; Included Features and Common
// Questions = child archetype. Everything here is presentation — data
// shapes, copy, footer intent, editor binding. Behaviour (status, notes,
// handlers) arrives at render time through ShellBinding, assembled by the
// Service drawer step from useServiceStation.
//
// The `dna:` fields reference the living modules in
// utils/moduleNotifications.ts — composition, never inheritance; those
// definitions are untouched by the schema layer.

import type { Category } from '@/api/types/cost-builder';
import {
  overviewModule,
  inclusionsModule,
  faqsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { ServiceOverviewEditor } from '../../editors/ServiceOverviewEditor';
import { ServiceInclusionsEditor } from '../../editors/ServiceInclusionsEditor';
import { ServiceFaqsEditor } from '../../editors/ServiceFaqsEditor';
import type { OverviewDraft, InclusionsDraft, FaqsDraft } from '@/admin-station/stations/service';
import { packageModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type {
  ItemCollectionValue,
  MetricsValue,
  QaCollectionValue,
  RelationSummaryValue,
  RichTextValue,
  TermValue,
  TextValue,
} from '@/drawer-kit/schema/elements/library';

// The canonical owning-workspace footer: Discard Draft (only while a module
// draft exists) then Edit. Shared by all three Service module shells.
// `view` serves the read-only viewpoints (the connections View-only footer is
// renderer-encoded; it resolves this action).
const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard Draft', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
  view: { id: 'view', label: 'View', intent: 'secondary' },
};

const DETAILS_FOOTER = { actions: ['discard-draft', 'edit'] };

// ── Service Overview ──────────────────────────────────────────────────────────
// Presentation projection delivered by the drawer step: display values are
// draft-preferred and already resolved (fallback chain + HTML decode).

export interface ServiceOverviewShellData {
  title:    string;
  category: string;   // resolved display name, incl. 'Not selected'
  content:  string;
  // Child-relation counts — supplied by relational placements (the tier/
  // promotion drawers' Connections tabs); absent in the owning workspace.
  includes?: { features: number; faqs: number };
}

export const serviceOverviewShell: ShellSchema<ServiceOverviewShellData> = {
  archetype: 'overview',
  dna:       overviewModule,
  header: {
    title:       'Service Overview',
    subtitle:    'General information about the service.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview service',
  },
  content: [
    // Short Description (excerpt) is intentionally excluded from the workflow
    // (mirrors the DNA's completeness rule).
    {
      id: 'title', element: 'text', label: 'Title',
      bind: (d): TextValue => ({ value: d.title, fallback: 'New Service' }),
    },
    {
      id: 'category', element: 'term', label: 'Category',
      bind: (d): TermValue => ({ value: d.category }),
    },
    {
      id: 'description', element: 'rich-text', label: 'Description',
      bind: (d): RichTextValue => ({
        value: d.content,
        placeholder: d.title
          ? `Enter a description for the ${d.title}.`
          : 'Enter a description for the service.',
      }),
    },
    {
      // Relational "Includes" line — renders only in the connections
      // viewpoint (relation-summary has no details renderer) and only when
      // the placement supplies the counts (data-driven presence).
      id: 'includes', element: 'relation-summary', label: 'Includes',
      when: (d) => d.includes != null,
      bind: (d): RelationSummaryValue => ({
        relations: [
          { count: d.includes?.features ?? 0, label: 'features' },
          { count: d.includes?.faqs ?? 0, label: 'common questions' },
        ],
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <ServiceOverviewEditor
        draft={s.draft as OverviewDraft}
        onChange={(patch) => s.patch?.(patch)}
        categories={(s.extras?.categories ?? []) as Category[]}
        catDescription={(s.extras?.catDescription ?? '') as string}
        onCatDescriptionChange={s.extras?.onCatDescriptionChange as (val: string) => void}
      />
    ),
  },
};

// ── Included Features ─────────────────────────────────────────────────────────

export interface ServiceInclusionsShellData {
  items:        Array<{ id: string; label: string }>;
  serviceTitle: string;   // parent identity, for the empty-state copy
}

export const serviceInclusionsShell: ShellSchema<ServiceInclusionsShellData> = {
  archetype: 'child',
  dna:       inclusionsModule,
  header: {
    title:       'Included Features',
    subtitle:    'Add and manage the features included in this service.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
  },
  content: [
    {
      id: 'features', element: 'item-collection',
      bind: (d): ItemCollectionValue => ({
        items: d.items,
        empty: {
          title: 'No features',
          copy: d.serviceTitle
            ? `Add features to the ${d.serviceTitle}.`
            : 'Add features to this service.',
        },
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <ServiceInclusionsEditor
        draft={s.draft as InclusionsDraft}
        onChange={(next) => s.replace(next)}
      />
    ),
  },
};

// ── Common Questions ──────────────────────────────────────────────────────────

export interface ServiceFaqsShellData {
  items:        Array<{ id: string; question: string; answer: string }>;
  serviceTitle: string;   // parent identity, for the empty-state copy
}

// ── Package Summary (Commercial group, summary viewpoint) ────────────────────
// The package station's primary module presented at a glance inside the
// Service drawer's Connections tab. Read-only from this placement: the footer
// routes into the Package station drawer via the step-supplied handler.

export interface ServicePackageSummaryShellData {
  headline: string;   // e.g. '2 tiers configured'
  copy:     string;   // availability / guidance line
}

export const servicePackageSummaryShell: ShellSchema<ServicePackageSummaryShellData> = {
  archetype: 'overview',
  dna:       packageModule,
  header: {
    title:    'Package Summary',
    subtitle: 'Pricing and tiers for this service.',
    icon:     'package',
  },
  content: [
    {
      id: 'summary', element: 'metrics',
      bind: (d): MetricsValue => ({ headline: d.headline, copy: d.copy }),
    },
  ],
  footer:  { actions: ['view'] },
  actions: {
    view: { id: 'view', label: 'View & Manage', intent: 'secondary' },
  },
};

export const serviceFaqsShell: ShellSchema<ServiceFaqsShellData> = {
  archetype: 'child',
  dna:       faqsModule,
  header: {
    title:       'Common Questions',
    subtitle:    'Add questions and answers for this service.',
    icon:        'faqs',
    iconVariant: 'drawerModule__icon--faqs',
    count:       (d) => d.items.length,
  },
  content: [
    {
      id: 'questions', element: 'qa-collection',
      bind: (d): QaCollectionValue => ({
        items: d.items,
        empty: {
          title: 'No questions added',
          copy: d.serviceTitle
            ? `Add common questions for the ${d.serviceTitle}.`
            : 'Add common questions for this service.',
        },
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <ServiceFaqsEditor
        draft={s.draft as FaqsDraft}
        onChange={(next) => s.replace(next)}
      />
    ),
  },
};
