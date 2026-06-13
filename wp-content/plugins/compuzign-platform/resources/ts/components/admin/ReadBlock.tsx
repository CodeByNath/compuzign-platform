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
      <div class="cz-sv-module">
        <div class="cz-sv-module-header cz-sv-module-header--no-border">
          <p class="cz-req-detail__section-title">
            {title}
            {count != null && count > 0 && (
              <span class="cz-req-detail__section-count">{count}</span>
            )}
          </p>
        </div>
        <div class="cz-sv-module-body">
          {children}
        </div>
        {onEdit && (
          <div class="cz-sv-module-footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={onEdit}
              disabled={editDisabled}
            >
              ✎ Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
