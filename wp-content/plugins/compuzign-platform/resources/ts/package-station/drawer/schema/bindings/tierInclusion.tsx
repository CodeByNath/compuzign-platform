// Tier Inclusion shell schemas — presentation description only.
//
// Overview reads one Tier's use of one Rate Sheet row; its single editable
// field is Quantity, because quantity is the only part of this record the Tier
// owns (label, price and unit belong to the Service pool and the Rate Sheet).
//
// The three connection shells are one factory, three placements: Service,
// Category and Rate Sheet are the same relationship presentation viewed under
// different titles, so they share an implementation rather than three copies.
// An unavailable relationship is expressed through the existing contract —
// `disabled` status from tierInclusionConnectionModule plus a literal
// "Not configured" value — and declares NO action, so nothing offers a
// navigation target that does not exist.

import {
  tierInclusionModule,
  tierInclusionConnectionModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { IconId } from '@/drawer-kit/schema/icons';
import type { ShellActionSchema, ShellSchema } from '@/drawer-kit/schema/types';
import type { TextValue } from '@/drawer-kit/schema/elements/library';
import { TierInclusionQuantityEditor } from '../../editors/TierInclusionQuantityEditor';
import type { TierInclusionQuantityDraft } from '../../editors/TierInclusionQuantityEditor';

export const NOT_CONFIGURED = 'Not configured';

// Row parity with the focused-Tier deck, which formats its own money the same
// way. utils/format's formatPrice rounds to whole dollars, which would show a
// different number here than the row the user clicked.
function money(value: number | null): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

// An unresolved selection has no price because its row or Service source no
// longer resolves — the rate is not missing from the sheet. Say that, exactly
// as the deck row the user clicked says it; "Not configured" would assert an
// authoring gap that does not exist.
function priced(value: number | null, per: string | null, resolved: boolean): string {
  if (!resolved) return 'Pricing unavailable';
  if (value == null) return NOT_CONFIGURED;
  return per ? `${money(value)} · ${per}` : money(value);
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface TierInclusionOverviewShellData {
  name:       string;
  sourceId:   string | null;
  itemId:     string;
  categories: string[];
  quantity:   number;
  unitPrice:  number | null;
  lineTotal:  number | null;
  per:        string | null;
  resolved:   boolean;
}

const OVERVIEW_ACTIONS: Record<string, ShellActionSchema> = {
  edit: { id: 'edit', label: 'Edit', intent: 'secondary' },
};

export const tierInclusionOverviewShell: ShellSchema<TierInclusionOverviewShellData> = {
  archetype: 'overview',
  dna: tierInclusionModule,
  header: {
    title: 'Inclusion Overview',
    subtitle: "This Tier's use of one Rate Sheet row.",
    icon: 'features',
    iconVariant: 'drawerModule__icon--overview',
    scopeClass: 'drawerOverview',
  },
  content: [
    {
      id: 'name', element: 'text', label: 'Name',
      bind: (data): TextValue => ({ value: data.name }),
    },
    {
      id: 'inclusion-id', element: 'text', label: 'Inclusion ID',
      bind: (data): TextValue => ({ value: data.sourceId ?? '', fallback: NOT_CONFIGURED }),
    },
    {
      id: 'rate-sheet-row-id', element: 'text', label: 'Rate Sheet row ID',
      bind: (data): TextValue => ({ value: data.itemId }),
    },
    {
      id: 'category', element: 'text', label: 'Category',
      bind: (data): TextValue => ({
        value: data.categories.join(' · '),
        fallback: NOT_CONFIGURED,
      }),
    },
    {
      // The same figure the deck row shows: the Tier's committed line total.
      id: 'price', element: 'text', label: 'Price',
      bind: (data): TextValue => ({ value: priced(data.lineTotal, data.per, data.resolved) }),
    },
    {
      id: 'unit-rate', element: 'text', label: 'Unit rate',
      bind: (data): TextValue => ({ value: priced(data.unitPrice, data.per, data.resolved) }),
    },
    {
      id: 'quantity', element: 'text', label: 'Quantity',
      bind: (data): TextValue => ({ value: String(data.quantity) }),
    },
    {
      // The selection's honest resolution — not an Active/Draft lifecycle,
      // which a Tier selection does not have. Matches the deck's own wording.
      id: 'status', element: 'text', label: 'Status',
      bind: (data): TextValue => ({ value: data.resolved ? 'Active' : 'Unresolved' }),
    },
  ],
  footer: { actions: ['edit'] },
  actions: OVERVIEW_ACTIONS,
  editor: {
    // Read-only pricing context travels as session extras (the documented
    // editor-specific session channel); the draft carries only what is edited.
    render: (session) => (
      <TierInclusionQuantityEditor
        draft={session.draft as TierInclusionQuantityDraft}
        onChange={(patch) => session.patch?.(patch)}
        name={session.extras?.name as string | undefined}
        unitPrice={session.extras?.unitPrice as number | null | undefined}
        per={session.extras?.per as string | null | undefined}
      />
    ),
  },
};

// ── Connections ───────────────────────────────────────────────────────────────

export interface TierInclusionConnectionShellData {
  configured: boolean;
  primary:    string;
  identity:   string;
}

function tierInclusionConnectionShell(options: {
  title:         string;
  subtitle:      string;
  icon:          IconId;
  primaryLabel:  string;
  identityLabel?: string;
}): ShellSchema<TierInclusionConnectionShellData> {
  const content: ShellSchema<TierInclusionConnectionShellData>['content'] = [
    {
      id: 'primary', element: 'text', label: options.primaryLabel,
      bind: (data): TextValue => ({
        value: data.configured ? data.primary : '',
        fallback: NOT_CONFIGURED,
      }),
    },
  ];
  // Only declared where the stored contract actually carries an id. Service
  // Categories reach Package Station as names, so that shell shows no id row
  // rather than an invented one.
  if (options.identityLabel) {
    content.push({
      id: 'identity', element: 'text', label: options.identityLabel,
      bind: (data): TextValue => ({
        value: data.configured ? data.identity : '',
        fallback: NOT_CONFIGURED,
      }),
    });
  }
  return {
    archetype: 'overview',
    dna: tierInclusionConnectionModule,
    header: {
      title: options.title,
      subtitle: options.subtitle,
      icon: options.icon,
      scopeClass: 'drawerOverview',
    },
    content,
    // No action: this drawer reads relationships, and there is no navigation
    // target to offer that would not be fabricated (a drawer never nests one).
    footer: { actions: [] },
    actions: {},
  };
}

export const tierInclusionServiceShell = tierInclusionConnectionShell({
  title: 'Service',
  subtitle: 'The Service that supplies this inclusion.',
  icon: 'overview',
  primaryLabel: 'Service',
  identityLabel: 'Service ID',
});

export const tierInclusionCategoryShell = tierInclusionConnectionShell({
  title: 'Category',
  subtitle: 'Service categories recorded for this inclusion.',
  icon: 'category',
  primaryLabel: 'Category',
});

export const tierInclusionRateSheetShell = tierInclusionConnectionShell({
  title: 'Rate Sheet',
  subtitle: 'The Rate Sheet this Tier priced the inclusion from.',
  icon: 'package',
  primaryLabel: 'Rate Sheet',
  identityLabel: 'Rate Sheet ID',
});
