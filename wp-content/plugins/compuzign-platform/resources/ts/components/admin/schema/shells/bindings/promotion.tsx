// Promotion shell bindings (Schema architecture S3a).
//
// Per-module configuration of the two shell archetypes for the promotion
// station (travelling instances): Promotion Overview = overview archetype;
// Included Features and Common Questions (pool references) = child archetype.
// The `dna:` fields reference the living modules in
// utils/moduleNotifications.ts; state arrives at render time through
// ShellBinding, assembled by ServicePromotionStep from usePromotionStation's
// evaluateModule results.

import type { InclusionItem, PromotionOverviewDraft } from '@/api/types/admin';
import {
  promotionOverviewModule,
  promotionFeaturesModule,
  promotionFaqsModule,
} from '@/components/admin/utils/moduleNotifications';
import { PromotionOverviewEditor } from '../../../editors/PromotionOverviewEditor';
import { PoolInclusionsEditor } from '../../../editors/PoolInclusionsEditor';
import { PoolFaqsEditor } from '../../../editors/PoolFaqsEditor';
import type { FaqPoolItem } from '../../../editors/PoolFaqsEditor';
import type { ShellActionSchema, ShellSchema } from '../../types';
import type { ItemCollectionValue, QaCollectionValue, TextValue } from '../../elements/library';

// Same owning-workspace footer as the tier bindings (drawer discard wording).
const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard pending changes', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

const DETAILS_FOOTER = { actions: ['discard-draft', 'edit'] };

// ── Promotion Overview ────────────────────────────────────────────────────────
// Display projection assembled by the drawer step; values are draft-preferred.

export interface PromotionOverviewShellData {
  name:          string;
  basedOnLabel:  string;         // resolved tier label, or 'None'
  price:         number | null;
  billingLabel:  string;
  badge:         string;
  campaignLabel: string;
  featured:      boolean;
  priority:      number;
  headline:      string;
  description:   string;
}

export const promotionOverviewShell: ShellSchema<PromotionOverviewShellData> = {
  archetype: 'overview',
  dna:       promotionOverviewModule,
  header: {
    title:       'Promotion Overview',
    subtitle:    'General information about this promotion.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview',
  },
  content: [
    {
      id: 'name', element: 'text', label: 'Name',
      bind: (d): TextValue => ({ value: d.name, fallback: '(unnamed)' }),
    },
    {
      id: 'based-on', element: 'text', label: 'Based on tier',
      bind: (d): TextValue => ({ value: d.basedOnLabel }),
    },
    {
      id: 'price', element: 'text', label: 'Price',
      bind: (d): TextValue => ({ value: d.price !== null ? `$${d.price}` : '—' }),
    },
    {
      id: 'billing-label', element: 'text', label: 'Billing label',
      bind: (d): TextValue => ({ value: d.billingLabel || '—' }),
    },
    {
      id: 'badge', element: 'text', label: 'Badge',
      bind: (d): TextValue => ({ value: d.badge || '—' }),
    },
    {
      id: 'campaign-label', element: 'text', label: 'Campaign label',
      bind: (d): TextValue => ({ value: d.campaignLabel || '—' }),
    },
    {
      id: 'featured', element: 'text', label: 'Featured',
      bind: (d): TextValue => ({ value: d.featured ? 'Yes' : 'No' }),
    },
    {
      id: 'priority', element: 'text', label: 'Priority',
      bind: (d): TextValue => ({ value: String(d.priority) }),
    },
    {
      id: 'headline', element: 'text', label: 'Headline',
      bind: (d): TextValue => ({ value: d.headline || '—' }),
    },
    {
      id: 'description', element: 'text', label: 'Description',
      bind: (d): TextValue => ({ value: d.description || '—' }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <PromotionOverviewEditor
        draft={s.draft as PromotionOverviewDraft}
        onChange={(patch) => s.patch?.(patch)}
        saveOk={s.extras?.saveOk as boolean | undefined}
      />
    ),
  },
};

// ── Included Features (pool references) ───────────────────────────────────────

export interface PromotionFeaturesShellData {
  items: InclusionItem[];
}

export const promotionFeaturesShell: ShellSchema<PromotionFeaturesShellData> = {
  archetype: 'child',
  dna:       promotionFeaturesModule,
  header: {
    title:       'Included Features',
    subtitle:    'Features included in this promotion.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
  },
  content: [
    {
      id: 'features', element: 'item-collection',
      bind: (d): ItemCollectionValue => ({
        items: d.items,
        empty: { title: 'No features', copy: 'Add features included in this promotion.' },
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <PoolInclusionsEditor
        draft={s.draft as InclusionItem[]}
        onChange={(next) => s.replace(next)}
        pool={(s.extras?.pool ?? []) as InclusionItem[]}
        onCreate={s.extras?.onCreate as (label: string) => Promise<InclusionItem | null>}
      />
    ),
  },
};

// ── Common Questions (pool references) ────────────────────────────────────────

export interface PromotionFaqsShellData {
  refs: string[];
  pool: FaqPoolItem[];
}

export const promotionFaqsShell: ShellSchema<PromotionFaqsShellData> = {
  archetype: 'child',
  dna:       promotionFaqsModule,
  header: {
    title:       'Common Questions',
    subtitle:    'Questions and answers for this promotion.',
    icon:        'faqs',
    iconVariant: 'drawerModule__icon--faqs',
    count:       (d) => d.refs.length,
  },
  content: [
    {
      id: 'questions', element: 'qa-collection',
      bind: (d): QaCollectionValue => ({
        // Reference items: no answer relation → no answer line (undefined).
        items: d.refs.map((ref) => {
          const faq = d.pool.find((f) => f.id === ref);
          return { id: ref, question: faq?.question ?? ref, answer: faq?.answer ? faq.answer : undefined };
        }),
        empty: { title: 'No questions added', copy: 'Add common questions for this promotion.' },
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <PoolFaqsEditor
        draft={s.draft as string[]}
        onChange={(next) => s.replace(next)}
        pool={(s.extras?.pool ?? []) as FaqPoolItem[]}
        onCreate={s.extras?.onCreate as (question: string, answer: string) => Promise<FaqPoolItem | null>}
      />
    ),
  },
};
