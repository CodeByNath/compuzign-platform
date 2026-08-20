// Tier Edition shell bindings (Schema architecture S3a) — additive, not yet
// wired into any placement (drawer refinement blueprint, Phase 4). Mirrors
// the Tier occupant's own bindings/tier.tsx pattern: one ShellSchema per
// visual card, DNA delivered through evaluateModule, editor.render pointing
// at the actual editor component.
//
// Genuinely different from Tier's own three-shell split: Edition has ONE
// consolidated backend module (see tierEditionOverviewModule and
// docs/code-map/tier-edition.md), so Overview and Inclusions below share the
// SAME ModuleState — computed once by the binding-builder (Phase 5) and
// handed to both — rather than each resolving its own. Inclusions carries no
// `editor` key and no `discard-draft` action: it has no independent draft to
// discard or save; its own "Edit" action opens the SAME shared session
// Overview's does, landing on the Inclusions tab (see TierEditionEditor.tsx).

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
  billingCycle:      string | null;
  minimumTermValue:  number | null;
  minimumTermUnit:   string | null;
  activeBillingCycles: string[];
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
      // Empty reads exactly like an Edition that has never used this
      // capability — Simple Mode, no different from before it existed.
      id: 'active-billing-cycles', element: 'text', label: 'Active Billing Cycles',
      bind: (d): TextValue => ({ value: d.activeBillingCycles.length > 0 ? d.activeBillingCycles.join(', ') : '—' }),
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
