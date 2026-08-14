import { useEffect, useRef, useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierOverviewDraft } from '../../types';

// The billing cycles a Tier can carry. A fixed vocabulary, so it is a constant
// rather than a value rebuilt on every render.
const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

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
// setPopularTier (station-level), exactly as before.

export type TierOverviewEditDraft = TierOverviewDraft & {
  // See SurfaceTierDetail.audience_groups.
  audience_groups: ('personal_business' | 'enterprise')[];
  popular: boolean;
  popular_label: string;
};

export interface RateSheetPickerOption {
  id:     string;
  title:  string;
  status: 'active' | 'archived';
}

interface Props {
  draft:         TierOverviewEditDraft;
  onChange:      (patch: Partial<TierOverviewEditDraft>) => void;
  rateSheets?:   RateSheetPickerOption[];
  hasSelections?: boolean;
}

export function TierOverviewEditor({ draft, onChange, rateSheets = [], hasSelections = false }: Props) {
  // Switching the bound sheet clears this Tier's row selections (enforced at
  // settle). Confirm first so the change is never silent.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (hasSelections && !window.confirm('Switching Rate Sheet clears this tier\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next });
  };
  const rateSheetOptions: AdminFieldOption[] = rateSheets.map((sheet) => ({
    value: sheet.id,
    label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
  }));
  const isAddon: boolean = draft.is_addon ?? false;
  // An occupant belongs to its Tier Group, not one customer audience.
  // Toggling a box adds/removes just that value.
  const audienceGroups: ('personal_business' | 'enterprise')[] = draft.audience_groups ?? [];
  const toggleAudienceGroup = (value: 'personal_business' | 'enterprise', checked: boolean) => {
    onChange({
      audience_groups: checked
        ? (audienceGroups.includes(value) ? audienceGroups : [...audienceGroups, value])
        : audienceGroups.filter((group) => group !== value),
    });
  };
  const audienceGroupsSummary = audienceGroups.length === 0
    ? 'None selected'
    : AUDIENCE_GROUPS.filter((group) => audienceGroups.includes(group.value as 'personal_business' | 'enterprise'))
      .map((group) => group.label)
      .join(', ');
  const [audienceGroupsOpen, setAudienceGroupsOpen] = useState(false);
  const audienceGroupsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!audienceGroupsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!audienceGroupsRef.current?.contains(e.target as Node)) setAudienceGroupsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [audienceGroupsOpen]);

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{
          id: 'tier-rate-sheet',
          type: 'select',
          label: 'Rate Sheet',
          unsetLabel: 'Not bound',
          options: rateSheetOptions,
        }}
        value={draft.rate_sheet_id ?? ''}
        onChange={(next: string) => changeRateSheet(next || null)}
      />

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
        def={{
          id: 'tier-billing-cycle',
          type: 'select',
          label: 'Billing Cycle',
          options: BILLING_CYCLES,
        }}
        value={draft.billing_cycle}
        onChange={(billing_cycle: string) => onChange({ billing_cycle })}
      />

      <AdminField
        def={{ id: 'tier-label', type: 'text', label: 'Display Label (optional)' }}
        value={draft.label}
        onChange={(label) => onChange({ label })}
      />

      {/* An occupant belongs to its Tier Group, not one customer audience.
          Unset defaults to every group. Reuses the field system's own
          checkbox for each option and the same floating-panel pattern
          station menus already use (see .cz-station-split__menu) — no new
          control family. */}
      <div class="cz-tf-field">
        <label class="cz-tf-label" id="tier-audience-groups-label">Customer Groups</label>
        <div class="cz-tier-audience-groups" ref={audienceGroupsRef}>
          <button
            type="button"
            id="tier-audience-groups-trigger"
            class="cz-tf-control cz-tf-select"
            aria-haspopup="true"
            aria-expanded={audienceGroupsOpen}
            aria-labelledby="tier-audience-groups-label tier-audience-groups-trigger"
            onClick={() => setAudienceGroupsOpen((open) => !open)}
          >
            {audienceGroupsSummary}
          </button>
          {audienceGroupsOpen && (
            <div class="cz-tier-audience-groups__panel" role="group" aria-label="Customer Groups">
              {AUDIENCE_GROUPS.map((group) => (
                <AdminField
                  key={group.value}
                  def={{ id: `tier-audience-groups-${group.value}`, type: 'checkbox', label: group.label }}
                  value={audienceGroups.includes(group.value as 'personal_business' | 'enterprise')}
                  onChange={(checked: boolean) => toggleAudienceGroup(group.value as 'personal_business' | 'enterprise', checked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
