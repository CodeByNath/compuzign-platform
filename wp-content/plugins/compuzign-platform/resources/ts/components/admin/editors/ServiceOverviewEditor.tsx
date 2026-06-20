import type { Category, ServiceItem } from '@/api/types/cost-builder';

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
  draft:      OverviewDraft;
  onChange:   (patch: Partial<OverviewDraft>) => void;
  categories: Category[];
}

// Short Description (excerpt) is temporarily disabled and hidden from workflow, but retained for future use.
// The field, its data, and the OverviewDraft.excerpt property remain intact.
// It does not participate in completeness, lifecycle state, or notification calculations while hidden.

export function ServiceOverviewEditor({ draft, onChange, categories }: Props) {
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
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea
          class="cz-tf-textarea cz-tf-textarea--tall"
          value={draft.content}
          onInput={(e) => onChange({ content: (e.target as HTMLTextAreaElement).value })}
        />
      </div>
    </div>
  );
}
