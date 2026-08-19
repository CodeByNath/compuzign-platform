// Tier Edition shell bindings (Schema architecture S3a). Mirrors the Tier
// occupant's own bindings/tier.tsx pattern: one ShellSchema per visual card,
// DNA delivered through evaluateModule, editor.render pointing at the actual
// editor component. Card titles are the SAME literal names the occupant
// uses ("Tier Overview" / "Tier Pricing Rules" / "Default Tier Inclusions")
// — not "Edition Overview" etc.; an earlier draft of this plan invented that
// prefix and was corrected. See docs/code-map/tier-pricing-rules-plan.md.
//
// Genuinely different from Tier's own three-shell split: Edition has ONE
// consolidated backend module (see tierEditionOverviewModule and
// docs/code-map/tier-edition.md), so all three shells below share the SAME
// ModuleState — computed once by the binding-builder and handed to each —
// rather than each resolving its own. Pricing Rules and Inclusions carry no
// `editor` key and no `discard-draft` action: neither has an independent
// draft to discard or save; their own "Edit" action opens the SAME shared
// session Overview's does, landing on the relevant tab (see TierEditionEditor.tsx).

import type { InclusionItem } from '@/api/types/pools';
import { tierEditionOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import { TierEditionEditor } from '../../tier/TierEditionEditor';
import { commercialLegLabel } from '../../../rateSheetLabels';
import type { CommercialLeg } from '../../../types';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import type { CustomPricingRulesValue, CustomInclusionsValue, CustomInclusionRow } from '@/drawer-kit/schema/elements/modeRenderers';

// ── Tier Overview ─────────────────────────────────────────────────────────────

export interface TierEditionOverviewShellData {
  title:             string;
  adminDescription:  string;
  price:             number | null;
  contact:           boolean;
  editionPlatformId: string;
}

const SHARED_ACTIONS: Record<string, ShellActionSchema> = {
  'discard-draft': {
    id: 'discard-draft', label: 'Discard pending changes', intent: 'secondary',
    when: (b) => b.hasDraft,
  },
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierEditionOverviewShell: ShellSchema<TierEditionOverviewShellData> = {
  archetype: 'overview',
  dna:       tierEditionOverviewModule,
  header: {
    title:       'Tier Overview',
    subtitle:    'Pricing and presentation for this Edition.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass:  'drawerOverview tier',
  },
  content: [
    {
      id: 'title', element: 'text', label: 'Title',
      bind: (d): TextValue => ({ value: d.title.trim(), fallback: '(untitled)' }),
    },
    {
      id: 'description', element: 'text', label: 'Admin description',
      when: (d) => !!d.adminDescription.trim(),
      bind: (d): TextValue => ({ value: d.adminDescription }),
    },
    {
      id: 'price', element: 'text', label: 'Price',
      bind: (d): TextValue => ({
        value: d.contact ? 'Contact' : d.price != null ? `$${d.price}` : 'Not configured',
      }),
    },
    {
      id: 'edition-platform-id', element: 'text', label: 'Edition Platform ID',
      bind: (d): TextValue => ({ value: d.editionPlatformId, fallback: 'Assigned after Publish' }),
    },
  ],
  footer:  { actions: ['discard-draft', 'edit'] },
  actions: SHARED_ACTIONS,
  editor: {
    render: (s) => <TierEditionEditor session={s} />,
  },
};

// ── Tier Pricing Rules ─────────────────────────────────────────────────────────
//
// Rate Sheet binding, Commitment (independent of Legs), and the mandatory
// Commercial Legs themselves — Commercial Legs are the sole pricing-schedule
// mechanism, Simple Mode is retired. Same card as the occupant's own Tier
// Pricing Rules. See docs/code-map/tier-pricing-rules-plan.md.

export interface TierEditionPricingRulesShellData {
  rateSheetId:       string | null;
  // Presentation-only resolved title of rateSheetId — sourced from
  // svc.rate_sheets at binding-build time, never persisted. Null when
  // unbound (inherits the Tier's own binding). Added for the Tier Pricing
  // Rules read-view layout pass — mirrors the occupant's own binding.
  rateSheetTitle:    string | null;
  minimumTermValue:  number | null;
  minimumTermUnit:   string | null;
  commitmentEnabled: boolean;
  legs: CommercialLeg[];
}

export const tierEditionPricingRulesShell: ShellSchema<TierEditionPricingRulesShellData> = {
  archetype: 'child',
  dna:       tierEditionOverviewModule,
  header: {
    title:       'Tier Pricing Rules',
    subtitle:    'Rate Sheet, Commitment, and the Commercial Legs that price this Edition.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    // Opts the card's own body into the SAME `drawerModule__field`/`__label`/
    // `__value` label+value styling the Overview archetype already uses
    // (ReadBlock's own documented opt-in scope hook) — the `custom` renderer
    // below emits that markup directly, since a `child` archetype's own
    // ChildShell renders no per-field label wrapper. No new CSS. Mirrors the
    // occupant's own tierCommercialScheduleShell.
    scopeClass:  'drawerOverview',
    count:       (d) => d.legs.length,
  },
  content: [
    {
      // `custom`, not two floating `text` rows — mirrors the occupant's own
      // tierCommercialScheduleShell. See the `custom` element's Amendment
      // Log entry (drawer-kit/schema/elements/library.ts).
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
  footer:  { actions: ['edit'] },
  actions: { edit: { id: 'edit', label: 'Edit', intent: 'secondary' } },
};

// ── Default Tier Inclusions ────────────────────────────────────────────────────
//
// Read-only presentation of the SAME module's own rate_sheet_items — no
// independent draft, save, or lifecycle (see docs/code-map/tier-edition.md:
// Edition has one consolidated module, not a parent-style Overview/Features
// split). Mirrors packageFamilyRelationshipsShell's read-only-card shape,
// not tierFeaturesShell's independently-editable one.

export interface TierEditionInclusionsShellData {
  items: InclusionItem[];
  // Presentation-only richer re-projection of the SAME items above — mirrors
  // the occupant's own TierFeaturesShellData.rows. See
  // tierDetailModel.buildInclusionsReadRows.
  rows: CustomInclusionRow[];
}

const INCLUSIONS_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierEditionInclusionsShell: ShellSchema<TierEditionInclusionsShellData> = {
  archetype: 'child',
  dna:       tierEditionOverviewModule,
  header: {
    title:       'Default Tier Inclusions',
    subtitle:    'Features included in this Edition.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
  },
  content: [
    {
      // `custom`, not `item-collection` — mirrors the occupant's own
      // tierFeaturesShell. See the `custom` element's Amendment Log entry
      // (drawer-kit/schema/elements/library.ts). `items` above is unchanged
      // and still drives the header count.
      id: 'items', element: 'custom',
      bind: (d): CustomInclusionsValue => ({
        kind: 'inclusions',
        items: d.rows,
        empty: { title: 'No features', copy: 'Add features included in this Edition.' },
      }),
    },
  ],
  footer:  { actions: ['edit'] },
  actions: INCLUSIONS_ACTIONS,
};
