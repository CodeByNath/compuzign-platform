import type { VNode } from 'preact';
import { resolvePackageCapability } from './capabilityRegistry';
import { usePackageCapabilities } from './usePackageCapabilities';
import type { DrawerContentProps } from '../drawers/drawerTypes';

function contextString(context: DrawerContentProps['context'], key: string): string | null {
  const value = context?.[key];
  return typeof value === 'string' ? value : null;
}

/** Assignment editor hosted by the one Admin Station drawer shell. */
export function PackageCapabilityDrawerHost({
  recordId,
  context,
  onSaved,
}: DrawerContentProps): VNode {
  const capabilities = usePackageCapabilities();
  const capabilityKey = contextString(context, 'capabilityKey');
  const ownerType = contextString(context, 'ownerType');
  const ownerId = contextString(context, 'ownerId');
  const definition = capabilityKey ? resolvePackageCapability(capabilityKey) : null;

  if (typeof recordId !== 'string'
    || recordId !== ownerId
    || ownerType !== 'package-manager'
    || !definition
    || !definition.supportedOwnerTypes.includes(ownerType)
  ) {
    return <div class="cz-station-drawer__state">This capability assignment is invalid.</div>;
  }

  if (capabilities.loading && !capabilities.data) {
    return <div class="cz-station-drawer__state">Loading Package capabilities…</div>;
  }

  const enabled = capabilities.isEnabled(ownerType, ownerId, definition.capabilityKey);
  const update = async () => {
    const saved = await capabilities.setEnabled({
      ownerType,
      ownerId,
      capabilityKey: definition.capabilityKey,
      enabled: !enabled,
    });
    if (saved) onSaved();
  };

  return (
    <div class="cz-req-detail">
      <section class="cz-shell-section">
        <p class="cz-shell-section__title">{definition.label}</p>
        <p class="cz-station-empty">
          {enabled
            ? `${definition.label} is enabled for Package Manager.`
            : `${definition.label} is available but not enabled for Package Manager.`}
        </p>
        {capabilities.error && <p class="cz-station-empty" role="alert">{capabilities.error}</p>}
        <button
          type="button"
          class={`cz-admin-btn ${enabled ? 'cz-admin-btn--secondary' : 'cz-admin-btn--primary'}`}
          disabled={capabilities.saving}
          onClick={update}
        >
          {capabilities.saving ? 'Saving…' : enabled ? `Disable ${definition.label}` : `Enable ${definition.label}`}
        </button>
      </section>
    </div>
  );
}
