// Service Home Settings lane — exactly two launchers: Create Service and
// Create Category. Each opens the SAME mature drawer its normal edit flow
// already uses, addressed by the stable `'new'` recordId sentinel the drawer
// host resolves into a pending record — the same grammar Package Home's
// Package Manager launchers already use for Family/Rate Sheet creation. This
// lane holds no draft, validation, endpoint, or save of its own, and creates no
// second drawer, schema, or footer.

import type { VNode } from 'preact';
import type { StationIntentDispatch } from '@/station-manager/registry/templateKits';

function SettingsLauncher({ label, note, onLaunch }: {
  label: string;
  note: string;
  onLaunch: () => void;
}): VNode {
  return (
    <li class="cz-station-list__row cz-station-list__row--service-settings">
      <div class="cz-station-list__cell cz-service-settings__launcher">
        <p class="cz-service-settings__muted">{note}</p>
        <button type="button" class="cz-service-deck__button cz-service-deck__button--primary" onClick={onLaunch}>
          {label}
        </button>
      </div>
    </li>
  );
}

export function ServiceSettingsLane({ onIntent }: { onIntent: StationIntentDispatch }): VNode {
  return (
    <ul class="cz-station-list cz-service-settings__launchers">
      <SettingsLauncher
        label="Create Service"
        note="Opens the readable Service creation module. Its drawer owns the fields and save; the new Service starts unpublished with no Included Features or Common Questions."
        onLaunch={() => onIntent('new', 'create-service')}
      />
      <SettingsLauncher
        label="Create Category"
        note="Opens the readable Category creation module. Its drawer owns the fields and save; the new Category starts with no assigned Services."
        onLaunch={() => onIntent('new', 'create-category')}
      />
    </ul>
  );
}
