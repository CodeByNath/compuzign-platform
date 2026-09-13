// Temporary one-time rollout notice. Remove after live assignment completes.
//
// This sweeps every scope once and hides itself for good when the rollout
// reports complete. It is the only UI over the migration boundary — once it
// hides, repairing a scope is a WP-CLI operation
// (`wp compuzign platform-identifiers assign <scope>`), deliberately, so no
// dashboard control can drive identity assignment. It mints nothing itself: it
// runs the existing actions through the shared `api/platformIdentifiers`
// client, and the engine behind them owns every rule.
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
} from '../api/platformIdentifiers';

const ENTITY_TYPES: EntityType[] = ['package_family_group', 'tier_group', 'tier', 'tier_addon', 'package_rate_card_group', 'package_rate_card', 'package_rate_card_item', 'tier_leg', 'tier_edition_leg', 'tier_catalogue', 'tier_edition_catalogue'];

export function PlatformIdentifierMigrationNotice() {
  const [reports, setReports] = useState<Record<EntityType, Report> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchPlatformIdentifierStatus()
      .then(async () => {
        if (!active) return;
        // Stored completion is only the last migration pass. A later legacy
        // record can still lack an ID, so every mount rechecks every scope
        // before deciding whether this one explicit repair action is needed.
        const dryRuns = await Promise.all(ENTITY_TYPES.map((entityType) => dryRunPlatformIdentifiers(entityType)));
        if (active) setReports(Object.fromEntries(dryRuns.map((dry) => [dry.entity_type, dry.report])) as Record<EntityType, Report>);
      })
      .catch(() => active && setError('Platform ID migration check failed. Review the server log for details.'));
    return () => { active = false; };
  }, []);

  const conflicts = reports ? ENTITY_TYPES.flatMap((entityType) => reports[entityType].conflicts.map((conflict) => ({ ...conflict, entityType }))) : [];
  const wouldAssign = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_assign, 0) : 0;
  const wouldPreserve = reports ? ENTITY_TYPES.reduce((total, entityType) => total + reports[entityType].would_preserve, 0) : 0;
  // Completion is intentionally silent. It is the current zero-write sweep,
  // not the historical progress flag: every supported scope must be clear.
  const rolloutComplete = reports !== null && wouldAssign === 0 && conflicts.length === 0;
  if (rolloutComplete) return null;
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
      for (const entityType of ENTITY_TYPES) {
        // A scope previously marked complete may have gained a later legacy
        // record. The controller restarts that scope safely when explicitly
        // invoked, so dry-check results—not its parked progress cursor—decide
        // whether this button runs it again.
        let entityComplete = reports[entityType].would_assign === 0;
        while (!entityComplete) {
          const result = await assignPlatformIdentifiers(entityType);
          entityComplete = result.entity_complete;
        }
      }
      const dryRuns = await Promise.all(ENTITY_TYPES.map((entityType) => dryRunPlatformIdentifiers(entityType)));
      setReports(Object.fromEntries(dryRuns.map((dry) => [dry.entity_type, dry.report])) as Record<EntityType, Report>);
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
