import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { noteCount } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';

interface ServiceFaqsViewCardProps {
  status:        string;
  notes:         ModuleNote[];
  panelOpen:     boolean;
  onTogglePanel: () => void;
  faqs:          Array<{ id: string; question: string; answer: string }>;
  serviceTitle:  string;
  hasDraft:      boolean;
  onEdit:        () => void;
  onDiscard:     () => void;
}

export function ServiceFaqsViewCard({
  status,
  notes,
  panelOpen,
  onTogglePanel,
  faqs,
  serviceTitle,
  hasDraft,
  onEdit,
  onDiscard,
}: ServiceFaqsViewCardProps) {
  const statusDimmed = status === 'pending-dim';

  return (
    <div class="cz-module-card">
      <div class="cz-module-card__header">
        <div class="cz-module-card__icon">◌</div>
        <div class="cz-module-card__heading">
          <p class="cz-module-card__title">
            Common Questions
            {faqs.length > 0 && (
              <span class="cz-module-card__count">{faqs.length}</span>
            )}
          </p>
          <p class="cz-module-card__subtitle">Add questions and answers for this service.</p>
        </div>
        <div class={`cz-module-card__status${statusDimmed ? ' cz-module-card__status--dim' : ''}`}>
          <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel} />
        </div>
      </div>

      {panelOpen && noteCount(notes) > 0 && (
        <ModuleNotificationPanel notes={notes} />
      )}

      <div class="cz-module-card__body">
        {faqs.length > 0 ? (
          <div class="cz-sc-faq-list">
            {faqs.map((faq) => (
              <div key={faq.id} class="cz-sc-faq-item">
                <p class="cz-sc-faq-item__q">
                  {faq.question.trim() || 'No Question Added'}
                </p>
                <p class="cz-sc-faq-item__a">
                  {faq.answer?.trim() || 'No Answer Added'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div class="cz-module-card__empty">
            <p class="cz-module-card__empty-title">No questions added</p>
            <p class="cz-module-card__empty-copy">
              {serviceTitle
                ? `Add common questions for the ${serviceTitle}.`
                : 'Add common questions for this service.'
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
