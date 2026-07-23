// Tier shell bindings (Schema architecture S3a).
//
// Per-module configuration of the two shell archetypes for the tier station
// (Package Station shells): Tier Overview = overview archetype; Included
// Features and Common Questions (pool references) = child archetype. The
// `dna:` fields reference the living modules in utils/moduleNotifications.ts;
// state arrives at render time through ShellBinding, assembled by
// ServiceTierStep from usePackageStation's evaluateModule results.

import type { TierRateSheetSelection, TierResolvedRateSheetSelection } from '@/package-station';
import type { InclusionItem } from '@/api/types/pools';
import {
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { TierOverviewEditor } from '../../editors/TierOverviewEditor';
import type { TierOverviewEditDraft } from '../../editors/TierOverviewEditor';
import { PoolInclusionsEditor } from '../../editors/PoolInclusionsEditor';
import { PoolFaqsEditor } from '../../editors/PoolFaqsEditor';
import type { FaqPoolItem } from '../../editors/PoolFaqsEditor';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { ItemCollectionValue, QaCollectionValue, TextValue } from '@/drawer-kit/schema/elements/library';

// The tier/promotion owning-workspace footer: Discard pending changes (only
// while a module draft exists) then Edit — the same Action Group shape as the
// Service modules, with the drawers' existing discard wording.
const DETAILS_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard pending changes', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

const DETAILS_FOOTER = { actions: ['discard-draft', 'edit'] };

// ── Tier Overview ─────────────────────────────────────────────────────────────

export interface TierOverviewShellData {
  label:        string;
  idealFor:     string;
  tierName:     string;          // canonical tier name (Basic/Standard/…) — label fallback
  contact:      boolean;
  price:        number | null;
  billingCycle: string | null;
  popular:      boolean;         // station-level presentation flag
  popularLabel: string;
}

export const tierOverviewShell: ShellSchema<TierOverviewShellData> = {
  archetype: 'overview',
  dna:       tierOverviewModule,
  header: {
    title:       'Tier Overview',
    subtitle:    'Pricing and presentation for this tier.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview tier',
  },
  content: [
    {
      id: 'label', element: 'text', label: 'Label',
      bind: (d): TextValue => ({ value: d.label.trim(), fallback: d.tierName }),
    },
    {
      id: 'price', element: 'text', label: 'Price',
      bind: (d): TextValue => ({
        value: d.price != null ? `$${d.price}` : 'Not configured',
      }),
    },
    {
      id: 'ideal-for', element: 'text', label: 'Ideal For',
      bind: (d): TextValue => ({ value: d.idealFor || '—' }),
    },
    {
      id: 'billing-cycle', element: 'text', label: 'Billing Cycle',
      bind: (d): TextValue => ({ value: d.billingCycle || '—' }),
    },
    {
      id: 'presentation', element: 'text', label: 'Presentation',
      when: (d) => d.popular,
      bind: (d): TextValue => ({ value: `Popular${d.popularLabel ? ` · ${d.popularLabel}` : ''}` }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <TierOverviewEditor
        draft={s.draft as TierOverviewEditDraft}
        onChange={(patch) => s.patch?.(patch)}
      />
    ),
  },
};

// ── Included Features (pool references) ───────────────────────────────────────

export interface TierFeaturesShellData {
  items: InclusionItem[];
}

export const tierFeaturesShell: ShellSchema<TierFeaturesShellData> = {
  archetype: 'child',
  dna:       tierFeaturesModule,
  header: {
    title:       'Included Features',
    subtitle:    'Features included in this tier.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
  },
  content: [
    {
      id: 'features', element: 'item-collection',
      bind: (d): ItemCollectionValue => ({
        items: d.items,
        empty: { title: 'No features', copy: 'Add features included in this tier.' },
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <PoolInclusionsEditor
        draft={s.draft as InclusionItem[] | TierRateSheetSelection[]}
        onChange={(next) => s.replace(next)}
        pool={(s.extras?.pool ?? []) as InclusionItem[]}
        onCreate={s.extras?.onCreate as (label: string) => Promise<InclusionItem | null>}
        rateSheetCatalogue={s.extras?.rateSheetCatalogue as TierResolvedRateSheetSelection[] | undefined}
      />
    ),
  },
};

// ── Common Questions (pool references) ────────────────────────────────────────

export interface TierFaqsShellData {
  refs: string[];
  pool: FaqPoolItem[];
}

export const tierFaqsShell: ShellSchema<TierFaqsShellData> = {
  archetype: 'child',
  dna:       tierFaqsModule,
  header: {
    title:       'Common Questions',
    subtitle:    'Questions and answers for this tier.',
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
        empty: { title: 'No questions added', copy: 'Add common questions for this tier.' },
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
