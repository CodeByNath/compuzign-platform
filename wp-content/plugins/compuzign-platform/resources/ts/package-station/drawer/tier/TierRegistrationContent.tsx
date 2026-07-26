// Tier system registration — the `tier` drawer's empty-record composition.
//
// This is the same drawer the workspace already opens, addressed before any Tier
// system exists. It presents the record's own fields at their defaults; the
// backend mints the id and the five empty slots on save.
//
// It wears the SAME module chrome the mature drawer wears while editing:
// `InlineEditorShell` — the module shell with different content, which already
// owns Save/Cancel, the dirty-cancel confirmation, the busy state and the error
// slot. The drawer footer is therefore null here, exactly as the Rate Sheet tool
// leaves it while editing. A create surface is an edit surface with no record
// behind it yet, so it earns no chrome of its own — and owning no footer is also
// why nothing here can drive the footer-set/re-render loop.
//
// It deliberately does NOT continue into slot configuration. Registering is one
// atomic creation, and a Tier system that holds a Package Family is reached the
// ordinary way afterwards — by selecting that Family in the engine.

import { useEffect } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
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
  const { draft, error, saving, setDraft, stage } = registration;
  const registered = stage === 'registered';
  const dirty = draft.title.trim() !== '' || draft.description.trim() !== '' || draft.familyId !== null;

  // The module shell owns Save and Cancel, so the drawer keeps no footer here.
  useEffect(() => {
    bridge.setFooter(null);
    return () => bridge.setFooter(null);
  }, [bridge]);

  return (
    <InlineEditorShell
      title={registered ? 'Tier system' : 'Register Tier system'}
      onSave={registered ? registration.applyEdits : registration.register}
      onCancel={bridge.close}
      saving={saving}
      saveErr={error}
      isDirty={!registered && dirty}
      saveDisabled={draft.title.trim().length === 0}
    >
      {registered && registration.instance && (
        <p class="cz-tf-hint" role="status">
          <strong>{registration.instance.title}</strong> is registered, in the pool as{' '}
          <code>{registration.instance.tier_instance_id}</code> with five empty slots.
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
          class="cz-tf-textarea"
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
    </InlineEditorShell>
  );
}
