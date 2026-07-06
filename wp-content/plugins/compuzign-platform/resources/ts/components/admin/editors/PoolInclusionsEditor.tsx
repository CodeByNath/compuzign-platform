import { useState } from 'preact/hooks';
import type { InclusionItem } from '@/api/types/admin';

// Pool-referencing Included Features editor (extracted from ServiceTierStep /
// ServicePromotionStep in S3a — the two steps carried byte-identical copies).
// The draft is an ordered list of canonical pool items; "+ Create new" is an
// immediate canonical pool creation (separate request from the module draft
// save) whose result is appended into the open draft, exactly as if it had
// been picked from "Add from pool…". The add-form state lives here; the
// draft and the create action stay with the owning step / station hook.

interface Props {
  draft:    InclusionItem[];
  onChange: (next: InclusionItem[]) => void;
  pool:     InclusionItem[];
  onCreate: (label: string) => Promise<InclusionItem | null>;
}

export function PoolInclusionsEditor({ draft, onChange, pool, onCreate }: Props) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await onCreate(label);
      if (!item) { setCreateErr('Failed to create feature.'); return; }
      if (!draft.find(i => i.id === item.id)) onChange([...draft, item]);
      setNewLabel('');
      setShowAdd(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAdd = () => {
    setShowAdd(false);
    setNewLabel('');
    setCreateErr(null);
  };

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Inclusions</label>
        {draft.length > 0 && (
          <div class="cz-ie-list">
            {draft.map((inc) => (
              <div key={inc.id} class="cz-ie-row">
                <input type="text" class="cz-tf-input" value={inc.label} readOnly />
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  aria-label="Remove"
                  onClick={() => onChange(draft.filter(i => i.id !== inc.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {pool.length > 0 && (
          <select class="cz-tf-select" value=""
            onChange={(e) => {
              const sel = e.target as HTMLSelectElement;
              const id = sel.value;
              if (!id) return;
              const inc = pool.find(i => i.id === id);
              if (inc && !draft.find(i => i.id === id)) onChange([...draft, inc]);
              sel.value = '';
            }}>
            <option value="">Add from pool…</option>
            {pool.filter(i => !draft.find(s => s.id === i.id)).map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        )}
        {showAdd ? (
          <div class="cz-tf-inline-add">
            <input type="text" class="cz-tf-input" placeholder="New feature label"
              value={newLabel}
              onInput={(e) => setNewLabel((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              autoFocus />
            <div class="cz-tf-inline-add__actions">
              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                onClick={handleCreate} disabled={creating}>
                {creating ? '…' : 'Create'}
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={cancelAdd} disabled={creating}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" class="cz-tf-add-btn" onClick={() => setShowAdd(true)}>
            + Create new feature
          </button>
        )}
        {createErr && <p class="cz-admin-error-msg">{createErr}</p>}
      </div>
    </div>
  );
}
