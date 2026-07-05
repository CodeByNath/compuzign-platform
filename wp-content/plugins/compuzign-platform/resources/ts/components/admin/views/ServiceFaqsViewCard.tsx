import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ReadBlock } from '../ReadBlock';
import type { FooterAction } from '../ActionFooter';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { Skeleton } from '../ui/Skeleton';

// Shell + footer come from ReadBlock/ActionFooter (S1b); this file owns only
// the Common Questions content (FAQ list, empty copy, loading shimmer).

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
  // The FAQ pool is sourced from the authoritative detail; shimmer the body until
  // it resolves instead of flashing the (possibly stale/empty) handoff list.
  const loading = status === 'loading';

  const actions: FooterAction[] = [
    ...(hasDraft ? [{ id: 'discard-draft', label: 'Discard Draft', onSelect: onDiscard }] : []),
    { id: 'edit', label: 'Edit', onSelect: onEdit },
  ];

  return (
    <ReadBlock
      title="Common Questions"
      subtitle="Add questions and answers for this service."
      icon={MODULE_ICONS.faqs}
      iconVariant="drawerModule__icon--faqs"
      count={loading ? undefined : faqs.length}
      status={status}
      notes={notes}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      actions={actions}
    >
      {loading ? (
        <div class="cz-sc-faq-list">
          <div class="cz-sc-faq-item">
            <p class="cz-sc-faq-item__q"><Skeleton width="60%" /></p>
            <p class="cz-sc-faq-item__a"><Skeleton width="90%" /></p>
          </div>
        </div>
      ) : faqs.length > 0 ? (
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
    </ReadBlock>
  );
}
