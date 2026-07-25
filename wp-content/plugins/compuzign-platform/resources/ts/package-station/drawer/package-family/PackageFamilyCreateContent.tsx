import { useEffect, useMemo, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
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
        <div class="cz-drawer-actions">
          <button type="button" class="button" onClick={bridge.close}>Cancel</button>
          <button type="button" class="button button-primary" disabled={!canSave} onClick={() => void create.saveFamily(draft)}>
            {create.saving ? 'Creating…' : 'Create Family'}
          </button>
        </div>
      );
    }
    if (create.stage === 'saved') {
      return (
        <div class="cz-drawer-actions">
          <button type="button" class="button" onClick={bridge.close}>Not now</button>
          <button type="button" class="button" onClick={bridge.close}>Done</button>
          <button type="button" class="button button-primary" disabled={create.saving} onClick={() => void create.addTierCapability()}>
            {create.saving ? 'Adding…' : 'Add Tier capability'}
          </button>
        </div>
      );
    }
    return (
      <div class="cz-drawer-actions">
        <button type="button" class="button" onClick={bridge.close}>Done</button>
        <button type="button" class="button button-primary" onClick={() => { create.openTierTool(); bridge.close(); onManageTierSystem?.(); }}>
          Manage Tier system
        </button>
      </div>
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
      <div class="cz-req-detail">
        <div class="drawerModule drawerModule--overview">
          <h3>Package Family saved</h3>
          <p>{create.family?.label} is complete. Tier capability is optional and can be added now or later.</p>
          {create.error && <div class="cz-admin-error-msg" role="alert">{create.error}</div>}
        </div>
      </div>
    );
  }

  if (create.stage === 'capability-added') {
    return (
      <div class="cz-req-detail">
        <div class="drawerModule drawerModule--overview">
          <h3>Tier capability added</h3>
          <p>{create.family?.label} now uses {create.instance?.title}.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="cz-req-detail">
      <div class="drawerModule drawerModule--overview">
        <div class="drawerModule__fields">
          <label class="drawerModule__field">
            <span class="drawerModule__label">Family name</span>
            <input
              type="text"
              value={draft.name}
              onInput={(event) => setDraft((current) => ({ ...current, name: event.currentTarget.value }))}
              disabled={create.saving}
            />
          </label>
          <label class="drawerModule__field">
            <span class="drawerModule__label">Description</span>
            <textarea
              value={draft.description}
              onInput={(event) => setDraft((current) => ({ ...current, description: event.currentTarget.value }))}
              disabled={create.saving}
            />
          </label>
        </div>
        {create.error && <div class="cz-admin-error-msg" role="alert">{create.error}</div>}
      </div>
    </div>
  );
}
