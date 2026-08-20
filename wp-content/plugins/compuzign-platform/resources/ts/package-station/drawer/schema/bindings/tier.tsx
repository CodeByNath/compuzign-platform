// Tier shell bindings (Schema architecture S3a).
//
// Per-module configuration of the two shell archetypes for the tier station
// (Package Station shells): Tier Overview = overview archetype; Included
// Features and Common Questions (pool references) = child archetype. The
// `dna:` fields reference the living modules in utils/moduleNotifications.ts;
// state arrives at render time through ShellBinding, assembled by
// ServiceTierStep from usePackageStation's evaluateModule results.

import type { TierRateSheetSelection, TierResolvedRateSheetSelection } from '../../../types';
import type { InclusionItem } from '@/api/types/pools';
import {
  tierOverviewModule,
  tierPricingRulesModule,
  tierFeaturesModule,
  tierFaqsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { TierOverviewEditor } from '../../editors/TierOverviewEditor';
import type { TierOverviewEditDraft } from '../../editors/TierOverviewEditor';
import { TierPricingRulesEditor } from '../../editors/TierPricingRulesEditor';
import type { RateSheetPickerOption } from '../../editors/TierPricingRulesEditor';
import type { TierPricingRulesDraft } from '../../../types';
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
  // An occupant belongs to its Tier Group, not one customer audience. See
  // SurfaceTierDetail.audience_groups.
  audienceGroups: ('personal_business' | 'enterprise')[];
  tierName:     string;          // canonical tier name (Basic/Standard/…) — label fallback
  contact:      boolean;
  price:        number | null;
  isAddon:      boolean;         // occupant-level selection mode — see Tier Add-on Selection code map
  popular:      boolean;         // station-level presentation flag
  platformId:   string;
  addonPlatformId: string;
  // 1 (the occupant's own permanent Default declaration) + however many
  // additional CZTE Edition child records exist — always derived from
  // tier_editions.length, never a separately persisted count. See
  // docs/code-map/tier-edition.md.
  tierEditionsCount: number;
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
      id: 'type', element: 'text', label: 'Type',
      bind: (d): TextValue => ({ value: d.isAddon ? 'Package Add-on' : 'Package Tier' }),
    },
    {
      // One line per selected group — unchanged single-line reading when
      // one or none is selected; additional groups print on their own line
      // below via the field's own scoped white-space rule (drawer-kit.css),
      // never a second field or a layout change to any other row.
      id: 'audience-group', element: 'text', label: 'Customer Group',
      bind: (d): TextValue => ({
        value: d.audienceGroups.length > 0
          ? d.audienceGroups.map((g) => (g === 'enterprise' ? 'Enterprise' : 'Personal & Business')).join('\n')
          : 'None selected',
      }),
    },
    {
      id: 'price', element: 'text', label: 'Price',
      bind: (d): TextValue => ({
        value: d.contact ? 'Contact' : d.price != null ? `$${d.price}` : 'Not configured',
      }),
    },
    {
      id: 'ideal-for', element: 'text', label: 'Ideal For',
      bind: (d): TextValue => ({ value: d.idealFor || '—' }),
    },
    {
      id: 'popular', element: 'text', label: 'Popular',
      bind: (d): TextValue => ({ value: d.popular ? 'Yes' : 'No' }),
    },
    {
      // Small, structural, read-only — no pricing editor, no lifecycle
      // rail, no explanatory copy. The count itself only increases through
      // Options' own "+ Edition" control (TierEditionDeclarationSwitcher),
      // the single place that creates an Edition. See
      // docs/code-map/tier-edition.md.
      id: 'editions', element: 'text', label: 'Editions',
      bind: (d): TextValue => ({ value: String(d.tierEditionsCount) }),
    },
    {
      id: 'platform-id', element: 'text', label: 'Tier Platform ID',
      bind: (d): TextValue => ({ value: d.platformId, fallback: 'Assigned after Publish' }),
    },
    {
      id: 'addon-platform-id', element: 'text', label: 'Add-on Platform ID',
      when: (d) => d.isAddon,
      bind: (d): TextValue => ({ value: d.addonPlatformId, fallback: 'Assigned after Publish' }),
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

// ── Tier Pricing Rules (Rate Sheet binding, billing cadence, minimum
//    commitment) — split out of Tier Overview into its own module so it can
//    be edited/settled/status-tracked independently. ─────────────────────────

export interface TierPricingRulesShellData {
  rateSheetId:   string | null;
  rateSheetName: string | null;
  billingCycle:  string | null;
  minimumTermValue: number | null;
  minimumTermUnit:  string | null;
  fromMonth: number | null;
  toMonth:   number | null;
  // Count of Commercial Legs beyond Leg Default (the fields above). Read-mode
  // shows a count only — the full per-leg breakdown lives in the editor.
  legsCount: number;
}

export const tierPricingRulesShell: ShellSchema<TierPricingRulesShellData> = {
  archetype: 'overview',
  dna:       tierPricingRulesModule,
  header: {
    title:       'Tier Pricing Rules',
    subtitle:    'Rate Sheet, billing cycle, and minimum commitment.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview tier',
  },
  content: [
    {
      id: 'rate-sheet', element: 'text', label: 'Rate Sheet',
      bind: (d): TextValue => ({ value: d.rateSheetName ?? 'Not bound' }),
    },
    {
      id: 'billing-cycle', element: 'text', label: 'Billing Cycle',
      bind: (d): TextValue => ({ value: d.billingCycle || '—' }),
    },
    {
      // Mirrors Tier Edition's own 'minimum-term' row (bindings/tierEdition.tsx).
      id: 'minimum-term', element: 'text', label: 'Minimum commitment',
      bind: (d): TextValue => ({
        value: d.minimumTermValue != null ? `${d.minimumTermValue} ${d.minimumTermUnit ?? ''}`.trim() : '—',
      }),
    },
    {
      id: 'coverage', element: 'text', label: 'Coverage (Leg Default)',
      bind: (d): TextValue => ({
        value: d.fromMonth != null && d.toMonth != null ? `Month ${d.fromMonth} – ${d.toMonth}` : '—',
      }),
    },
    {
      id: 'commercial-legs', element: 'text', label: 'Commercial Legs',
      bind: (d): TextValue => ({ value: d.legsCount > 0 ? `${d.legsCount} additional` : 'None' }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <TierPricingRulesEditor
        draft={s.draft as TierPricingRulesDraft}
        onChange={(patch) => s.patch?.(patch)}
        rateSheets={(s.extras?.rateSheets ?? []) as RateSheetPickerOption[]}
        hasSelections={!!s.extras?.hasSelections}
      />
    ),
  },
};

// ── Inclusions & Editions (pool references + the Default declaration's own
//    inclusion/Rate-Sheet editor) ───────────────────────────────────────────
//
// This module's own content/editor still edit only the occupant's own
// Default declaration — unchanged from before Tier Editions existed. Any
// additional Editions this Tier carries render immediately below it (still
// inside the Details tab's trailing slot — see TierDrawerContent.tsx) as a
// compact [Default] [Edition 2] … tab strip (TierEditionDeclarationSwitcher)
// that reuses this SAME PoolInclusionsEditor/Rate-Sheet mechanics one level
// deeper, never a second inclusions system. See docs/code-map/tier-edition.md.

export interface TierFeaturesShellData {
  items: InclusionItem[];
}

export const tierFeaturesShell: ShellSchema<TierFeaturesShellData> = {
  archetype: 'child',
  dna:       tierFeaturesModule,
  header: {
    title:       'Default Tier Inclusions',
    subtitle:    'Features included in this tier’s Default.',
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
