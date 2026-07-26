import { useEffect, useMemo, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
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
  const canSave = draft.name.trim().length > 0 && !create.saving;

  const footer = useMemo(() => {
    if (create.stage === 'form') {
      return (
        <EntityActionFooter
          close={{ id: 'cancel', label: 'Cancel', onSelect: bridge.close }}
          primary={{
            id: 'create',
            label: 'Create Family',
            busyLabel: 'Creating…',
            busy: create.saving,
            disabled: !canSave,
            onSelect: () => void create.saveFamily(draft),
          }}
        />
      );
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
    canSave,
    create.stage,
    create.saving,
    create.saveFamily,
    create.addTierCapability,
    create.openTierTool,
    onManageTierSystem,
    draft,
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

  // The read-module field classes are styled only under `.drawerOverview`, which
  // this composition is not, so it uses the `cz-tf-*` editor vocabulary instead.
  return (
    <div class="cz-tf-form">
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
          class="cz-tf-input"
          rows={3}
          value={draft.description}
          disabled={create.saving}
          onInput={(event) => setDraft((current) => ({ ...current, description: (event.target as HTMLTextAreaElement).value }))}
        />
      </div>
      {create.error && <div class="cz-admin-error-msg" role="alert">{create.error}</div>}
    </div>
  );
}
