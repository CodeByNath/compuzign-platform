// Tier system registration — the `tier` drawer's empty-record composition.
//
// It is the SAME mature composition the drawer already uses: `EntityDrawer`
// assembling a placed overview module from a schema, with the module's inline
// editor opened over it. Registering starts in that editor because there is
// nothing to read yet; saving it settles the module, and the card then reads
// back the record's own stored identity with Edit to reopen the editor — the
// ordinary module cycle, not a bespoke form.
//
// The drawer keeps no footer: the module's InlineEditorShell owns Save/Cancel,
// exactly as the Rate Sheet tool leaves it while editing. Owning no footer is
// also why nothing here can drive a set-footer/re-render loop.
//
// Registering is ONE atomic creation. It fills no slot and chains into no
// workflow; a Tier system that holds a Family is reached afterwards by selecting
// that Family in the engine.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
import { tierRegistrationModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { TIER_REGISTRATION_ENTITY } from '../schema/entities/tierRegistration';
import type { TierRegistrationShellData } from '../schema/bindings/tierRegistration';
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

  // Nothing exists to read before the first save, so the module opens straight
  // in its editor. Afterwards it behaves like every other module: readable, with
  // Edit reopening the same editor.
  const [editing, setEditing] = useState(true);
  useEffect(() => { if (registered) setEditing(false); }, [registered]);

  // The module shell owns Save and Cancel while editing.
  useEffect(() => {
    bridge.setFooter(null);
    return () => bridge.setFooter(null);
  }, [bridge]);

  const titled = draft.title.trim().length > 0;
  const familyLabel = draft.familyId === null
    ? null
    : registration.selectable.find((f) => f.group_id === draft.familyId)?.label ?? null;

  const data: TierRegistrationShellData = {
    title:       draft.title,
    description: draft.description,
    familyLabel,
    reference:   registration.instance?.tier_instance_id ?? null,
    slots:       5,
  };

  const binding: ShellBinding<TierRegistrationShellData> = {
    data,
    state: evaluateModule(tierRegistrationModule, { titled }, {
      platformStatus: registered ? 'active' : 'draft',
      platformLabel:  'Tier system',
    }),
    hasDraft: false,
    handlers: { edit: () => setEditing(true) },
  };

  return (
    <EntityDrawer
      entity={TIER_REGISTRATION_ENTITY}
      bindings={{ overview: binding }}
      editing={editing ? {
        module: 'overview',
        session: {
          draft,
          patch:   (partial) => setDraft(partial as Partial<typeof draft>),
          replace: (next) => setDraft(next as Partial<typeof draft>),
          onSave:  async () => {
            if (registered) { await registration.applyEdits(); setEditing(false); return; }
            await registration.register();
          },
          onCancel: () => { if (registered) setEditing(false); else bridge.close(); },
          saving,
          saveErr: error,
          isDirty: titled || draft.description.trim() !== '' || draft.familyId !== null,
          saveDisabled: !titled,
          title: registered ? 'Tier System' : 'Register Tier System',
          extras: { selectable: registration.selectable },
        },
      } : null}
    />
  );
}
