// Temporary one-time rollout notice. Remove after live assignment completes.
//
// This sweeps every scope once and hides itself for good when the rollout
// reports complete. The permanent, per-scope, re-runnable equivalent is
// `presentation/PlatformIdentifierRepairAction` — an operator still needs a way
// to check one scope after this banner is gone. Both drive the SAME migration
// endpoint through the shared `api/platformIdentifiers` client; neither mints
// an identifier.
import { useEffect, useState } from 'preact/hooks';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications/shared';
import { Button } from '@/components/ui/Button';
import {
  assignPlatformIdentifiers,
  dryRunPlatformIdentifiers,
  fetchPlatformIdentifierStatus,
  type PlatformIdentifierEntityType as EntityType,
  type PlatformIdentifierReport as Report,
  type PlatformIdentifierStatus as StatusResponse,
} from '../api/platformIdentifiers';

const ENTITY_TYPES: EntityType[] = ['package_family_group', 'tier_group', 'tier', 'tier_addon', 'package_rate_card_group', 'package_rate_card', 'package_rate_card_item'];

export function PlatformIdentifierMigrationNotice() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [reports, setReports] = useState<Record<EntityType, Report> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchPlatformIdentifierStatus()
      .then(async (next) => {
        if (!active) return;
        setStatus(next);
        if (!next.complete) {
          const dryRuns = await Promise.all(ENTITY_TYPES.map((entityType) => dryRunPlatformIdentifiers(entityType)));
          if (active) setReports(Object.fromEntries(dryRuns.map((dry) => [dry.entity_type, dry.report])) as Record<EntityType, Report>);
        }
      })
      .catch(() => active && setError('Platform ID migration check failed. Review the server log for details.'));
    return () => { active = false; };
  }, []);

  // Completion is intentionally silent. The temporary runner remains mounted
  // only so an administrator can verify the one-time rollout before removal.
  if (status?.complete) return null;

  const conflicts = reports ? ENTITY_TYPES.flatMap((entityType) => reports[entityType].conflicts.map((conflict) => ({ ...conflict, entityType }))) : [];
  const wouldAssign = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_assign, 0) : 0;
  const wouldPreserve = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_preserve, 0) : 0;
  const notes: ModuleNote[] = error
    ? [{ id: 'migration-error', type: 'error', message: error }]
    : conflicts.length > 0
      ? conflicts.map((conflict, index) => ({ id: `migration-conflict-${index}`, type: 'error', message: `${conflict.entityType}: ${conflict.message}` }))
      : [{ id: 'migration-required', type: 'info', message: reports
          ? `Dry check: ${wouldAssign} Package/Tier records and Rate Sheet rows need Platform IDs; ${wouldPreserve} valid IDs will be preserved.`
          : 'Checking existing Package and Tier Platform identifiers…' }];

  const assign = async () => {
    if (!reports || conflicts.length > 0) return;
    setBusy(true); setError('');
    try {
      let complete = false;
      for (const entityType of ENTITY_TYPES) {
        let entityComplete = Boolean(status?.progress[entityType]?.complete);
        while (!entityComplete) {
          const result = await assignPlatformIdentifiers(entityType);
          entityComplete = result.entity_complete;
          complete = result.complete;
        }
      }
      if (complete) setStatus({ complete: true, progress: {} });
    } catch {
      setError('Platform ID assignment stopped. Review the server log for details.');
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
