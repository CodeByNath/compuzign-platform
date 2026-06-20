import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { noteCount } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';

interface ServiceInclusionsViewCardProps {
  status:        string;
  notes:         ModuleNote[];
  panelOpen:     boolean;
  onTogglePanel: () => void;
  inclusions:    Array<{ id: string; label: string }>;
  serviceTitle:  string;
  isPending:     boolean;
  onEdit:        () => void;
  onRevert:      () => void;
}

export function ServiceInclusionsViewCard({
  status,
  notes,
  panelOpen,
  onTogglePanel,
  inclusions,
  serviceTitle,
  isPending,
  onEdit,
  onRevert,
}: ServiceInclusionsViewCardProps) {
  return (
    <div class="cz-req-detail__section cz-sv-section--no-border">
      <div class="cz-sv-module">
        <div class={`cz-sv-module-header${inclusions.length > 0 ? ' cz-sv-module-header--no-border' : ''}`}>
          <p class="cz-req-detail__section-title">
            Included Features
            {inclusions.length > 0 && (
              <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                {inclusions.length}
              </span>
            )}
          </p>
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
          {inclusions.length > 0 ? (
            <div class="cz-sc-inclusion-pool">
              {inclusions.map((inc) => (
                <span key={inc.id} class="cz-tf-chip">
                  {inc.label}
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit" onClick={onEdit}>
                    ✎
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div class="cz-sv-overview-block__identity">
              <p class="cz-sv-overview-block__name">No features</p>
              <p class="cz-sv-overview-block__excerpt">
                {serviceTitle
                  ? `Add features to the ${serviceTitle}.`
                  : 'Add features to this service.'
                }
              </p>
            </div>
          )}
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
