// Package Family creation — the `package-family-create` drawer composition.
//
// It wears the SAME module chrome the mature drawer wears while editing:
// `InlineEditorShell` owns Save/Cancel, the dirty-cancel confirmation, the busy
// state and the error slot, so the drawer keeps no footer of its own while the
// form is open. The optional Tier-capability stages that follow the save are
// record-level choices rather than module editing, so those keep the drawer
// footer and the kit's `EntityActionFooter` grammar.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
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
  const onForm = create.stage === 'form';

  const footer = useMemo(() => {
    // The module shell owns Save/Cancel while the form is open.
    if (create.stage === 'form') return null;
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

  if (create.stage === 'saved') {
    return (
      <div class="cz-tf-form">
        <h3 class="cz-tf-label">Package Family saved</h3>
        <p class="cz-tf-hint">{create.family?.label} is complete. Tier capability is optional and can be added now or later.</p>
        {create.error && <div class="cz-admin-error-msg" role="alert">{create.error}</div>}
      </div>
    );
  }

  if (create.stage === 'capability-added') {
    return (
      <div class="cz-tf-form">
        <h3 class="cz-tf-label">Tier capability added</h3>
        <p class="cz-tf-hint">{create.family?.label} now uses {create.instance?.title}.</p>
      </div>
    );
  }

  return (
    <InlineEditorShell
      title="New Package Family"
      onSave={async () => { await create.saveFamily(draft); }}
      onCancel={bridge.close}
      saving={create.saving}
      saveErr={create.error}
      isDirty={onForm && (draft.name.trim() !== '' || draft.description.trim() !== '')}
      saveDisabled={draft.name.trim().length === 0}
    >
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="package-family-create-name">Family name</label>
        <input
          id="package-family-create-name"
          type="text"
          class="cz-tf-input"
          value={draft.name}
          disabled={create.saving}
          onInput={(event) => setDraft((current) => ({ ...current, name: (event.target as HTMLInputElement).value }))}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="package-family-create-description">Description</label>
        <textarea
          id="package-family-create-description"
          class="cz-tf-textarea"
          rows={3}
          value={draft.description}
          disabled={create.saving}
          onInput={(event) => setDraft((current) => ({ ...current, description: (event.target as HTMLTextAreaElement).value }))}
        />
      </div>
    </InlineEditorShell>
  );
}
