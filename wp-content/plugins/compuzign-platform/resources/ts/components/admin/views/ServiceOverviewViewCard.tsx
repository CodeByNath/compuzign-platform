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
  displayExcerpt:  string;
  displayContent:  string;
  displayCategory: string;
  isPending:       boolean;
  onEdit:          () => void;
  onRevert:        () => void;
}

export function ServiceOverviewViewCard({
  status,
  notes,
  panelOpen,
  onTogglePanel,
  displayTitle,
  displayExcerpt,
  displayContent,
  displayCategory,
  isPending,
  onEdit,
  onRevert,
}: ServiceOverviewViewCardProps) {
  return (
    <div class="cz-req-detail__section cz-sv-section--no-border">
      <div class="cz-sv-module">
        <div class="cz-sv-module-header">
          <p class="cz-req-detail__section-title">Service Overview</p>
          <div>
            <span
              class="cz-sv-overview-block__status"
              style={status === 'pending-dim' ? 'opacity:0.45' : undefined}
            >
              <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel} />
            </span>
          </div>
        </div>
        {panelOpen && noteCount(notes) > 0 && (
          <ModuleNotificationPanel notes={notes} />
        )}
        <div class="cz-sv-module-body">
          <div class="cz-sv-overview-block__meta">
            <span class="cz-req-contact-grid__label">Title</span>
            <p class="cz-sv-overview-block__value">
              {displayTitle || 'New Service'}
            </p>
          </div>
          <div class="cz-sv-overview-block__meta">
            <span class="cz-req-contact-grid__label">Short Description</span>
            <p class="cz-sv-overview-block__value">
              {displayExcerpt
                ? displayExcerpt
                : displayTitle
                  ? `Enter a short description for the ${displayTitle}.`
                  : 'Enter a short description for this service.'
              }
            </p>
          </div>
          <div class="cz-sv-overview-block__meta">
            <span class="cz-req-contact-grid__label">Category</span>
            <span class="cz-sv-overview-block__value">{displayCategory}</span>
          </div>
          <div class="cz-sv-overview-block__meta">
            <span class="cz-req-contact-grid__label">Description</span>
            <p class="cz-sv-overview-block__desc">
              {displayContent
                ? displayContent
                : displayTitle
                  ? `Enter a description for the ${displayTitle}.`
                  : 'Enter a description for the service.'
              }
            </p>
          </div>
        </div>
        <div class="cz-sv-module-footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onEdit}>
            ✎ Edit
          </button>
          {isPending && (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onRevert}>
              Revert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
