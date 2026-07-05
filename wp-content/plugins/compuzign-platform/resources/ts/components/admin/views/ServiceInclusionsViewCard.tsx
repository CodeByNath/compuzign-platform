import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ReadBlock } from '../ReadBlock';
import type { FooterAction } from '../ActionFooter';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { Skeleton } from '../ui/Skeleton';

// Shell + footer come from ReadBlock/ActionFooter (S1b); this file owns only
// the Included Features content (chip pool, empty copy, loading shimmer).

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
  // The feature pool is sourced from the authoritative detail; shimmer the body
  // until it resolves instead of flashing the (possibly stale/empty) handoff list.
  const loading = status === 'loading';

  const actions: FooterAction[] = [
    ...(hasDraft ? [{ id: 'discard-draft', label: 'Discard Draft', onSelect: onDiscard }] : []),
    { id: 'edit', label: 'Edit', onSelect: onEdit },
  ];

  return (
    <ReadBlock
      title="Included Features"
      subtitle="Add and manage the features included in this service."
      icon={MODULE_ICONS.features}
      iconVariant="drawerModule__icon--features"
      count={loading ? undefined : inclusions.length}
      status={status}
      notes={notes}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      actions={actions}
    >
      {loading ? (
        <div class="cz-sc-inclusion-pool">
          <Skeleton width="96px" height="26px" />
          <Skeleton width="120px" height="26px" />
          <Skeleton width="80px" height="26px" />
        </div>
      ) : inclusions.length > 0 ? (
        <div class="cz-sc-inclusion-pool">
          {inclusions.map((inc) => (
            <span key={inc.id} class="cz-tf-chip">
              {inc.label}
            </span>
          ))}
        </div>
      ) : (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">No features</p>
          <p class="drawerModule__empty-copy">
            {serviceTitle
              ? `Add features to the ${serviceTitle}.`
              : 'Add features to this service.'
            }
          </p>
        </div>
      )}
    </ReadBlock>
  );
}
