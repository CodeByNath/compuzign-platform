import { useState, useCallback } from 'preact/hooks';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import { createServiceCategory } from '@/api/endpoints/admin';

function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

export interface OverviewDraft {
  title: string;
  excerpt: string;
  content: string;
  category_id: number | null;
}

export function initOverviewDraft(service: ServiceItem): OverviewDraft {
  return {
    title:       decodeHtml(service.title),
    excerpt:     service.excerpt  ?? '',
    content:     service.content  ?? '',
    category_id: service.categories[0]?.id ?? null,
  };
}

interface Props {
  draft:               OverviewDraft;
  onChange:            (patch: Partial<OverviewDraft>) => void;
  categories:          Category[];
  onCategoryCreated?:  (cat: Category) => void;
}

// Short Description (excerpt) is temporarily disabled and hidden from workflow, but retained for future use.
// The field, its data, and the OverviewDraft.excerpt property remain intact.
// It does not participate in completeness, lifecycle state, or notification calculations while hidden.

export function ServiceOverviewEditor({ draft, onChange, categories: initialCategories, onCategoryCreated }: Props) {
  // Local category list starts from the prop; new categories are appended inline
  // without requiring a full catalog refetch during the current drawer session.
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [addOpen,    setAddOpen]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newDesc,    setNewDesc]    = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState<string | null>(null);

  const selectedCat = categories.find(c => c.id === draft.category_id);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) { setCreateErr('Name is required.'); return; }
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await createServiceCategory({ name: newName.trim(), description: newDesc.trim() });
      if (res.success && res.category) {
        const cat: Category = { id: res.category.id, name: res.category.name, slug: res.category.slug, description: res.category.description };
        setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat]);
        onCategoryCreated?.(cat);
        onChange({ category_id: cat.id });
        setAddOpen(false);
        setNewName('');
        setNewDesc('');
      } else {
        setCreateErr(res.message ?? 'Failed to create category.');
      }
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Failed to create category.');
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, onChange, onCategoryCreated]);

  const cancelAdd = () => { setAddOpen(false); setNewName(''); setNewDesc(''); setCreateErr(null); };

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Title</label>
        <input
          type="text"
          class="cz-tf-input"
          value={draft.title}
          onInput={(e) => onChange({ title: (e.target as HTMLInputElement).value })}
        />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea
          class="cz-tf-textarea"
          value={draft.content}
          onInput={(e) => onChange({ content: (e.target as HTMLTextAreaElement).value })}
        />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Category</label>
        <select
          class={`cz-tf-select${draft.category_id === null ? ' cz-tf-select--unset' : ''}`}
          value={draft.category_id !== null ? String(draft.category_id) : ''}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            onChange({ category_id: val ? parseInt(val, 10) : null });
          }}
        >
          <option value="">Select Category</option>
          {categories
            .filter((c) => c.id !== null)
            .map((cat) => (
              <option key={cat.slug} value={String(cat.id)}>
                {decodeHtml(cat.name)}
              </option>
            ))}
        </select>

        <p style="margin: 4px 0 0; font-size: var(--admin-fs-s-label); color: var(--admin-text-faint); line-height: var(--admin-lh-s-label)">
          {selectedCat?.description || 'Description optional'}
        </p>

        {/* Inline category creation */}
        {!addOpen ? (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
            style="margin-top: 6px"
            onClick={() => setAddOpen(true)}
          >
            Add category
          </button>
        ) : (
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: var(--cz-space-2); padding: var(--cz-space-3); background: var(--admin-accent-a12); border-radius: var(--admin-radius)">
            <input
              type="text"
              class="cz-tf-input"
              placeholder="Category name"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            />
            <textarea
              class="cz-tf-textarea"
              placeholder="Description (optional)"
              value={newDesc}
              rows={2}
              onInput={(e) => setNewDesc((e.target as HTMLTextAreaElement).value)}
            />
            {createErr && (
              <p style="margin: 0; font-size: var(--admin-fs-s-label); color: var(--admin-error)">
                {createErr}
              </p>
            )}
            <div style="display: flex; gap: var(--cz-space-2)">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={cancelAdd}
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
