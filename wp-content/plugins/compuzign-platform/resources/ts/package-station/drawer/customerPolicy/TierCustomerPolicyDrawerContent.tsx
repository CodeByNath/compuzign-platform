// Customer Selection Rules drawer composition — host-neutral.
//
// Assembles TIER_CUSTOMER_POLICY_ENTITY through the shared EntityDrawer: one
// Details-tab shell, switched into CustomerPolicyEditor while editing. The
// record footer goes to the host through the shared bridge and is nulled
// while editing, because InlineEditorShell carries its own Save / Cancel —
// the same rule every other Package Station composition follows.
//
// Not reachable before the composable occupant is genuinely published: an
// ineligible occupant renders its own explanatory state rather than an
// editor with nothing real to reference (correction round requirement —
// see docs/code-map/tier-composable-occupant-admin-customer-policy.md).

import { useEffect } from 'preact/hooks';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { TIER_CUSTOMER_POLICY_ENTITY } from '../schema/entities/tierCustomerPolicy';
import { useTierCustomerPolicyDrawerController } from './useTierCustomerPolicyDrawerController';
import type { TierCustomerPolicyDrawerContentProps } from './tierCustomerPolicyDrawerTypes';

export function TierCustomerPolicyDrawerContent(props: TierCustomerPolicyDrawerContentProps) {
  const c = useTierCustomerPolicyDrawerController(props);
  const { bridge } = props;

  useEffect(() => {
    if (c.editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: c.requestClose }} />,
    );
    return () => bridge.setFooter(null);
  }, [bridge, c.editing, c.requestClose]);

  if (!c.loading && !c.stationAvailable) {
    return (
      <div class="cz-req-detail">
        <ReadBlock
          title="Customer Selection Rules unavailable"
          subtitle="This service's Package Station could not be read."
          actions={[{ id: 'refresh', label: 'Refresh', onSelect: () => c.refetch() }]}
        >
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">Package Station not read</p>
            <p class="drawerModule__empty-copy">
              Build Your Own could not be loaded, so its customer selection rules cannot be shown.
              Refresh to try again; if the problem persists, contact an administrator.
            </p>
          </div>
        </ReadBlock>
      </div>
    );
  }

  if (!c.loading && !c.detail) {
    return (
      <div class="cz-station-drawer__state">
        This Tier system has no Build Your Own occupant.
      </div>
    );
  }

  if (!c.loading && !c.eligible) {
    return (
      <div class="cz-station-drawer__state">
        Build Your Own must be configured and published before customer selection rules can be authored.
      </div>
    );
  }

  return (
    <EntityDrawer
      entity={TIER_CUSTOMER_POLICY_ENTITY}
      bindings={{ overview: c.overviewBinding }}
      openPanel={c.openPanel}
      onTogglePanel={(module) => c.setOpenPanel((open) => open === module ? null : module)}
      editing={c.editing ? {
        module: 'overview',
        session: {
          draft:  c.draft,
          replace: (next) => c.setDraft(next as typeof c.draft),
          onSave:   c.saveDraft,
          onCancel: c.cancelEdit,
          saving:   c.saving,
          saveErr:  c.saveErr,
          isDirty:  true,
          title:   'Customer Selection Rules',
          extras:  { rateSheetCatalogue: c.rateSheetCatalogue },
        },
      } : null}
    >
      {/* saveTierCustomerPolicy writes the occupant's own customer_policy
          draft; settling belongs to Build Your Own's own Publish action,
          so this must not read as published. */}
      {c.saveOk && <div class="cz-admin-ok-msg">Saved — settle Build Your Own to publish.</div>}
      {!c.editing && c.saveErr && <div class="cz-admin-error-msg" role="alert">{c.saveErr}</div>}
      {c.exitDialog && (
        <div class="cz-sc-table__confirm" role="alertdialog" aria-label="Discard unsaved customer selection rules">
          <span class="cz-sc-table__confirm-label">Discard the unsaved customer selection rules?</span>
          <button type="button" class="button" onClick={() => c.setExitDialog(false)}>Keep editing</button>
          <button type="button" class="button button-primary" onClick={c.handleExitDiscard}>Discard</button>
        </div>
      )}
    </EntityDrawer>
  );
}
