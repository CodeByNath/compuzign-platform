import { useState } from 'preact/hooks';
import type { ServiceItem } from '@/api/types/cost-builder';

export interface FaqDraftItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqsDraft {
  items: FaqDraftItem[];
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function initFaqsDraft(service: ServiceItem): FaqsDraft {
  return {
    items: service.faqs.map((faq) => ({
      id:       faq.id,
      question: faq.question,
      answer:   faq.answer,
    })),
  };
}

interface Props {
  draft:    FaqsDraft;
  onChange: (next: FaqsDraft) => void;
}

export function ServiceFaqsEditor({ draft, onChange }: Props) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [newQ,     setNewQ]     = useState('');
  const [newA,     setNewA]     = useState('');

  const updateItem = (index: number, patch: Partial<FaqDraftItem>) => {
    const items = draft.items.map((item, i) => i === index ? { ...item, ...patch } : item);
    onChange({ items });
  };

  const removeItem = (index: number) => {
    onChange({ items: draft.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    const question = newQ.trim();
    if (!question) return;
    onChange({ items: [...draft.items, { id: genId(), question, answer: newA.trim() }] });
    setNewQ('');
    setNewA('');
    setShowAdd(false);
  };

  const cancelAdd = () => {
    setNewQ('');
    setNewA('');
    setShowAdd(false);
  };

  return (
    <div class="cz-tf-form">
      {draft.items.length === 0 && !showAdd && (
        <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
          No FAQs yet. Add one below.
        </p>
      )}

      {draft.items.map((item, i) => (
        <div key={item.id} class="cz-ie-faq-item">
          <div class="cz-ie-faq-item__header">
            <span class="cz-tf-label">FAQ {i + 1}</span>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={() => removeItem(i)}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
          <div class="cz-tf-field">
            <input
              type="text"
              class="cz-tf-input"
              placeholder="Question"
              value={item.question}
              onInput={(e) => updateItem(i, { question: (e.target as HTMLInputElement).value })}
            />
          </div>
          <div class="cz-tf-field">
            <textarea
              class="cz-tf-textarea cz-tf-textarea--tall"
              placeholder="Answer"
              value={item.answer}
              onInput={(e) => updateItem(i, { answer: (e.target as HTMLTextAreaElement).value })}
            />
          </div>
        </div>
      ))}

      {showAdd ? (
        <div class="cz-tf-inline-add">
          <input
            type="text"
            class="cz-tf-input"
            placeholder="Question"
            value={newQ}
            onInput={(e) => setNewQ((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <textarea
            class="cz-tf-textarea"
            placeholder="Answer (optional)"
            value={newA}
            onInput={(e) => setNewA((e.target as HTMLTextAreaElement).value)}
            rows={3}
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
          + Add FAQ
        </button>
      )}
    </div>
  );
}
