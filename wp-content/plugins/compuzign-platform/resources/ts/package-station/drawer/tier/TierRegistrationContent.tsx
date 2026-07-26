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
//
// FOOTER STABILITY — the drawer's footer is host state. Setting it re-renders
// this component, so the footer VNode must only change when something the footer
// actually displays changes. Its memo therefore depends on primitives alone and
// reaches the actions through a ref: `useTierRegistration` (like the Tier
// instance collection beneath it) returns a fresh object every render, so
// depending on that object would set the footer on every render, re-render, and
// set it again — an unbreakable loop that hangs the page.

import { useEffect, useMemo, useRef } from 'preact/hooks';
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

  // The actions are read at click time, never captured in the memo.
  const actions = useRef(registration);
  actions.current = registration;

  const footer = useMemo(() => (
    <div class="cz-drawer-actions">
      <button type="button" class="button" onClick={() => bridge.close()}>
        {stage === 'form' ? 'Cancel' : 'Done'}
      </button>
      <button
        type="button"
        class="button button-primary"
        disabled={!canSave}
        onClick={() => void (stage === 'form'
          ? actions.current.register()
          : actions.current.applyEdits())}
      >
        {stage === 'form'
          ? (saving ? 'Registering…' : 'Register Tier system')
          : (saving ? 'Saving…' : 'Save changes')}
      </button>
    </div>
  ), [bridge, canSave, saving, stage]);

  useEffect(() => {
    bridge.setFooter(footer);
    return () => bridge.setFooter(null);
  }, [bridge, footer]);

  return (
    <div class="cz-tf-form">
      {stage === 'registered' && registration.instance && (
        <p class="cz-tier-settings__success" role="status">
          <strong>{registration.instance.title}</strong> is registered as a Tier system, in the
          pool as <code>{registration.instance.tier_instance_id}</code> with five empty slots.
        </p>
      )}

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="tier-registration-title">Tier system title</label>
        <input
          id="tier-registration-title"
          type="text"
          class="cz-tf-input"
          value={draft.title}
          disabled={saving}
          onInput={(event) => setDraft({ title: (event.target as HTMLInputElement).value })}
        />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="tier-registration-description">Description</label>
        <textarea
          id="tier-registration-description"
          class="cz-tf-input"
          rows={3}
          value={draft.description}
          disabled={saving}
          onInput={(event) => setDraft({ description: (event.target as HTMLTextAreaElement).value })}
        />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="tier-registration-family">Package Family (optional)</label>
        <select
          id="tier-registration-family"
          class="cz-tf-select"
          value={draft.familyId ?? ''}
          disabled={saving}
          onChange={(event) => setDraft({
            familyId: (event.target as HTMLSelectElement).value || null,
          })}
        >
          <option value="">No Package Family — register standalone</option>
          {registration.selectable.map((family) => (
            <option key={family.group_id} value={family.group_id}>{family.label}</option>
          ))}
        </select>
        <p class="cz-tf-hint">
          A Family holds one Tier system, so only Families holding none are offered. This is a
          separate assignment, not a field on the Tier system.
        </p>
      </div>

      {registration.error && (
        <div class="cz-admin-error-msg" role="alert">{registration.error}</div>
      )}
    </div>
  );
}
