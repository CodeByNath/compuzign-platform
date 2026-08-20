import { AdminField, MultiSelectField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierOverviewDraft } from '../../types';

const AUDIENCE_GROUPS: AdminFieldOption[] = [
  { value: 'personal_business', label: 'Personal & Business' },
  { value: 'enterprise', label: 'Enterprise' },
];

// Tier Overview module editor (extracted from ServiceTierStep in S3a — the
// tier shells became bindings of the archetype shells and the editor is now
// referenced by the tier binding's editor schema).
//
// The form draft extends the tier-owned overview scalars with the
// station-level popular fields the editor surfaces; on save the owning step
// routes the scalars through saveTierOverview and popular through
// setPopularTier (station-level), exactly as before. Rate Sheet, Billing
// Cycle, and commitment live in the sibling Tier Pricing Rules module — see
// TierPricingRulesEditor.tsx.

export type TierOverviewEditDraft = TierOverviewDraft & {
  // See SurfaceTierDetail.audience_groups.
  audience_groups: ('personal_business' | 'enterprise')[];
  popular: boolean;
  popular_label: string;
};

interface Props {
  draft:    TierOverviewEditDraft;
  onChange: (patch: Partial<TierOverviewEditDraft>) => void;
}

export function TierOverviewEditor({ draft, onChange }: Props) {
  const isAddon: boolean = draft.is_addon ?? false;
  // An occupant belongs to its Tier Group, not one customer audience. Unset
  // defaults to every group.
  const audienceGroups: ('personal_business' | 'enterprise')[] = draft.audience_groups ?? [];

  return (
    <div class="cz-tf-form">
      {/* An explicit override, not a Rate Sheet resolution outcome — checking
          it always reports Contact Us below, regardless of what the bound
          sheet's selected rows would otherwise total. */}
      <AdminField
        def={{ id: 'tier-contact', type: 'checkbox', label: 'Mark as Contact Us' }}
        value={draft.contact}
        onChange={(contact) => onChange({ contact })}
      />

      {/* Price is derived from the bound sheet's selected rows, so it reports
          rather than accepts. Readonly, not disabled: the value is still
          selectable and still submitted. */}
      <AdminField
        def={{ id: 'tier-price', type: 'text', label: 'Price', readonly: true }}
        value={draft.contact ? 'Contact Us' : draft.price != null ? `$${draft.price.toFixed(2)}` : 'Not configured'}
        onChange={() => undefined}
      />

      <AdminField
        def={{ id: 'tier-label', type: 'text', label: 'Display Label (optional)' }}
        value={draft.label}
        onChange={(label) => onChange({ label })}
      />

      <MultiSelectField
        id="tier-audience-groups"
        label="Customer Groups"
        options={AUDIENCE_GROUPS}
        selected={audienceGroups}
        onChange={(next) => onChange({ audience_groups: next as ('personal_business' | 'enterprise')[] })}
      />

      <AdminField
        def={{ id: 'tier-ideal-for', type: 'textarea', label: 'Ideal For', rows: 3 }}
        value={draft.ideal_for}
        onChange={(ideal_for) => onChange({ ideal_for })}
      />

      <AdminField
        def={{ id: 'tier-is-addon', type: 'checkbox', label: 'Make this Tier an add-on' }}
        value={isAddon}
        onChange={(is_addon) => onChange({ is_addon })}
      />

      <AdminField
        def={{ id: 'tier-popular', type: 'checkbox', label: 'Mark as popular tier' }}
        value={draft.popular}
        onChange={(popular) => onChange({ popular })}
      />

      {draft.popular && (
        <AdminField
          def={{ id: 'tier-popular-label', type: 'text', label: 'Popular badge label' }}
          value={draft.popular_label}
          onChange={(popular_label) => onChange({ popular_label })}
        />
      )}
    </div>
  );
}
