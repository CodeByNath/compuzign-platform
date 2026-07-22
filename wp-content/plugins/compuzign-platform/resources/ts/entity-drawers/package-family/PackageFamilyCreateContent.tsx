// Package Family creation — the host-neutral create composition.
//
// The mature create form behaviour (previously CreatePackageFamilyDrawerStep in
// the Command Centre's serviceManagerDrawers) recovered against the neutral
// bridge: name + optional description, create through the supplied command, and
// on success report the mutation and close. It knows no host, no StepContext,
// and no endpoint — the adapter owns how `create` reaches the Package Family
// authority.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface PackageFamilyCreateDraft {
  name: string;
  description: string;
}

export type PackageFamilyCreateResult = { ok: true } | { ok: false; message: string };

export interface PackageFamilyCreateContentProps {
  create: (draft: PackageFamilyCreateDraft) => Promise<PackageFamilyCreateResult>;
  bridge: EntityDrawerHostBridge;
}

export function PackageFamilyCreateContent({ create, bridge }: PackageFamilyCreateContentProps): VNode {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await create({ name: name.trim(), description: description.trim() });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    bridge.onMutationComplete?.();
    bridge.close();
  };

  useEffect(() => {
    bridge.setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={saving} onClick={() => bridge.close()}>Cancel</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={saving || !name.trim()} onClick={() => void apply()}>
          {saving ? 'Working…' : 'Create Family'}
        </button>
      </div>,
    );
    return () => bridge.setFooter(null);
  }, [bridge, saving, name, description]);

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Name</label>
        <input
          type="text" class="cz-tf-input" value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea
          class="cz-tf-input" rows={3} value={description}
          onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
        />
      </div>
      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
    </div>
  );
}
