import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { OverviewDraft } from '@/service-station';
import { decodeHtml } from '@/utils/format';

export function initOverviewDraft(service: ServiceItem): OverviewDraft {
  return {
    title:       decodeHtml(service.title),
    excerpt:     service.excerpt  ?? '',
    content:     service.content  ?? '',
    category_id: service.categories[0]?.id ?? null,
  };
}

interface Props {
  draft:                   OverviewDraft;
  onChange:                (patch: Partial<OverviewDraft>) => void;
  categories:              Category[];
  catDescription:          string;
  onCatDescriptionChange:  (val: string) => void;
  onCreateCategory:        (name: string) => Promise<{ category: Category; existing: boolean }>;
  onCategoryCreated?:      (cat: Category) => void;
}

// Short Description (excerpt) is temporarily disabled and hidden from workflow, but retained for future use.
// The field, its data, and the OverviewDraft.excerpt property remain intact.
// It does not participate in completeness, lifecycle state, or notification calculations while hidden.

export function ServiceOverviewEditor({ draft, onChange, categories: initialCategories, catDescription, onCatDescriptionChange, onCreateCategory, onCategoryCreated }: Props) {
  // Local category list starts from the prop; new categories are appended inline
  // without requiring a full catalog refetch during the current drawer session.
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Single inline workflow: the Category selector either renders a <select> (normal)
  // or transforms into a name <input> (adding). The two are mutually exclusive.
  const [isAdding,   setIsAdding]   = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState<string | null>(null);

  const inputRef      = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  const selectedCat = categories.find(c => c.id === draft.category_id);

  // The description editor reveals once a category is selected (normal mode), or
  // once the first character of a new category name is entered (add mode).
  const showDescription = isAdding ? newCatName.trim().length > 0 : !!selectedCat;

  // Auto-focus the inline name input when entering add mode.
  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const enterAddMode = () => {
    setNewCatName('');
    setCreateErr(null);
    onCatDescriptionChange('');   // fresh description for the new category
    setIsAdding(true);
  };

  const exitAddMode = () => {
    setIsAdding(false);
    setNewCatName('');
    setCreateErr(null);
    // Restore the currently selected category's description (add mode cleared it).
    onCatDescriptionChange(selectedCat?.description ?? '');
  };

  // Immediate creation on commit (Enter, or blur when moving to the description).
  // Empty name simply exits add mode without creating anything.
  const commitNewCategory = useCallback(async () => {
    if (committingRef.current) return;
    const name = newCatName.trim();
    if (!name) { setIsAdding(false); setCreateErr(null); return; }
    committingRef.current = true;
    setCreating(true);
    setCreateErr(null);
    try {
      const { category: cat, existing } = await onCreateCategory(name);
      setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat]);
      onCategoryCreated?.(cat);
      // If the name matched an existing category, surface its real description
      // instead of silently overwriting it on Save. New categories keep what was typed.
      if (existing && cat.description) onCatDescriptionChange(cat.description);
      onChange({ category_id: cat.id });
      setIsAdding(false);
      setNewCatName('');
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Failed to create category.');
    } finally {
      setCreating(false);
      committingRef.current = false;
    }
  }, [newCatName, onChange, onCategoryCreated, onCatDescriptionChange, onCreateCategory]);

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{ id: 'cz-service-title', type: 'text', label: 'Title' }}
        value={draft.title}
        onChange={(title) => onChange({ title })}
      />

      <AdminField
        def={{ id: 'cz-service-description', type: 'textarea', label: 'Description' }}
        value={draft.content}
        onChange={(content) => onChange({ content })}
      />

      {/* Category is not an ordinary metadata field: the control transforms
          between a browse select and a create input, commits on Enter or blur,
          cancels on Escape, and can reveal the chosen category's description
          beneath it. It stays a dedicated composite and consumes the shared
          control classes rather than being flattened into a field definition. */}
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-service-category">Category</label>
        {isAdding ? (
          <input
            ref={inputRef}
            id="cz-service-category"
            type="text"
            class="cz-tf-control cz-tf-input"
            placeholder="New category name"
            value={newCatName}
            disabled={creating}
            onInput={(e) => setNewCatName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')       { e.preventDefault(); commitNewCategory(); }
              else if (e.key === 'Escape') { e.preventDefault(); exitAddMode(); }
            }}
            onBlur={commitNewCategory}
          />
        ) : (
          <select
            id="cz-service-category"
            class={`cz-tf-control cz-tf-select${draft.category_id === null ? ' cz-tf-select--unset' : ''}`}
            value={draft.category_id !== null ? String(draft.category_id) : ''}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              if (val === '__add__') { enterAddMode(); return; }
              const id = val ? parseInt(val, 10) : null;
              onCatDescriptionChange(id ? (categories.find(c => c.id === id)?.description ?? '') : '');
              onChange({ category_id: id });
            }}
          >
            <option value="" disabled hidden>Browse categories</option>
            {categories
              .filter((c) => c.id !== null)
              .map((cat) => (
                <option key={cat.slug} value={String(cat.id)}>
                  {decodeHtml(cat.name)}
                </option>
              ))}
            <option value="__add__">+ Add category</option>
          </select>
        )}

        {createErr && <p class="cz-tf-error">{createErr}</p>}

        {showDescription && (
          <textarea
            class="cz-tf-control cz-tf-textarea"
            placeholder="Category description (optional)"
            value={catDescription}
            rows={2}
            style="margin-top: 8px"
            onInput={(e) => onCatDescriptionChange((e.target as HTMLTextAreaElement).value)}
          />
        )}
      </div>
    </div>
  );
}
