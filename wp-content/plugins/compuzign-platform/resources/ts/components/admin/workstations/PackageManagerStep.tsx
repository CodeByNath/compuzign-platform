import { useState } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import { usePackageManager } from '@/hooks/usePackageManager';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { ReadBlock } from '../ReadBlock';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import {
  evaluateModule,
  packageManagerItemModule,
  packageManagerSummaryModule,
} from '@/components/admin/utils/moduleNotifications';
import type { PackageManagerItem } from '@/api/types/admin';

// ── PackageManagerStep ──────────────────────────────────────────────────────
// Phase B: read-only transit surface. A bespoke ActionShell step (ActionStep
// is an arbitrary component — no EntityDrawer/DrawerTabs contract), opened
// from the Package transit drawer's Connections tab via ctx.close() +
// doOpen() (handleOpenPackageManager, ServiceTierStep.tsx) — the same
// mechanism ServiceTierStep/ServicePromotionStep already use one level up.
// Not a top-level workstation, not inline inside ServiceTierStep's JSX, not
// an editor. No footer, no save, no dirty state — Phase D adds edit/publish.
//
// Presentation status comes entirely from the existing engine
// (evaluateModule + packageManagerItemModule/packageManagerSummaryModule);
// this file computes none of it itself.

function sourceHeadline(item: PackageManagerItem): string {
  if (item.decorated_label) return item.decorated_label;
  if (!item.resolved) return item.missing ? '(missing source)' : 'Untitled';
  return 'label' in item.resolved ? item.resolved.label : item.resolved.question;
}

interface ItemCardProps {
  item:           PackageManagerItem;
  platformStatus: string;
  openId:         string | null;
  setOpenId:      (id: string | null) => void;
}

function ItemCard({ item, platformStatus, openId, setOpenId }: ItemCardProps) {
  const evaluated = evaluateModule(packageManagerItemModule, item, { platformStatus });
  return (
    <ReadBlock
      title={sourceHeadline(item)}
      subtitle={item.source_type === 'inclusion' ? 'Feature' : 'Common question'}
      scopeClass="drawerOverview"
      status={evaluated.status}
      notes={evaluated.notes}
      panelOpen={openId === item.item_id}
      onTogglePanel={() => setOpenId(openId === item.item_id ? null : item.item_id)}
    >
      <div class="drawerModule__fields">
        {item.resolved && 'question' in item.resolved && (
          <div class="drawerModule__field">
            <p class="drawerModule__label">Answer</p>
            <p class="drawerModule__value">{item.resolved.answer}</p>
          </div>
        )}
        <div class="drawerModule__field">
          <p class="drawerModule__label">Availability</p>
          <p class="drawerModule__value">{item.disabled ? 'Disabled' : 'Enabled'}</p>
        </div>
      </div>
    </ReadBlock>
  );
}

export function PackageManagerStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const mgr = usePackageManager(serviceId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (mgr.loading) {
    return <AsyncLoading label="Loading Package Manager…" />;
  }
  if (mgr.error || !mgr.readModel) {
    return <AsyncError error={mgr.error ?? 'Could not load the Package Manager.'} onRetry={mgr.refetch} />;
  }

  const { groups, items, platform_status: platformStatus } = mgr.readModel;
  const summary = evaluateModule(packageManagerSummaryModule, items, { platformStatus });

  const orderedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const byGroup = new Map<string | null, PackageManagerItem[]>();
  for (const item of items) {
    const key  = item.group_id;
    const list = byGroup.get(key) ?? [];
    list.push(item);
    byGroup.set(key, list);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  const ungrouped = byGroup.get(null) ?? [];

  return (
    <div class="cz-req-detail">
      <ReadBlock
        title="Package Manager"
        subtitle="Grouping, ordering, and availability for this package's children."
        icon={MODULE_ICONS.package}
        status={summary.status}
        notes={summary.notes}
        panelOpen={openId === '__summary__'}
        onTogglePanel={() => setOpenId(openId === '__summary__' ? null : '__summary__')}
      >
        <p class="drawerModule__value">{items.length} item{items.length === 1 ? '' : 's'}</p>
      </ReadBlock>

      {orderedGroups.map((group) => {
        const groupItems = byGroup.get(group.group_id) ?? [];
        if (groupItems.length === 0) return null;
        return (
          <div class="cz-shell-section" key={group.group_id}>
            <p class="cz-shell-section__title">{group.label}</p>
            {groupItems.map((item) => (
              <ItemCard key={item.item_id} item={item} platformStatus={platformStatus} openId={openId} setOpenId={setOpenId} />
            ))}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div class="cz-shell-section cz-shell-section--no-border">
          <p class="cz-shell-section__title">Ungrouped</p>
          {ungrouped.map((item) => (
            <ItemCard key={item.item_id} item={item} platformStatus={platformStatus} openId={openId} setOpenId={setOpenId} />
          ))}
        </div>
      )}
    </div>
  );
}
