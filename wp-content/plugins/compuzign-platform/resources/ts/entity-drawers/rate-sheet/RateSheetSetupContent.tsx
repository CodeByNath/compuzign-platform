// Rate Sheet setup — the host-neutral initialise composition.
//
// The Package Station models ONE Rate Sheet configuration; this composition
// exists only for the not-yet-configured state and initialises that singleton
// (title only — rows are connected through the mature Rate Sheet tooling, and
// groups through the Rate Sheet group command). It never creates a second
// sheet: the supplied command refuses when one is already configured, and that
// refusal is surfaced honestly.
//
// Host-neutral: it receives a command and the bridge, knows no station shell,
// no StepContext, and no endpoint.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export type RateSheetSetupResult = { ok: true } | { ok: false; message: string };

export interface RateSheetSetupContentProps {
  initialise: (title: string) => Promise<RateSheetSetupResult>;
  bridge: EntityDrawerHostBridge;
}

export function RateSheetSetupContent({ initialise, bridge }: RateSheetSetupContentProps): VNode {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await initialise(title.trim());
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
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={saving || !title.trim()} onClick={() => void apply()}>
          {saving ? 'Working…' : 'Set up Rate Sheet'}
        </button>
      </div>,
    );
    return () => bridge.setFooter(null);
  }, [bridge, saving, title]);

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Rate Sheet title</label>
        <input
          type="text" class="cz-tf-input" value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
        />
      </div>
      <p class="cz-tf-hint">
        This initialises the station's one Rate Sheet configuration. Rows are
        connected from Package relationships; groups can be added once the sheet
        exists.
      </p>
      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
    </div>
  );
}
