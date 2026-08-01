// Temporary one-time migration notice. Remove after live assignment completes.
import { useEffect, useState } from 'preact/hooks';
import { apiClient } from '@/api/client';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications/shared';
import { Button } from '@/components/ui/Button';

type EntityType = 'service' | 'category';
interface Report { processed: number; would_assign: number; would_preserve: number; conflicts: Array<{ message: string }> }
interface StatusResponse { complete: boolean; progress: Partial<Record<EntityType, { complete: boolean }>> }
interface DryResponse { reports: Record<EntityType, Report> }
interface BatchResponse { entity_complete: boolean; complete: boolean }

export function PlatformIdentifierMigrationNotice() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [reports, setReports] = useState<Record<EntityType, Report> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get<StatusResponse>('admin/platform-identifiers/migration')
      .then(async (next) => {
        if (!active) return;
        setStatus(next);
        if (!next.complete) {
          const dry = await apiClient.post<DryResponse>('admin/platform-identifiers/migration', { action: 'dry-run' });
          if (active) setReports(dry.reports);
        }
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Migration check failed.'));
    return () => { active = false; };
  }, []);

  if (status?.complete) return null;

  const conflicts = reports ? [...reports.service.conflicts, ...reports.category.conflicts] : [];
  const notes: ModuleNote[] = error
    ? [{ id: 'migration-error', type: 'error', message: error }]
    : conflicts.length > 0
      ? conflicts.map((conflict, index) => ({ id: `migration-conflict-${index}`, type: 'error', message: conflict.message }))
      : [{ id: 'migration-required', type: 'info', message: reports
          ? `Dry check: ${reports.service.would_assign} Services and ${reports.category.would_assign} Categories need Platform IDs; ${reports.service.would_preserve + reports.category.would_preserve} valid IDs will be preserved.`
          : 'Checking existing Service and Category Platform identifiers…' }];

  const assign = async () => {
    if (!reports || conflicts.length > 0) return;
    setBusy(true); setError('');
    try {
      let complete = false;
      for (const entityType of ['service', 'category'] as EntityType[]) {
        let entityComplete = Boolean(status?.progress[entityType]?.complete);
        while (!entityComplete) {
          const result = await apiClient.post<BatchResponse>('admin/platform-identifiers/migration', { action: 'assign', entity_type: entityType });
          entityComplete = result.entity_complete;
          complete = result.complete;
        }
      }
      if (complete) setStatus({ complete: true, progress: {} });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Platform ID assignment stopped.');
    } finally { setBusy(false); }
  };

  return (
    <section class="cz-platform-id-migration" role="status" aria-live="polite">
      <ModuleNotificationPanel notes={notes} variant="station" />
      {reports && conflicts.length === 0 && !error && (
        <Button disabled={busy} onClick={assign}>
          {busy ? 'Assigning Platform IDs…' : 'Assign Platform IDs'}
        </Button>
      )}
    </section>
  );
}
