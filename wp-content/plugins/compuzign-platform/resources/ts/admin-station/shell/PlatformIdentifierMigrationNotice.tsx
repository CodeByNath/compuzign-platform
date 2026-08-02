// Temporary one-time migration notice. Remove after live assignment completes.
import { useEffect, useState } from 'preact/hooks';
import { apiClient } from '@/api/client';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications/shared';
import { Button } from '@/components/ui/Button';

type EntityType = 'package_family_group' | 'tier_group' | 'tier' | 'tier_addon' | 'package_rate_card_group' | 'package_rate_card';
const ENTITY_TYPES: EntityType[] = ['package_family_group', 'tier_group', 'tier', 'tier_addon', 'package_rate_card_group', 'package_rate_card'];
interface Report { processed: number; would_assign: number; would_preserve: number; conflicts: Array<{ message: string }> }
interface StatusResponse { complete: boolean; progress: Partial<Record<EntityType, { complete: boolean }>> }
interface DryResponse { entity_type: EntityType; report: Report }
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
          const dryRuns = await Promise.all(ENTITY_TYPES.map((entityType) =>
            apiClient.post<DryResponse>('admin/platform-identifiers/migration', { action: 'dry-run', entity_type: entityType })));
          if (active) setReports(Object.fromEntries(dryRuns.map((dry) => [dry.entity_type, dry.report])) as Record<EntityType, Report>);
        }
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Migration check failed.'));
    return () => { active = false; };
  }, []);

  if (status?.complete) {
    return (
      <section class="cz-platform-id-migration" role="status" aria-live="polite">
        <ModuleNotificationPanel
          notes={[{ id: 'migration-complete', type: 'info', message: 'Package and Tier Platform ID assignment is complete.' }]}
          variant="station"
        />
      </section>
    );
  }

  const conflicts = reports ? ENTITY_TYPES.flatMap((entityType) => reports[entityType].conflicts.map((conflict) => ({ ...conflict, entityType }))) : [];
  const wouldAssign = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_assign, 0) : 0;
  const wouldPreserve = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_preserve, 0) : 0;
  const notes: ModuleNote[] = error
    ? [{ id: 'migration-error', type: 'error', message: error }]
    : conflicts.length > 0
      ? conflicts.map((conflict, index) => ({ id: `migration-conflict-${index}`, type: 'error', message: `${conflict.entityType}: ${conflict.message}` }))
      : [{ id: 'migration-required', type: 'info', message: reports
          ? `Dry check: ${wouldAssign} Package/Tier records need Platform IDs; ${wouldPreserve} valid IDs will be preserved.`
          : 'Checking existing Package and Tier Platform identifiers…' }];

  const assign = async () => {
    if (!reports || conflicts.length > 0) return;
    setBusy(true); setError('');
    try {
      let complete = false;
      for (const entityType of ENTITY_TYPES) {
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
          {busy ? 'Assigning Package and Tier IDs…' : 'Assign Package and Tier IDs'}
        </Button>
      )}
    </section>
  );
}
