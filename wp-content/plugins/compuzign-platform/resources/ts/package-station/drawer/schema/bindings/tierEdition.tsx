// Tier Edition shell bindings (Schema architecture S3a) — additive, not yet
// wired into any placement (drawer refinement blueprint, Phase 4). Mirrors
// the Tier occupant's own bindings/tier.tsx pattern: one ShellSchema per
// visual card, DNA delivered through evaluateModule, editor.render pointing
// at the actual editor component.
//
// Genuinely different from Tier's own four-shell split: Edition has ONE
// consolidated backend module (see tierEditionOverviewModule and
// docs/code-map/tier-edition.md), so Overview, Pricing Rules, and Inclusions
// below all share the SAME ModuleState — computed once by the binding-
// builder — rather than each resolving its own. Pricing Rules and Inclusions
// carry no `editor` key and no `discard-draft` action: neither has an
// independent draft to discard or save; each own "Edit" action opens the
// SAME shared session Overview's does, landing on its own tab (see
// TierEditionEditor.tsx).

import type { InclusionItem } from '@/api/types/pools';
import { tierEditionOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import { TierEditionEditor } from '../../tier/TierEditionEditor';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { ItemCollectionValue, TextValue } from '@/drawer-kit/schema/elements/library';

// ── Edition Overview ─────────────────────────────────────────────────────────

export interface TierEditionOverviewShellData {
  title:             string;
  adminDescription:  string;
  price:             number | null;
  contact:           boolean;
  editionPlatformId: string;
}

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
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
    title:       'Edition Overview',
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
  actions: OVERVIEW_ACTIONS,
  editor: {
    render: (s) => <TierEditionEditor session={s} />,
  },
};

// ── Edition Pricing Rules ─────────────────────────────────────────────────────
//
// Read-only presentation of the SAME module's own Rate Sheet binding,
// billing cadence, and minimum commitment — no independent draft, save, or
// lifecycle (mirrors Edition Inclusions below; see docs/code-map/tier-
// edition.md: Edition has one consolidated module, not a parent-style
// Overview/Features split). Mirrors the parent Tier occupant's own Tier
// Pricing Rules card one level deeper.

export interface TierEditionPricingRulesShellData {
  rateSheetId:      string | null;
  rateSheetName:    string | null;
  billingCycle:     string | null;
  minimumTermValue: number | null;
  minimumTermUnit:  string | null;
  fromMonth: number | null;
  toMonth:   number | null;
}

const PRICING_RULES_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierEditionPricingRulesShell: ShellSchema<TierEditionPricingRulesShellData> = {
  archetype: 'child',
  dna:       tierEditionOverviewModule,
  header: {
    title:       'Edition Pricing Rules',
    subtitle:    'Rate Sheet, billing cycle, and minimum commitment for this Edition.',
    icon:        'overview',
    iconVariant: 'drawerModule__icon--overview',
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
      id: 'minimum-term', element: 'text', label: 'Minimum commitment',
      bind: (d): TextValue => ({
        value: d.minimumTermValue != null ? `${d.minimumTermValue} ${d.minimumTermUnit ?? ''}`.trim() : '—',
      }),
    },
    {
      id: 'coverage', element: 'text', label: 'Coverage',
      bind: (d): TextValue => ({
        value: d.fromMonth != null && d.toMonth != null ? `Month ${d.fromMonth} – ${d.toMonth}` : '—',
      }),
    },
  ],
  footer:  { actions: ['edit'] },
  actions: PRICING_RULES_ACTIONS,
};

// ── Edition Inclusions ────────────────────────────────────────────────────────
//
// Read-only presentation of the SAME module's own rate_sheet_items — no
// independent draft, save, or lifecycle (see docs/code-map/tier-edition.md:
// Edition has one consolidated module, not a parent-style Overview/Features
// split). Mirrors packageFamilyRelationshipsShell's read-only-card shape,
// not tierFeaturesShell's independently-editable one.

export interface TierEditionInclusionsShellData {
  items: InclusionItem[];
}

const INCLUSIONS_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierEditionInclusionsShell: ShellSchema<TierEditionInclusionsShellData> = {
  archetype: 'child',
  dna:       tierEditionOverviewModule,
  header: {
    title:       'Edition Inclusions',
    subtitle:    'Features included in this Edition.',
    icon:        'features',
    iconVariant: 'drawerModule__icon--features',
    count:       (d) => d.items.length,
  },
  content: [
    {
      id: 'items', element: 'item-collection',
      bind: (d): ItemCollectionValue => ({
        items: d.items,
        empty: { title: 'No features', copy: 'Add features included in this Edition.' },
      }),
    },
  ],
  footer:  { actions: ['edit'] },
  actions: INCLUSIONS_ACTIONS,
};
