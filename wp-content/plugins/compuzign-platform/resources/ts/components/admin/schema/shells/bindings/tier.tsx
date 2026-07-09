// Tier shell bindings (Schema architecture S3a).
//
// Per-module configuration of the two shell archetypes for the tier station
// (Package Station shells): Tier Overview = overview archetype; Included
// Features and Common Questions (pool references) = child archetype. The
// `dna:` fields reference the living modules in utils/moduleNotifications.ts;
// state arrives at render time through ShellBinding, assembled by
// ServiceTierStep from usePackageStation's evaluateModule results.

import type { InclusionItem, TierPricingUsage, TierPricingUsageItem, PricingBoardItem, TierPricingPreview } from '@/api/types/admin';
import {
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
  tierPricingModule,
} from '@/components/admin/utils/moduleNotifications';
import { TierOverviewEditor } from '../../../editors/TierOverviewEditor';
import type { TierOverviewEditDraft } from '../../../editors/TierOverviewEditor';
import { PoolInclusionsEditor } from '../../../editors/PoolInclusionsEditor';
import { PoolFaqsEditor } from '../../../editors/PoolFaqsEditor';
import type { FaqPoolItem } from '../../../editors/PoolFaqsEditor';
import { TierPricingEditor } from '../../../editors/TierPricingEditor';
import type { ShellActionSchema, ShellSchema } from '../../types';
import type { ItemCollectionValue, QaCollectionValue, TextValue } from '../../elements/library';

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
        value: d.contact ? 'Contact Us' : d.price != null ? `$${d.price}` : '—',
      }),
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
        draft={s.draft as InclusionItem[]}
        onChange={(next) => s.replace(next)}
        pool={(s.extras?.pool ?? []) as InclusionItem[]}
        onCreate={s.extras?.onCreate as (label: string) => Promise<InclusionItem | null>}
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

// ── Tier Pricing Usage (first consumer control centre) ────────────────────────
// Unlike Features/FAQs above, this does not settle into current_occupant (see
// PackageSchema::settleTierSlot) — it settles into its own `pricing` slot key.
// Board items arrive read-only via boardItems (never written by this module);
// the tier owns only enabled/quantity per row plus the pricing_mode toggle.
// Manual tier price (Tier Overview) remains the default fallback throughout.

export interface TierPricingShellData {
  pricingMode: TierPricingUsage['pricing_mode'];
  usage:       TierPricingUsageItem[];
  boardItems:  PricingBoardItem[];
  // Phase F — backend-derived preview (PricingPreview::derive via
  // getPackageStation). Display-only: this binding never recomputes it, only
  // formats the returned total/status into a label. Undefined until the
  // station has loaded once (pre-Phase-F fallback shapes also omit it).
  preview?:    TierPricingPreview;
}

// Phase F — maps the backend's derived status/total to a display string.
// Formatting only: the truth table itself (what counts as ready/incomplete/
// board_disabled/no_items, what the total is) is decided entirely server-side
// by PricingPreview::derive; this function never inspects usage/board rows.
function formatPricingPreview(preview: TierPricingPreview | undefined): string {
  if (!preview) return '—';
  if (preview.status === 'board_disabled') return 'Pricing Board is disabled';
  if (preview.status === 'no_items') return 'No items configured';
  if (preview.total === null) {
    return `Incomplete (${preview.incomplete_count} issue${preview.incomplete_count === 1 ? '' : 's'})`;
  }
  const suffix = preview.complete ? '' : ` (${preview.incomplete_count} incomplete)`;
  return `$${preview.total.toFixed(2)}${suffix}`;
}

export const tierPricingShell: ShellSchema<TierPricingShellData> = {
  archetype: 'overview',
  dna:       tierPricingModule,
  header: {
    title:       'Pricing Usage',
    subtitle:    'Reference Package Pricing Board items for this tier.',
    icon:        'package',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview tier',
  },
  content: [
    {
      id: 'mode', element: 'text', label: 'Pricing Mode',
      bind: (d): TextValue => ({ value: d.pricingMode === 'calculated' ? 'Calculated' : 'Manual' }),
    },
    {
      id: 'enabled-count', element: 'text', label: 'Items enabled',
      bind: (d): TextValue => ({ value: `${d.usage.filter((u) => u.enabled).length} of ${d.boardItems.length}` }),
    },
    {
      id: 'preview', element: 'text', label: 'Calculated Preview (admin only)',
      bind: (d): TextValue => ({ value: formatPricingPreview(d.preview) }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <TierPricingEditor
        draft={s.draft as TierPricingUsage}
        onChange={(next) => s.replace(next)}
        boardItems={(s.extras?.boardItems ?? []) as PricingBoardItem[]}
        pool={(s.extras?.pool ?? []) as InclusionItem[]}
      />
    ),
  },
};
