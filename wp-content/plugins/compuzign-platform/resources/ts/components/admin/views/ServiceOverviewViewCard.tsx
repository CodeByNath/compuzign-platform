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
        <div class="cz-module-card__icon">◈</div>
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
            <p class={`cz-module-card__value${!displayContent ? ' cz-module-card__value--muted' : ''}`}>
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
