// Rate Sheet group creation — the host-neutral create composition.
//
// Recovers the mature group-add behaviour (label in, group appended with the
// editor's own id-minting convention) against the neutral bridge. Rate Sheet
// groups are Package-Station-owned sheet organisation — distinct from Package
// relationship groups and from Package Families — so this composition names
// them explicitly and does nothing else.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export type RateSheetGroupCreateResult = { ok: true } | { ok: false; message: string };

export interface RateSheetGroupCreateContentProps {
  create: (label: string) => Promise<RateSheetGroupCreateResult>;
  bridge: EntityDrawerHostBridge;
}

export function RateSheetGroupCreateContent({ create, bridge }: RateSheetGroupCreateContentProps): VNode {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!label.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await create(label.trim());
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
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={saving || !label.trim()} onClick={() => void apply()}>
          {saving ? 'Working…' : 'Create Rate Sheet Group'}
        </button>
      </div>,
    );
    return () => bridge.setFooter(null);
  }, [bridge, saving, label]);

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Group label</label>
        <input
          type="text" class="cz-tf-input" value={label}
          onInput={(e) => setLabel((e.target as HTMLInputElement).value)}
        />
      </div>
      <p class="cz-tf-hint">
        Rate Sheet groups organise the sheet's rows. They are separate from
        Package relationship groups and from Package Families.
      </p>
      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
    </div>
  );
}
