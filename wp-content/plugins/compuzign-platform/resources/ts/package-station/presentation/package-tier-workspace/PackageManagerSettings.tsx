// Tier Workspace Settings — the Package Manager creation sections.
//
// Four atomic creations, one record each:
//
//   Create Family      → a Package Family, unassigned and unconnected
//   Create Tier        → a Tier system, assigned to no Family and in no slot
//   Create Group       → a group inside the Rate Sheet that stores it
//   Create Rate Sheet  → a Rate Sheet, reachable by no Tier until access allows it
//
// None of them wires a second record. Creating a Family mints no Tier system;
// creating a Tier system assigns it to nothing and fills no slot; creating a
// Rate Sheet grants no Tier access and seeds no group; creating a group binds it
// to no Tier. Nothing is suggested, inferred, or pre-selected from what happens
// to be focused above.
//
// Feedback is the created record's own stored identity — its label and the id the
// backend minted — announced through `role="status"`, the pattern the workspace
// already uses. Each form returns that record to its caller, which is what a
// future "+ Add new" inside a Group or Per dropdown needs in order to select the
// value it just created on the row that asked for it.
//
// One exception is structural rather than a choice: a Rate Sheet group is stored
// inside `rate_sheets[].groups[]`, so there is no free-standing group pool to add
// one to. Create Group therefore asks which sheet stores it. That is the group's
// address, not a connection — the new group is bound to no Tier and to no row.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { PackageRateSheet } from '../../types';
import type { PackageManagerCreationState } from '../../surface/packageManager/usePackageManagerCreation';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';

/** What a completed creation reports back: the stored label and the stored id. */
interface CreatedRecord {
  label:     string;
  reference: string;
}

function CreatedNotice({ created, noun }: { created: CreatedRecord | null; noun: string }): VNode | null {
  if (created === null) return null;
  return (
    <p class="cz-tier-settings__success" role="status">
      <strong>{created.label}</strong> was created as a {noun}. It is in the pool as{' '}
      <code>{created.reference}</code> and is connected to nothing.
    </p>
  );
}

function CreationError({ message }: { message: string | null }): VNode | null {
  return message === null ? null : <p class="cz-station-empty" role="alert">{message}</p>;
}

// ── Create Family ─────────────────────────────────────────────────────────────

export function CreateFamily({ creation }: { creation: PackageManagerCreationState }): VNode {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<CreatedRecord | null>(null);

  const submit = async () => {
    const family = await creation.createFamily(name, description);
    if (!family) return;
    setName('');
    setDescription('');
    setCreated({ label: family.label, reference: family.group_id });
  };

  return (
    <form
      class="cz-tier-settings__form"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      <p class="cz-tier-settings__muted">
        Creates the Package Family only. It joins the Family pool with no Services, no Tier system
        and no assignment; each of those is added where the record that owns it lives.
      </p>
      <div class="cz-tier-settings__field">
        <label for="create-family-name">Family name</label>
        <input
          id="create-family-name"
          class="cz-tier-deck__control"
          value={name}
          required
          onInput={(event) => setName(event.currentTarget.value)}
        />
      </div>
      <div class="cz-tier-settings__field">
        <label for="create-family-description">Description</label>
        <input
          id="create-family-description"
          class="cz-tier-deck__control"
          value={description}
          onInput={(event) => setDescription(event.currentTarget.value)}
        />
      </div>
      <button
        type="submit"
        class="cz-tier-deck__button cz-tier-deck__button--primary"
        disabled={creation.saving || !name.trim()}
      >
        Create Family
      </button>
      <CreatedNotice created={created} noun="Package Family" />
      <CreationError message={creation.error} />
    </form>
  );
}

// ── Create Tier ───────────────────────────────────────────────────────────────

export function CreateTier({ tool }: { tool: TierInstancesToolState }): VNode {
  const [title, setTitle] = useState('');
  const [created, setCreated] = useState<CreatedRecord | null>(null);

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
      <CreatedNotice created={created} noun="Tier system" />
      <CreationError message={tool.error} />
    </form>
  );
}

// ── Create Group ──────────────────────────────────────────────────────────────

export function CreateGroup({ creation, rateSheets }: {
  creation:   PackageManagerCreationState;
  rateSheets: PackageRateSheet[];
}): VNode {
  const [rateSheetId, setRateSheetId] = useState('');
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<CreatedRecord | null>(null);

  const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');

  const submit = async () => {
    const group = await creation.createGroup(rateSheetId, label);
    if (!group) return;
    setLabel('');
    setCreated({ label: group.label, reference: group.group_id });
  };

  if (activeRateSheets.length === 0) {
    return (
      <p class="cz-station-empty">
        A group is stored inside a Rate Sheet, and no active Rate Sheet exists yet. Create one in
        Rate Sheets first.
      </p>
    );
  }

  return (
    <form
      class="cz-tier-settings__form"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      <p class="cz-tier-settings__muted">
        Creates the group only. A group is stored inside one Rate Sheet, so the sheet below is
        where it lives — not a connection. It organises no row and is bound to no Tier.
      </p>
      <div class="cz-tier-settings__field">
        <label for="create-group-sheet">Rate Sheet that stores it</label>
        <select
          id="create-group-sheet"
          class="cz-tier-deck__control"
          value={rateSheetId}
          required
          onChange={(event) => setRateSheetId(event.currentTarget.value)}
        >
          <option value="">Choose Rate Sheet</option>
          {activeRateSheets.map((sheet) => (
            <option key={sheet.rate_sheet_id} value={sheet.rate_sheet_id}>{sheet.title}</option>
          ))}
        </select>
      </div>
      <div class="cz-tier-settings__field">
        <label for="create-group-label">Group name</label>
        <input
          id="create-group-label"
          class="cz-tier-deck__control"
          value={label}
          required
          onInput={(event) => setLabel(event.currentTarget.value)}
        />
      </div>
      <button
        type="submit"
        class="cz-tier-deck__button cz-tier-deck__button--primary"
        disabled={creation.saving || !label.trim() || !rateSheetId}
      >
        Create Group
      </button>
      <CreatedNotice created={created} noun="Rate Sheet group" />
      <CreationError message={creation.error} />
    </form>
  );
}

// ── Create Rate Sheet ─────────────────────────────────────────────────────────

export function CreateRateSheet({ creation }: { creation: PackageManagerCreationState }): VNode {
  const [title, setTitle] = useState('');
  const [created, setCreated] = useState<CreatedRecord | null>(null);

  const submit = async () => {
    const sheet = await creation.createRateSheet(title);
    if (!sheet) return;
    setTitle('');
    setCreated({ label: sheet.title, reference: sheet.rate_sheet_id });
  };

  return (
    <form
      class="cz-tier-settings__form"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      <p class="cz-tier-settings__muted">
        Creates the Rate Sheet only. It joins the Rate Sheet pool active, with no groups and no
        priced rows, and no Tier system is granted access to it.
      </p>
      <div class="cz-tier-settings__field">
        <label for="create-rate-sheet-title">Rate Sheet title</label>
        <input
          id="create-rate-sheet-title"
          class="cz-tier-deck__control"
          value={title}
          required
          onInput={(event) => setTitle(event.currentTarget.value)}
        />
      </div>
      <button
        type="submit"
        class="cz-tier-deck__button cz-tier-deck__button--primary"
        disabled={creation.saving || !title.trim()}
      >
        Create Rate Sheet
      </button>
      <CreatedNotice created={created} noun="Rate Sheet" />
      <CreationError message={creation.error} />
    </form>
  );
}
