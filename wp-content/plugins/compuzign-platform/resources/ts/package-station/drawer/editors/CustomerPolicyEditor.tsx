import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';
import type { TierResolvedRateSheetSelection } from '../../types';
import { CustomerPolicyItemFields, findCustomerPolicyItem, patchCustomerPolicyItem } from './customerPolicyFields';

// Admin authoring surface for the composable occupant's own customer_policy
// — Phase 2B1.1 (see docs/code-map/tier-composable-occupant-customer-ux.md
// for the customer-facing browse surface this feeds, and
// project-work/2026-09-03-composable-tier-admin-to-customer-validation.md
// for the locked architecture this implements).
//
// References the occupant's own already-published Rate Sheet rows
// (rateSheetCatalogue, the SAME resolved catalogue Tier Inclusions' own
// editor reads — see PoolInclusionsEditor.tsx) only. No second inclusion
// list, no independent pricing. Price Option authoring is out of this
// drawer's scope entirely (not in the locked "owns only" list) — every
// item's price_option stays permanently {mode:'fixed'}, so the customer
// never has (and never had) a Price Option choice of any kind — see
// PackageRepository::resolveComposableOfferSelection().
//
// A row absent from the draft's own items[] displays as "Not offered"
// (mode: excluded) — the exact same safe default
// PackageSchema::sanitizeCustomerPolicy() and the resolver itself already
// apply to a missing entry, so this editor never needs to persist an
// explicit excluded entry for a row it can see live in the catalogue:
// switching a row back to "Not offered" simply removes its entry from the
// saved array entirely, keeping the payload as small as what is actually
// authorized.

interface Props {
  draft: CustomerPolicy | null;
  onChange: (next: CustomerPolicy | null) => void;
  rateSheetCatalogue: TierResolvedRateSheetSelection[];
}

export function CustomerPolicyEditor({ draft, onChange, rateSheetCatalogue }: Props) {
  const rows = rateSheetCatalogue.filter((row) => row.resolved);

  const patchItem = (itemId: string, patch: Partial<CustomerPolicyItem> | null) =>
    onChange(patchCustomerPolicyItem(draft, itemId, patch));

  if (rows.length === 0) {
    return (
      <div class="cz-tf-form">
        <p class="cz-ie-sub-empty">Add Rate Sheet inclusions to this occupant first — there is nothing yet to author customer rules over.</p>
      </div>
    );
  }

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Customer Selection Rules</label>
        <div class="cz-ie-list">
          {/* Price Option authoring is deliberately NOT in this drawer's
              scope — the auditor's own "owns only" list
              (project-work/2026-09-03-composable-tier-admin-to-customer-
              validation.md) names required/optional/excluded,
              default-selected, quantity bounds, and Featured only; Price
              Option is absent from it. Every item's price_option therefore
              stays permanently {mode:'fixed'} via
              customerPolicyFields.tsx's own default — the backend's
              already-built 'choice' mode support has no Admin authoring
              path from this drawer. Flagged explicitly in this round's
              report as a real gap, not a silent omission, in case a future
              round wants this drawer's scope extended to cover it. */}
          {rows.map((row) => (
            <div key={row.item_id} class="cz-ie-entry">
              <CustomerPolicyItemFields
                rowLabel={row.label}
                item={findCustomerPolicyItem(draft, row.item_id)}
                onChange={(patch) => patchItem(row.item_id, patch)}
                leadingLabel={<div class="cz-tf-input" aria-label={row.label}>{row.label}</div>}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
