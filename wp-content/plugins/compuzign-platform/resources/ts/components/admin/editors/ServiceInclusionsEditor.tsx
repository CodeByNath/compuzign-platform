import { useState } from 'preact/hooks';
import type { ServiceItem } from '@/api/types/cost-builder';

export interface InclusionDraftItem {
  id: string;
  label: string;
}

export interface InclusionsDraft {
  items: InclusionDraftItem[];
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function initInclusionsDraft(service: ServiceItem): InclusionsDraft {
  return {
    items: service.inclusions.map((inc) => ({ id: inc.id, label: inc.label })),
  };
}

interface Props {
  draft:    InclusionsDraft;
  onChange: (next: InclusionsDraft) => void;
}

export function ServiceInclusionsEditor({ draft, onChange }: Props) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [newLabel,  setNewLabel]  = useState('');

  const updateLabel = (index: number, label: string) => {
    const items = draft.items.map((item, i) => i === index ? { ...item, label } : item);
    onChange({ items });
  };

  const removeItem = (index: number) => {
    onChange({ items: draft.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    onChange({ items: [...draft.items, { id: genId(), label }] });
    setNewLabel('');
    setShowAdd(false);
  };

  const cancelAdd = () => {
    setNewLabel('');
    setShowAdd(false);
  };

  return (
    <div class="cz-tf-form">
      {draft.items.length === 0 && !showAdd && (
        <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
          No inclusions yet. Add one below.
        </p>
      )}

      <div class="cz-ie-list">
        {draft.items.map((item, i) => (
          <div key={item.id} class="cz-ie-row">
            <input
              type="text"
              class="cz-tf-input"
              value={item.label}
              onInput={(e) => updateLabel(i, (e.target as HTMLInputElement).value)}
            />
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={() => removeItem(i)}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div class="cz-tf-inline-add">
          <input
            type="text"
            class="cz-tf-input"
            placeholder="Inclusion label"
            value={newLabel}
            onInput={(e) => setNewLabel((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            autoFocus
          />
          <div class="cz-tf-inline-add__actions">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
              onClick={addItem}
            >
              Add
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={cancelAdd}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" class="cz-tf-add-btn" onClick={() => setShowAdd(true)}>
          + Add inclusion
        </button>
      )}
    </div>
  );
}
