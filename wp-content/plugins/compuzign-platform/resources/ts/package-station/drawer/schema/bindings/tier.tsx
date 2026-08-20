// Tier shell bindings (Schema architecture S3a).
//
// Per-module configuration of the two shell archetypes for the tier station
// (Package Station shells): Tier Overview = overview archetype; Included
// Features and Common Questions (pool references) = child archetype. The
// `dna:` fields reference the living modules in utils/moduleNotifications.ts;
// state arrives at render time through ShellBinding, assembled by
// ServiceTierStep from usePackageStation's evaluateModule results.

import type { CommercialLeg, TierRateSheetSelection, TierResolvedRateSheetSelection } from '../../../types';
import type { InclusionItem } from '@/api/types/pools';
import {
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
  tierCommercialScheduleModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { commercialLegLabel } from '../../../rateSheetLabels';
import { TierOverviewEditor } from '../../editors/TierOverviewEditor';
import type { TierOverviewEditDraft } from '../../editors/TierOverviewEditor';
import { PoolInclusionsEditor } from '../../editors/PoolInclusionsEditor';
import { PoolFaqsEditor } from '../../editors/PoolFaqsEditor';
import type { FaqPoolItem } from '../../editors/PoolFaqsEditor';
import { TierPricingRulesEditor } from '../../editors/TierPricingRulesEditor';
import type { TierPricingRulesEditDraft, RateSheetPickerOption } from '../../editors/TierPricingRulesEditor';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { QaCollectionValue, TextValue } from '@/drawer-kit/schema/elements/library';
import type {
  CustomLabelBadgeValue,
  CustomPricingRulesValue,
  CustomInclusionsValue,
  CustomInclusionRow,
} from '@/drawer-kit/schema/elements/modeRenderers';

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
  // The operator's own custom badge text for the Popular chip (Tier Overview
  // Editor's "Popular badge label" field) — presentation-only re-projection
  // of pkg.popularLabel, threaded through so the read-view chip matches what
  // the editor lets the operator name it. Falls back to "Popular" when blank.
  popularBadgeLabel: string;
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
      // `custom`, not `text`: the value composes the Label plus an inline
      // Popular chip (reusing the exact chip class TierDetailPanel.tsx
      // already uses for the same purpose), which the plain `text` element
      // cannot express. See the `custom` element's Amendment Log entry
      // (drawer-kit/schema/elements/library.ts).
      id: 'label', element: 'custom', label: 'Label',
      bind: (d): CustomLabelBadgeValue => ({
        kind: 'label-badge',
        label: d.label.trim(),
        fallback: d.tierName,
        badge: d.popular ? (d.popularBadgeLabel.trim() || 'Popular') : null,
      }),
    },
    {
      id: 'platform-id', element: 'text', label: 'Platform ID',
      bind: (d): TextValue => ({ value: d.platformId, fallback: 'Assigned after Publish' }),
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
      // Small, structural, read-only — no pricing editor, no lifecycle
      // rail, no explanatory copy. The count itself only increases through
      // Options' own "+ Edition" control (TierEditionDeclarationSwitcher),
      // the single place that creates an Edition. See
      // docs/code-map/tier-edition.md.
      id: 'editions', element: 'text', label: 'Editions',
      bind: (d): TextValue => ({ value: String(d.tierEditionsCount) }),
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
  // Presentation-only richer re-projection of the SAME items above (name,
  // qty, per-leg assignment summary, resolved price) — added for the Tier
  // Inclusion read-view layout pass. Built from data already available at
  // binding-build time (detail.rate_sheet_items/rate_sheet_selections/
  // commercial_legs); never a second source of truth. See
  // tierDetailModel.buildInclusionsReadRows.
  rows: CustomInclusionRow[];
}

