// Tier Workspace Settings — the last Package Manager form.
//
// Families and Rate Sheets are launchers now: Settings opens the drawer that
// already owns the record's fields, validation, save and close, and holds no
// form of its own. Groups never needed an entry, because a group is stored in
// `rate_sheets[].groups[]` and is authored inside the sheet that holds it.
//
// Create Tier is the one that remains, and only because a Tier system has no
// creation drawer yet. `useTierInstances.createInstance` sends a title and the
// backend mints the five-slot shell; there is nowhere else a Tier system can be
// registered today, so removing this form before that drawer exists would take a
// capability away rather than move it. It goes when the Tier drawer can open on
// an empty record.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';

export function CreateTier({ tool }: { tool: TierInstancesToolState }): VNode {
  const [title, setTitle] = useState('');
  const [created, setCreated] = useState<{ label: string; reference: string } | null>(null);

  const submit = async () => {
    const instance = await tool.createInstance(title.trim());
    if (!instance) return;
    setTitle('');
    setCreated({ label: instance.title, reference: instance.tier_instance_id });
  };

  return (
    <form
      class="cz-tier-settings__form"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      <p class="cz-tier-settings__muted">
        Creates the Tier system only. Its five fixed slots start empty and it is assigned to no
        Package Family. Assignment is made in the Package Family drawer that owns the relationship.
      </p>
      <div class="cz-tier-settings__field">
        <label for="create-tier-title">Tier system title</label>
        <input
          id="create-tier-title"
          class="cz-tier-deck__control"
          value={title}
          required
          onInput={(event) => setTitle(event.currentTarget.value)}
        />
      </div>
      <button
        type="submit"
        class="cz-tier-deck__button cz-tier-deck__button--primary"
        disabled={tool.saving || !title.trim()}
      >
        Create Tier
      </button>
      {created && (
        <p class="cz-tier-settings__success" role="status">
          <strong>{created.label}</strong> was created as a Tier system. It is in the pool as{' '}
          <code>{created.reference}</code> and is connected to nothing.
        </p>
      )}
      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </form>
  );
}
