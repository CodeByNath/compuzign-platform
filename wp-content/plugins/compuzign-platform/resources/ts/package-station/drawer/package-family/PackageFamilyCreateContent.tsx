// Package Family creation — the `package-family-create` drawer composition.
//
// It is the SAME mature composition the Family drawer uses: `EntityDrawer`
// assembling the Family Overview module from that drawer's own shell, with the
// module's inline editor opened over it.
//
// It opens READABLE, on the Overview screen: the empty module states what a
// Family will be, carries its own Pending pill and that pill's message, and
// offers Edit. Only Edit opens the editor. Saving settles the module, which then
// reads back the stored record — the ordinary module cycle, not a bespoke form.
// Further editing belongs to the mature Family drawer, so the settled module
// delivers no Edit handler and the action reads disabled.
//
// Footer: the readable module owns none of its own, so the drawer publishes the
// record footer — Close before the save, then the optional Tier-capability
// choices, which are record-level decisions rather than module editing. While
// editing, InlineEditorShell owns Save/Cancel and the drawer withdraws its
// footer, so exactly one footer is present at a time.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { evaluateModule, packageFamilyOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { PACKAGE_FAMILY_CREATE_ENTITY } from '../schema/entities/packageFamilyCreate';
import type { PackageFamilyOverviewShellData } from '../schema/bindings/packageFamily';
import type {
  PackageFamilyCreateCommands,
  PackageFamilyCreateDraft,
} from '../../surface/packageFamily/usePackageFamilyCreate';
import { usePackageFamilyCreate } from '../../surface/packageFamily/usePackageFamilyCreate';

export type { PackageFamilyCreateDraft } from '../../surface/packageFamily/usePackageFamilyCreate';

export interface PackageFamilyCreateContentProps {
  commands: PackageFamilyCreateCommands;
  bridge: EntityDrawerHostBridge;
  onManageTierSystem?: () => void;
}

export function PackageFamilyCreateContent({ commands, bridge, onManageTierSystem }: PackageFamilyCreateContentProps) {
  const [draft, setDraft] = useState<PackageFamilyCreateDraft>({ name: '', description: '' });
  const create = usePackageFamilyCreate(commands, bridge.onMutationComplete ?? (() => {}));
  const saved = create.stage !== 'form';

  // Readable first. Edit is the only way into the editor, and the save settles
  // the module back to readable.
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (saved) setEditing(false); }, [saved]);
  // The module's own notification panel, opened from its pill.
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const footer = useMemo(() => {
    // The module shell owns Save/Cancel while the editor is open.
    if (editing) return null;
    if (create.stage === 'form') {
      return <EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: bridge.close }} />;
    }
    if (create.stage === 'saved') {
      return (
        <EntityActionFooter
          close={{ id: 'done', label: 'Done', onSelect: bridge.close }}
          primary={{
            id: 'add-tier-capability',
            label: 'Add Tier capability',
            busyLabel: 'Adding…',
            busy: create.saving,
            onSelect: () => void create.addTierCapability(),
          }}
        />
      );
    }
    return (
      <EntityActionFooter
        close={{ id: 'done', label: 'Done', onSelect: bridge.close }}
        primary={{
          id: 'manage-tier-system',
          label: 'Manage Tier system',
          onSelect: () => { create.openTierTool(); bridge.close(); onManageTierSystem?.(); },
        }}
      />
    );
  }, [
    bridge,
    editing,
    create.stage,
    create.saving,
    create.addTierCapability,
    create.openTierTool,
    onManageTierSystem,
  ]);

  useEffect(() => {
    bridge.setFooter(footer);
    return () => bridge.setFooter(null);
  }, [bridge, footer]);

  // The stored record once it exists, the draft before that. One module, read
  // from whichever is authoritative at this stage.
  const family = create.family;
  const data: PackageFamilyOverviewShellData = {
    groupId:     family?.group_id ?? '',
    name:        family?.label ?? draft.name,
    description: family?.description ?? draft.description,
  };

  const named = draft.name.trim().length > 0;
  const binding: ShellBinding<PackageFamilyOverviewShellData> = {
    data,
    state: evaluateModule(
      packageFamilyOverviewModule,
      { name: data.name, description: data.description },
      {
        platformStatus:   family?.platform_status ?? 'disabled',
        moduleTransition: family ? 'settled' : 'not-configured',
        platformLabel:    'Package Family',
      },
    ),
    hasDraft: false,
    // Editing a saved Family belongs to the mature Family drawer, which owns
    // that update. Withholding the handler disables the action; it never opens
    // an editor that cannot save.
    handlers: saved ? {} : { edit: () => setEditing(true) },
  };

  return (
    <EntityDrawer
      entity={PACKAGE_FAMILY_CREATE_ENTITY}
      bindings={{ overview: binding }}
      openPanel={openPanel}
      onTogglePanel={(module) => setOpenPanel((current) => current === module ? null : module)}
      editing={editing ? {
        module: 'overview',
        session: {
          draft,
          patch:   (partial) => setDraft((current) => ({ ...current, ...(partial as Partial<PackageFamilyCreateDraft>) })),
          replace: (next) => setDraft(next as PackageFamilyCreateDraft),
          onSave:  async () => { await create.saveFamily(draft); },
          // Cancel returns to the readable module; leaving the drawer is the
          // footer's Close, not an editor gesture.
          onCancel: () => setEditing(false),
          saving:   create.saving,
          saveErr:  create.error,
          isDirty:  named || draft.description.trim() !== '',
          saveDisabled: !named,
          title: 'New Package Family',
        },
      } : null}
      trailing={{
        // Surface content, not schema: the save's own outcome. The added Tier
        // system is stated here because this drawer browses no connections — the
        // Family's Capabilities module owns it from now on.
        details: !editing && (create.error || create.instance) && (
          <div class="cz-shell-section cz-shell-section--no-border">
            {create.error && <p class="cz-admin-error-msg" role="alert">{create.error}</p>}
            {create.instance && !create.error && (
              <p class="cz-admin-ok-msg">Tier capability added — this Family now uses {create.instance.title}.</p>
            )}
          </div>
        ),
      }}
    />
  );
}
