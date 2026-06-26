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
      <div class="drawerModule">
        <div class="drawerModule__header">
          <div class="drawerModule__heading">
            <p class="drawerModule__title">
              {title}
              {count != null && count > 0 && (
                <span class="drawerModule__count">{count}</span>
              )}
            </p>
          </div>
        </div>
        <div class="drawerModule__body">
          {children}
        </div>
        {onEdit && (
          <div class="drawerModule__footer">
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
