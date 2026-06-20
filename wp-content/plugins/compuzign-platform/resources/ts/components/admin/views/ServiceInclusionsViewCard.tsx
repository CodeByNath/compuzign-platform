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
  hasDraft:      boolean;
  onEdit:        () => void;
  onDiscard:     () => void;
}

export function ServiceInclusionsViewCard({
  status,
  notes,
  panelOpen,
  onTogglePanel,
  inclusions,
  serviceTitle,
  hasDraft,
  onEdit,
  onDiscard,
}: ServiceInclusionsViewCardProps) {
  const statusDimmed = status === 'pending-dim';

  return (
    <div class="cz-module-card">
      <div class="cz-module-card__header">
        <div class="cz-module-card__icon">◆</div>
        <div class="cz-module-card__heading">
          <p class="cz-module-card__title">
            Included Features
            {inclusions.length > 0 && (
              <span class="cz-module-card__count">{inclusions.length}</span>
            )}
          </p>
          <p class="cz-module-card__subtitle">Add and manage the features included in this service.</p>
        </div>
        <div class={`cz-module-card__status${statusDimmed ? ' cz-module-card__status--dim' : ''}`}>
          <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel} />
        </div>
      </div>

      {panelOpen && noteCount(notes) > 0 && (
        <ModuleNotificationPanel notes={notes} />
      )}

      <div class="cz-module-card__body">
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
          <div class="cz-module-card__empty">
            <p class="cz-module-card__empty-title">No features</p>
            <p class="cz-module-card__empty-copy">
              {serviceTitle
                ? `Add features to the ${serviceTitle}.`
                : 'Add features to this service.'
              }
            </p>
          </div>
        )}
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
