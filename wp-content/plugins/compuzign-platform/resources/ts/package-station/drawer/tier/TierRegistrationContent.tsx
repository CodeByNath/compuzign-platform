// Tier system registration — the `tier` drawer's empty-record composition.
//
// This is the same drawer the workspace already opens, addressed before any Tier
// system exists. It presents the record's own fields at their defaults; the
// backend mints the id and the five empty slots on save.
//
// It deliberately does NOT continue into slot configuration. Registering is one
// atomic creation, and a Tier system that holds a Package Family is reached the
// ordinary way afterwards — by selecting that Family in the engine, which
// resolves its assignment and loads the empty slots for individual Tier edits.

import { useEffect, useMemo } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import { useTierRegistration } from '../../surface/tierInstance/useTierRegistration';

export function TierRegistrationContent({ tool, initialFamilyId, bridge }: {
  tool:            TierInstancesToolState;
  initialFamilyId: string | null;
  bridge:          EntityDrawerHostBridge;
}): VNode {
  const registration = useTierRegistration(
    tool,
    initialFamilyId,
    bridge.onMutationComplete ?? (() => {}),
  );
  const { draft, saving, setDraft, stage } = registration;
  const canSave = draft.title.trim().length > 0 && !saving;

  const footer = useMemo(() => (
    <div class="cz-drawer-actions">
      <button type="button" class="button" onClick={bridge.close}>
        {stage === 'form' ? 'Cancel' : 'Done'}
      </button>
      <button
        type="button"
        class="button button-primary"
        disabled={!canSave}
        onClick={() => void (stage === 'form' ? registration.register() : registration.applyEdits())}
      >
        {stage === 'form'
          ? (saving ? 'Registering…' : 'Register Tier system')
          : (saving ? 'Saving…' : 'Save changes')}
      </button>
    </div>
  ), [bridge, canSave, registration, saving, stage]);

  useEffect(() => {
    bridge.setFooter(footer);
    return () => bridge.setFooter(null);
  }, [bridge, footer]);

  // Nothing is typed yet and nothing is stored yet, so an unsaved form is not a
  // record at risk. Once registered, the instance is already persisted and only
  // later corrections are unsaved, which the Save action owns.
  return (
    <div class="cz-req-detail">
      <div class="drawerModule drawerModule--overview">
        {stage === 'registered' && registration.instance && (
          <p class="cz-tier-settings__success" role="status">
            <strong>{registration.instance.title}</strong> is registered as a Tier system, in the
            pool as <code>{registration.instance.tier_instance_id}</code> with five empty slots.
          </p>
        )}

        <div class="drawerModule__fields">
          <label class="drawerModule__field">
            <span class="drawerModule__label">Tier system title</span>
            <input
              type="text"
              value={draft.title}
              disabled={saving}
              onInput={(event) => setDraft({ title: event.currentTarget.value })}
            />
          </label>
          <label class="drawerModule__field">
            <span class="drawerModule__label">Description</span>
            <textarea
              value={draft.description}
              disabled={saving}
              onInput={(event) => setDraft({ description: event.currentTarget.value })}
            />
          </label>
          <label class="drawerModule__field">
            <span class="drawerModule__label">Package Family</span>
            <select
              value={draft.familyId ?? ''}
              disabled={saving}
              onChange={(event) => setDraft({ familyId: event.currentTarget.value || null })}
            >
              <option value="">No Package Family — register standalone</option>
              {registration.selectable.map((family) => (
                <option key={family.group_id} value={family.group_id}>{family.label}</option>
              ))}
            </select>
            <span class="drawerModule__hint">
              Optional. A Family holds one Tier system, so only Families holding none are offered.
              This is a separate assignment, not a field on the Tier system.
            </span>
          </label>
        </div>

        {registration.error && (
          <div class="cz-admin-error-msg" role="alert">{registration.error}</div>
        )}
      </div>
    </div>
  );
}
