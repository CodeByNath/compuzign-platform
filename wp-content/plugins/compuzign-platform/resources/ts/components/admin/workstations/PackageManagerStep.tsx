import { usePackageManager } from '@/hooks/usePackageManager';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { ModuleNotificationPanel } from '@/components/admin/ui/ModuleNotificationPanel';
import { statusDotClass, STATUS_PILL_MAP } from '@/components/admin/utils/moduleStatus';
import {
  evaluateModule,
  packageManagerItemModule,
  packageManagerSummaryModule,
} from '@/components/admin/utils/moduleNotifications';
import type { StepContext } from '../ActionShell';
import type { PackageManagerItem } from '@/api/types/admin';

// ── PackageManagerStep ──────────────────────────────────────────────────────
// Phase B, presentation-corrected: a compact management surface over many
// Service-owned features/common questions, NOT a station drawer. Never
// render an item as a full module/station card (ReadBlock) — that recreates
// a drawer-of-cards inside a transit step, which is exactly the anti-pattern
// this refactor removes. Rows use the same compact table + statusDotClass
// pattern already established for the Package Pricing Summary table
// (ServiceTierStep.tsx's cz-sp-tier-table) — no new CSS system, no new
// status/notification engine.
//
// "State" (existing evaluateModule/packageManagerItemModule resolution —
// Active/Pending/Disabled, unchanged) and "Availability" (a separate,
// stricter, consumer-eligibility fact — settled + active parent + enabled +
// resolving) are deliberately different columns. Availability is never
// inferred from disabled === false alone.

function itemStateLabel(status: string): string {
  return STATUS_PILL_MAP[status]?.label ?? status;
}

// Mirrors PackageManagerSchema.php's buildConsumerProjections gate exactly —
// what would actually be usable by a tier right now. Deliberately separate
// from "State": a settled-but-inactive-parent item still reads State=Active-
// ish/Pending via the module resolver but must read Availability=Not
// available here.
function isAvailable(item: PackageManagerItem, platformStatus: string): boolean {
  return item.module_transition === 'settled'
    && platformStatus === 'active'
    && !item.disabled
    && !item.missing;
}

function availabilityLabel(item: PackageManagerItem, platformStatus: string): string {
  if (item.disabled) return 'Disabled';
  return isAvailable(item, platformStatus) ? 'Available' : 'Not available';
}

// FAQ rows always show the question as the primary column (decorated_label
// is not used to override it); inclusion rows prefer decorated_label, then
// the resolved pool label.
function itemHeadline(item: PackageManagerItem): string {
  if (item.source_type === 'faq') {
    if (!item.resolved) return item.missing ? '(missing source)' : 'Untitled';
    return 'question' in item.resolved ? item.resolved.question : '';
  }
  if (item.decorated_label) return item.decorated_label;
  if (!item.resolved) return item.missing ? '(missing source)' : 'Untitled';
  return 'label' in item.resolved ? item.resolved.label : '';
}

interface RowsTableProps {
  firstColumnLabel: string;   // 'Feature' | 'Question'
  items:            PackageManagerItem[];
  platformStatus:   string;
}

function RowsTable({ firstColumnLabel, items, platformStatus }: RowsTableProps) {
  if (items.length === 0) return null;
  return (
    <div class="cz-sp-tier-table-wrap">
      <table class="cz-sp-tier-table">
        <thead>
          <tr>
            <th>{firstColumnLabel}</th>
            <th class="cz-sp-tier-table__center">Order</th>
            <th>State</th>
            <th>Availability</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = evaluateModule(packageManagerItemModule, item, { platformStatus }).status;
            const notAvailable = availabilityLabel(item, platformStatus) === 'Not available';
            return (
              <tr key={item.item_id}>
                <td class="cz-sp-tier-table__name">
                  <div class="cz-sp-tier-table__name-inner">
                    <span>{itemHeadline(item)}</span>
                  </div>
                  {item.source_type === 'faq' && item.resolved && 'answer' in item.resolved && item.resolved.answer && (
                    <p class="cz-sp-tier-table__muted">{item.resolved.answer}</p>
                  )}
                </td>
                <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">{item.sort_order}</td>
                <td>
                  <div class="cz-sp-tier-table__name-inner">
                    <span class={`cz-admin-status-dot ${statusDotClass(status)}`} />
                    <span>{itemStateLabel(status)}</span>
                  </div>
                </td>
                <td class={notAvailable ? 'cz-sp-tier-table__muted' : undefined}>
                  {availabilityLabel(item, platformStatus)}
                </td>
                <td class={item.missing ? undefined : 'cz-sp-tier-table__muted'}>
                  {item.missing ? 'Missing' : 'Connected'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PackageManagerStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const mgr = usePackageManager(serviceId);

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

  const featureCount   = items.filter((i) => i.source_type === 'inclusion').length;
  const questionCount  = items.filter((i) => i.source_type === 'faq').length;
  const availableCount = items.filter((i) => isAvailable(i, platformStatus)).length;

  function renderGroup(groupId: string | null, label: string) {
    const groupItems = byGroup.get(groupId) ?? [];
    if (groupItems.length === 0) return null;
    const features  = groupItems.filter((i) => i.source_type === 'inclusion');
    const questions = groupItems.filter((i) => i.source_type === 'faq');
    return (
      <div class="cz-shell-section" key={groupId ?? '__ungrouped__'}>
        <p class="cz-shell-section__title">{label}</p>
        {features.length > 0 && (
          <>
            <p class="cz-shell-section__title">Features</p>
            <RowsTable firstColumnLabel="Feature" items={features} platformStatus={platformStatus} />
          </>
        )}
        {questions.length > 0 && (
          <>
            <p class="cz-shell-section__title">Common Questions</p>
            <RowsTable firstColumnLabel="Question" items={questions} platformStatus={platformStatus} />
          </>
        )}
      </div>
    );
  }

  return (
    <div class="cz-req-detail">
      {/* Lightweight manager heading — deliberately not a ReadBlock/module
          card (see the presentation audit: many-children surfaces use
          compact rows, not a station-shaped summary). */}
      <div class="cz-shell-section cz-shell-section--no-border">
        <p class="cz-shell-section__title">Package Manager</p>
        <div class="cz-sp-tier-table__name-inner">
          <span class={`cz-admin-status-dot ${statusDotClass(summary.status)}`} />
          <span>{itemStateLabel(summary.status)}</span>
        </div>
        <p class="cz-sp-tier-table__muted">
          {featureCount} feature{featureCount === 1 ? '' : 's'} · {questionCount} common question{questionCount === 1 ? '' : 's'} · {availableCount} available
        </p>
        {summary.notes.length > 0 && <ModuleNotificationPanel notes={summary.notes} />}
      </div>

      {orderedGroups.map((group) => renderGroup(group.group_id, group.label))}
      {renderGroup(null, 'Ungrouped')}
    </div>
  );
}