export const tierFeaturesShell: ShellSchema<TierFeaturesShellData> = {
  archetype: 'child',
  dna:       tierFeaturesModule,
  header: {
    title:       'Tier Inclusions',
    subtitle:    'Features included in this tier’s Default.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
    // Without this, .drawerModule__value carries no font-size/color at all —
    // every rule for it is written as `.drawerOverview .drawerModule__value`.
    scopeClass:  'drawerOverview',
  },
  content: [
    {
      // `custom`, not `item-collection`: each inclusion needs qty/leg-
      // assignment/price alongside its label, which the plain chip pool
      // element cannot express. See the `custom` element's Amendment Log
      // entry (drawer-kit/schema/elements/library.ts). `items` above is
      // unchanged and still drives the header count.
      id: 'features', element: 'custom',
      bind: (d): CustomInclusionsValue => ({
        kind: 'inclusions',
        items: d.rows,
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
        commercialLegs={s.extras?.commercialLegs as CommercialLeg[] | undefined}
      />
    ),
  },
};

// ── Tier Pricing Rules ─────────────────────────────────────────────────────────
//
// Rate Sheet binding, Commitment (independent of Legs), and the mandatory
// Commercial Legs themselves — Commercial Legs are the sole pricing-schedule
// mechanism, Simple Mode is retired. Module key/shell name stay
// `commercial_schedule`/`tierCommercialScheduleShell` internally — only the
// visible card title and its fields changed from the earlier Commercial
// Schedule module. Included Features above is the assignment surface: it
// attaches an existing inclusion to one or more of these SAME legs and
// selects a Rate Sheet Price Option (+ quantity) per leg, never a second
// inclusions system. See docs/code-map/tier-pricing-rules-plan.md.

export interface TierCommercialScheduleShellData {
  rateSheetId:        string | null;
  // Presentation-only resolved title of rateSheetId — sourced from
  // svc.rate_sheets at binding-build time, never persisted. Null when
  // unbound. Added for the Tier Pricing Rules read-view layout pass.
  rateSheetTitle:      string | null;
  minimumTermValue:   number | null;
  minimumTermUnit:    string | null;
  commitmentEnabled:  boolean;
  legs: CommercialLeg[];
}

export const tierCommercialScheduleShell: ShellSchema<TierCommercialScheduleShellData> = {
  archetype: 'child',
  dna:       tierCommercialScheduleModule,
  header: {
    title:       'Tier Pricing Rules',
    subtitle:    'Rate Sheet, Commitment, and the Commercial Legs that price this tier.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    // Opts the card's own body into the SAME `drawerModule__field`/`__label`/
    // `__value` label+value styling the Overview archetype already uses
    // (ReadBlock's own documented opt-in scope hook) — the `custom` renderer
    // above emits that markup directly, since a `child` archetype's own
    // ChildShell renders no per-field label wrapper. No new CSS.
    scopeClass:  'drawerOverview',
    count:       (d) => d.legs.length,
  },
  content: [
    {
      // `custom`, not two floating `text` rows: composes Rate Sheet,
      // Commitment, and one labelled row per Commercial Leg (reusing
      // commercialLegLabel() per-leg rather than joining every leg into one
      // blob) as a single coherent read block. See the `custom` element's
      // Amendment Log entry (drawer-kit/schema/elements/library.ts).
      id: 'pricing-summary', element: 'custom',
      bind: (d): CustomPricingRulesValue => ({
        kind: 'pricing-rules',
        rateSheetTitle: d.rateSheetTitle ?? 'Not bound',
        commitment: d.commitmentEnabled
          ? (d.minimumTermValue != null ? `${d.minimumTermValue} ${d.minimumTermUnit ?? ''}`.trim() : 'Yes')
          : 'No',
        legs: d.legs.map((leg) => commercialLegLabel(leg)),
      }),
    },
  ],
  footer:  DETAILS_FOOTER,
  actions: DETAILS_ACTIONS,
  editor: {
    render: (s) => (
      <TierPricingRulesEditor
        draft={s.draft as TierPricingRulesEditDraft}
        onChange={(patch) => s.patch?.(patch)}
        rateSheets={(s.extras?.rateSheets ?? []) as RateSheetPickerOption[]}
        hasSelections={!!s.extras?.hasSelections}
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
