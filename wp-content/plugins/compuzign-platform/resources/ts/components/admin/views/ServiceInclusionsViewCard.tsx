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
        <span class="cz-module-card__icon cz-module-card__icon--features">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="cz-module-card__icon-svg"
            aria-hidden="true"
            focusable="false"
          >
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </span>
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
