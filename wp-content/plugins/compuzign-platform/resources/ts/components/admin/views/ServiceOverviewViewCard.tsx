import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { noteCount } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';

interface ServiceOverviewViewCardProps {
  status:          string;
  notes:           ModuleNote[];
  panelOpen:       boolean;
  onTogglePanel:   () => void;
  displayTitle:    string;
  // Short Description (excerpt) is temporarily disabled and hidden from workflow.
  // The prop is retained so the call site requires no change; the field is not rendered.
  displayExcerpt:  string;
  displayContent:  string;
  displayCategory: string;
  hasDraft:        boolean;
  onEdit:          () => void;
  onDiscard:       () => void;
}

export function ServiceOverviewViewCard({
  status,
  notes,
  panelOpen,
  onTogglePanel,
  displayTitle,
  displayContent,
  displayCategory,
  hasDraft,
  onEdit,
  onDiscard,
}: ServiceOverviewViewCardProps) {
  const statusDimmed = status === 'pending-dim';

  return (
    <div class="cz-module-card">
      <div class="cz-module-card__header">
        <span class="cz-module-card__icon cz-module-card__icon--overview">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="cz-module-card__icon-svg"
            aria-hidden="true"
            focusable="false"
          >
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        </span>
        <div class="cz-module-card__heading">
          <p class="cz-module-card__title">Service Overview</p>
          <p class="cz-module-card__subtitle">General information about your service.</p>
        </div>
        <div class={`cz-module-card__status${statusDimmed ? ' cz-module-card__status--dim' : ''}`}>
          <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel} />
        </div>
      </div>

      {panelOpen && noteCount(notes) > 0 && (
        <ModuleNotificationPanel notes={notes} />
      )}

      <div class="cz-module-card__body">
        <div class="cz-module-card__fields">
          <div class="cz-module-card__field">
            <p class="cz-module-card__label">Title</p>
            <p class="cz-module-card__value">
              {displayTitle || 'New Service'}
            </p>
          </div>
          <div class="cz-module-card__field">
            <p class="cz-module-card__label">Category</p>
            <p class="cz-module-card__value">{displayCategory}</p>
          </div>
          <div class="cz-module-card__field">
            <p class="cz-module-card__label">Description</p>
            <p class={`cz-module-card__value${displayContent ? ' cz-module-card__value--clamp' : ' cz-module-card__value--muted'}`}>
              {displayContent
                ? displayContent
                : displayTitle
                  ? `Enter a description for the ${displayTitle}.`
                  : 'Enter a description for the service.'
              }
            </p>
          </div>
        </div>
      </div>

      <div class="cz-module-card__footer">
        {hasDraft && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onDiscard}>
            Discard Draft
          </button>
        )}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
