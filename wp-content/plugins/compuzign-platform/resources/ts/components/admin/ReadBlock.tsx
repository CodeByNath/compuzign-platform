import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  count?: number;
  onEdit?: () => void;
  editDisabled?: boolean;
  noBorder?: boolean;
  children: ComponentChildren;
}

export function ReadBlock({ title, count, onEdit, editDisabled, noBorder, children }: Props) {
  return (
    <div class={`cz-req-detail__section${noBorder ? ' cz-sv-section--no-border' : ''}`}>
      <p class="cz-req-detail__section-title">
        {title}
        {count != null && count > 0 && (
          <span class="cz-req-detail__section-count">{count}</span>
        )}
      </p>
      <div class="cz-sv-overview-block">
        {onEdit && (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit"
            onClick={onEdit}
            disabled={editDisabled}
          >
            ✎ Edit
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
