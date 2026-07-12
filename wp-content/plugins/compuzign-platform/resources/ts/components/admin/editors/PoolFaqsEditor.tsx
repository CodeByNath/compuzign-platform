import { useState } from 'preact/hooks';

// Pool-referencing Common Questions editor (extracted from ServiceTierStep /
// the shared station editors.
// The draft is an ordered list of canonical pool ids; "+ Create new" is an
// immediate canonical pool creation whose result is appended into the open
// draft. The add-form state lives here; the draft and the create action stay
// with the owning step / station hook.

export interface FaqPoolItem {
  id:       string;
  question: string;
  answer?:  string;
}

interface Props {
  draft:    string[];
  onChange: (next: string[]) => void;
  pool:     FaqPoolItem[];
  onCreate: (question: string, answer: string) => Promise<FaqPoolItem | null>;
}

export function PoolFaqsEditor({ draft, onChange, pool, onCreate }: Props) {
  const [showAdd,     setShowAdd]     = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer,   setNewAnswer]   = useState('');
  const [creating,    setCreating]    = useState(false);
  const [createErr,   setCreateErr]   = useState<string | null>(null);

  const handleCreate = async () => {
    const question = newQuestion.trim();
    if (!question) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await onCreate(question, newAnswer.trim());
      if (!item) { setCreateErr('Failed to create question.'); return; }
      if (!draft.includes(item.id)) onChange([...draft, item.id]);
      setNewQuestion('');
      setNewAnswer('');
      setShowAdd(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAdd = () => {
    setShowAdd(false);
    setNewQuestion('');
    setNewAnswer('');
    setCreateErr(null);
  };

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">FAQs</label>
        {draft.length > 0 && (
          <div class="cz-ie-list">
            {draft.map(ref => {
              const faq = pool.find(f => f.id === ref);
              return (
                <div key={ref} class="cz-ie-row">
                  <input type="text" class="cz-tf-input" value={faq?.question ?? ref} readOnly />
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                    aria-label="Remove"
                    onClick={() => onChange(draft.filter(x => x !== ref))}>✕</button>
                </div>
              );
            })}
          </div>
        )}
        {pool.length > 0 && (
          <select class="cz-tf-select" value=""
            onChange={(e) => {
              const sel = e.target as HTMLSelectElement;
              const id = sel.value;
              if (!id) return;
              if (!draft.includes(id)) onChange([...draft, id]);
              sel.value = '';
            }}>
            <option value="">Add FAQ from pool…</option>
            {pool.filter(f => !draft.includes(f.id)).map(f => (
              <option key={f.id} value={f.id}>{f.question}</option>
            ))}
          </select>
        )}
        {showAdd ? (
          <div class="cz-tf-inline-add">
            <input type="text" class="cz-tf-input" placeholder="Question"
              value={newQuestion}
              onInput={(e) => setNewQuestion((e.target as HTMLInputElement).value)}
              autoFocus />
            <textarea class="cz-tf-textarea" placeholder="Answer (optional)"
              value={newAnswer}
              onInput={(e) => setNewAnswer((e.target as HTMLTextAreaElement).value)}
              rows={3} />
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
            + Create new question
          </button>
        )}
        {createErr && <p class="cz-admin-error-msg">{createErr}</p>}
      </div>
    </div>
  );
}
