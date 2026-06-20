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
  return (
    <div class="cz-req-detail__section">
      <div class="cz-sv-module">
        <div class={`cz-sv-module-header${faqs.length > 0 ? ' cz-sv-module-header--no-border' : ''}`}>
          <p class="cz-req-detail__section-title">
            Common Questions
            {faqs.length > 0 && (
              <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                {faqs.length}
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
            <div class="cz-sv-overview-block__identity">
              <p class="cz-sv-overview-block__name">No questions added</p>
              <p class="cz-sv-overview-block__excerpt">
                {serviceTitle
                  ? `Add common questions for the ${serviceTitle}.`
                  : 'Add common questions for this service.'
                }
              </p>
            </div>
          )}
        </div>
        <div class="cz-sv-module-footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onEdit}>
            ✎ Edit
          </button>
          {hasDraft && (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onDiscard}>
              Discard Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
