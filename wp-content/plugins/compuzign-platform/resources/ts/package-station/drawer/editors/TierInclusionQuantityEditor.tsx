// Tier inclusion quantity editor — the one field of this record the Tier owns.
//
// Rendered inside InlineEditorShell, which owns the Save/Cancel footer, the
// dirty-discard confirm and the inline save error. This file owns the form
// only: the draft, its validation gate and the persistence path stay with the
// controller and usePackageStation.
//
// Label, unit rate and pricing unit are shown read-only for context and are
// NOT editable here — they belong to the Service inclusion pool and the Rate
// Sheet row, and are authored in their own tools.

export interface TierInclusionQuantityDraft {
  quantity: number;
}

interface Props {
  draft:     TierInclusionQuantityDraft;
  onChange:  (patch: Partial<TierInclusionQuantityDraft>) => void;
  name?:     string;
  unitPrice?: number | null;
  per?:      string | null;
}

export function TierInclusionQuantityEditor({ draft, onChange, name, unitPrice, per }: Props) {
  const lineTotal = unitPrice != null ? unitPrice * draft.quantity : null;

  return (
    <div class="cz-tf-form">
      {name && (
        <div class="cz-tf-field">
          <label class="cz-tf-label">Inclusion</label>
          <input type="text" class="cz-tf-input" value={name} readOnly />
        </div>
      )}

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-tier-inclusion-quantity">Quantity</label>
        <input
          id="cz-tier-inclusion-quantity"
          class="cz-tf-input"
          type="number"
          min="1"
          step="1"
          value={draft.quantity}
          aria-label={name ? `Quantity for ${name}` : 'Quantity'}
          onInput={(event) => onChange({
            quantity: Math.max(1, Math.trunc(Number(event.currentTarget.value) || 1)),
          })}
        />
      </div>

      {unitPrice != null && (
        <div class="cz-tf-field">
          <label class="cz-tf-label">Line total</label>
          <input
            type="text"
            class="cz-tf-input"
            value={lineTotal != null ? `$${lineTotal.toFixed(2)}${per ? ` · ${per}` : ''}` : '—'}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
