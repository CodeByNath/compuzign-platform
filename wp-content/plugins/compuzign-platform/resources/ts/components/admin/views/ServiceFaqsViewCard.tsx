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
    <div class="drawerModule">
      <div class="drawerModule__header">
        <span class="drawerModule__icon drawerModule__icon--faqs">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="drawerModule__icon-svg"
            aria-hidden="true"
            focusable="false"
          >
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        </span>
        <div class="drawerModule__heading">
          <p class="drawerModule__title">
            Common Questions
            {faqs.length > 0 && (
              <span class="drawerModule__count">{faqs.length}</span>
            )}
          </p>
          <p class="drawerModule__subtitle">Add questions and answers for this service.</p>
        </div>
        <div class={`drawerModule__status${statusDimmed ? ' drawerModule__status--dim' : ''}`}>
          <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel} />
        </div>
      </div>

      {panelOpen && noteCount(notes) > 0 && (
        <ModuleNotificationPanel notes={notes} />
      )}

      <div class="drawerModule__body">
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
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">No questions added</p>
            <p class="drawerModule__empty-copy">
              {serviceTitle
                ? `Add common questions for the ${serviceTitle}.`
                : 'Add common questions for this service.'
              }
            </p>
          </div>
        )}
      </div>

      <div class="drawerModule__footer">
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
