import type { ComponentChildren } from 'preact';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from './ui/ModuleStatusPill';
import { ModuleNotificationPanel } from './ui/ModuleNotificationPanel';

interface Props {
  title: string;
  count?: number;
  onEdit?: () => void;
  editDisabled?: boolean;
  noBorder?: boolean;
  // Optional module lifecycle. When `status` is supplied the canonical
  // ModuleStatusPill renders in the header and, when opened, the
  // ModuleNotificationPanel renders between header and body — the same
  // structure every drawerModule uses. Omit all of these for a plain read card.
  status?: string;
  notes?: ModuleNote[];
  panelOpen?: boolean;
  onTogglePanel?: () => void;
  children: ComponentChildren;
}

export function ReadBlock({
  title, count, onEdit, editDisabled, noBorder,
  status, notes, panelOpen, onTogglePanel, children,
}: Props) {
  const moduleNotes = notes ?? [];
  const showPanel   = !!status && panelOpen === true && moduleNotes.length > 0;

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
          {status && (
            <div class={`drawerModule__status${status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
              <ModuleStatusPill
                status={status}
                notes={moduleNotes}
                onOpen={onTogglePanel}
              />
            </div>
          )}
        </div>
        {showPanel && <ModuleNotificationPanel notes={moduleNotes} />}
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
