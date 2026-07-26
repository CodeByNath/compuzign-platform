// Tier system registration — the `tier` drawer's empty-record composition.
//
// It is the SAME mature composition the drawer already uses: `EntityDrawer`
// assembling a placed overview module from a schema, with the module's inline
// editor opened over it.
//
// It opens READABLE, on the Overview screen: the empty module states what a Tier
// system will be, carries its own Pending pill and that pill's message, and
// offers Edit. Only Edit opens the editor. Saving settles the module, and the
// card then reads back the record's own stored identity with Edit to reopen the
// editor — one module cycle before and after creation, never a bespoke form.
//
// Footer: the readable module owns none of its own, so the drawer publishes the
// record footer's Close; while editing, InlineEditorShell owns Save/Cancel and
// the drawer withdraws its footer. One footer is present at a time, which is
// also why nothing here can drive a set-footer/re-render loop.
//
// Registering is ONE atomic creation. It fills no slot and chains into no
// workflow; a Tier system that holds a Family is reached afterwards by selecting
// that Family in the engine.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
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

  // Readable first, before and after the save. Edit is the only way in.
  const [editing, setEditing] = useState(false);
  // The module's own notification panel, opened from its pill — the one place
  // this drawer states what is still missing.
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  useEffect(() => { if (registered) setEditing(false); }, [registered]);

  // Readable → the record footer's Close. Editing → InlineEditorShell owns
  // Save/Cancel, so the drawer withdraws its footer.
  useEffect(() => {
    bridge.setFooter(editing ? null : (
      <EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: bridge.close }} />
    ));
    return () => bridge.setFooter(null);
  }, [bridge, editing]);

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
      openPanel={openPanel}
      onTogglePanel={(module) => setOpenPanel((current) => current === module ? null : module)}
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
          // Cancel returns to the readable module in both stages; leaving the
          // drawer is the footer's Close, not an editor gesture.
          onCancel: () => setEditing(false),
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
