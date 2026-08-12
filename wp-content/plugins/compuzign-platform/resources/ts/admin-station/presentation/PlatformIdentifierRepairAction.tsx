// Platform Identifier check/repair — the shared operational control.
//
// An admin-run maintenance action for ONE identity scope, exposed so a missing
// Platform ID can be found and filled from the dashboard instead of WP-CLI.
// Unlike `shell/PlatformIdentifierMigrationNotice` — a temporary one-time
// rollout banner that sweeps all seven scopes and hides itself for good once
// the rollout is marked complete — this is a permanent, per-scope, re-runnable
// tool. That difference is the whole reason it exists: after completion the
// notice is gone, yet a record created or migrated later can still be missing
// its identifier, and there is otherwise no way to find out from the UI.
//
// It mints nothing. Every decision — whether an ID is needed, what it is, when
// it may be bound, what counts as a conflict — belongs to the Platform
// Identifier engine behind the existing migration endpoint. This component only
// runs the existing `dry-run`, shows what it reported, and (when the operator
// asks) runs the existing `assign` until that scope reports itself complete.
//
// Host it from any station surface: it is entity-neutral and owns no station's
// data. Package Settings mounts it for `tier_group`.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { Button } from '@/components/ui/Button';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications/shared';
import {
  assignPlatformIdentifiers,
  dryRunPlatformIdentifiers,
  type PlatformIdentifierEntityType,
  type PlatformIdentifierReport,
} from '../api/platformIdentifiers';

// Batches are engine-paged; this bounds the loop so a persistent
// `entity_complete: false` can never spin forever.
const MAX_BATCHES = 100;

interface Props {
  entityType: PlatformIdentifierEntityType;
  /** What the operator calls these records, e.g. "Tier Group". */
  label: string;
}

type Phase = 'idle' | 'checking' | 'checked' | 'repairing' | 'repaired';

export function PlatformIdentifierRepairAction({ entityType, label }: Props): VNode {
  const [phase, setPhase] = useState<Phase>('idle');
  const [report, setReport] = useState<PlatformIdentifierReport | null>(null);
  const [assigned, setAssigned] = useState(0);
  const [error, setError] = useState('');

  const check = async () => {
    setPhase('checking');
    setError('');
    setAssigned(0);
    try {
      const response = await dryRunPlatformIdentifiers(entityType);
      setReport(response.report);
      setPhase('checked');
    } catch {
      setError(`Could not check ${label} Platform IDs. Review the server log for details.`);
      setPhase('idle');
    }
  };

  const repair = async () => {
    setPhase('repairing');
    setError('');
    try {
      let total = 0;
      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const result = await assignPlatformIdentifiers(entityType);
        total += result.assigned;
        if (result.entity_complete) break;
      }
      setAssigned(total);
      // Re-check rather than trusting the loop: the dry check is the same
      // zero-write scan the operator started from, so "0 remaining" is proven
      // by the engine and not inferred from the batch responses.
      const verified = await dryRunPlatformIdentifiers(entityType);
      setReport(verified.report);
      setPhase('repaired');
    } catch {
      setError(`${label} Platform ID assignment stopped. Review the server log for details.`);
      setPhase('checked');
    }
  };

  const conflicts = report?.conflicts ?? [];
  const needsRepair = report !== null && report.would_assign > 0;
  const busy = phase === 'checking' || phase === 'repairing';

  const notes: ModuleNote[] = error !== ''
    ? [{ id: 'repair-error', type: 'error', message: error }]
    : conflicts.length > 0
      // A conflict is never repaired from here: duplicate or invalid stored IDs
      // need a human decision the engine deliberately refuses to guess.
      ? conflicts.map((conflict, index) => ({
        id: `repair-conflict-${index}`,
        type: 'error' as const,
        message: `${conflict.native_reference ?? 'record'}: ${conflict.message}`,
      }))
      : report === null
        ? []
        : [{
          // 'warning' is the panel's non-blocking attention tone; the all-clear
          // is 'info'. Neither counts toward an error badge, because a missing
          // identifier is an operational task, not a validation failure.
          id: 'repair-report',
          type: needsRepair ? 'warning' : 'info',
          message: phase === 'repaired'
            ? `Assigned ${assigned} ${label} Platform ID${assigned === 1 ? '' : 's'}. ${report.would_assign} still missing; ${report.would_preserve} valid ID${report.would_preserve === 1 ? '' : 's'} preserved.`
            : needsRepair
              ? `${report.would_assign} of ${report.processed} ${label} record${report.processed === 1 ? '' : 's'} ${report.would_assign === 1 ? 'is' : 'are'} missing a Platform ID. ${report.would_preserve} valid ID${report.would_preserve === 1 ? '' : 's'} will be preserved.`
              : `All ${report.processed} ${label} record${report.processed === 1 ? '' : 's'} already carry a valid Platform ID. Nothing to repair.`,
        }];

  return (
    <section class="cz-identity-repair" aria-label={`${label} Platform ID check and repair`}>
      <div class="cz-identity-repair__actions">
        <Button variant="secondary" disabled={busy} onClick={check}>
          {phase === 'checking' ? 'Checking…' : `Check ${label} Platform IDs`}
        </Button>
        {needsRepair && conflicts.length === 0 && (
          <Button disabled={busy} onClick={repair}>
            {phase === 'repairing' ? 'Assigning…' : `Assign ${report.would_assign} missing ID${report.would_assign === 1 ? '' : 's'}`}
          </Button>
        )}
      </div>
      {notes.length > 0 && (
        <div role="status" aria-live="polite">
          <ModuleNotificationPanel notes={notes} variant="station" />
        </div>
      )}
    </section>
  );
}
