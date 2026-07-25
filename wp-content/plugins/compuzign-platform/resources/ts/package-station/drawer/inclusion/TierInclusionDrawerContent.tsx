// Tier Inclusion drawer composition — host-neutral.
//
// Assembles TIER_INCLUSION_ENTITY through the shared EntityDrawer: the Overview
// tab reads the record and switches its one module to the mature inline editor;
// the Connections tab places the three relationship shells. The record footer
// goes to the host through the shared bridge and is nulled while editing,
// because InlineEditorShell carries its own Save / Cancel — the same rule the
// Package Family and Tier compositions follow.

import { useEffect } from 'preact/hooks';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { TIER_INCLUSION_ENTITY } from '../schema/entities/tierInclusion';
import { useTierInclusionDrawerController } from './useTierInclusionDrawerController';
import type { TierInclusionDrawerContentProps } from './tierInclusionDrawerTypes';

export function TierInclusionDrawerContent(props: TierInclusionDrawerContentProps) {
  const c = useTierInclusionDrawerController(props);
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

  // An unreachable or unseeded station is not evidence about the Tier's
  // selections, so it gets its own recoverable state — the same distinction the
  // Tier drawer draws — rather than asserting the inclusion was removed.
  if (!c.loading && !c.stationAvailable) {
    return (
      <div class="cz-req-detail">
        <ReadBlock
          title="Inclusion unavailable"
          subtitle="This service's Package Station could not be read."
          actions={[{ id: 'refresh', label: 'Refresh', onSelect: () => c.refetch() }]}
        >
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">Package Station not read</p>
            <p class="drawerModule__empty-copy">
              The Tier's selections could not be loaded, so this inclusion cannot be shown.
              Refresh to try again; if the problem persists, contact an administrator.
            </p>
          </div>
        </ReadBlock>
      </div>
    );
  }

  if (!c.loading && !c.record) {
    return (
      <div class="cz-station-drawer__state">
        This Tier no longer selects this inclusion.
      </div>
    );
  }

  return (
    <EntityDrawer
      entity={TIER_INCLUSION_ENTITY}
      tab={c.tab}
      onSelectTab={c.selectTab}
      bindings={{
        overview:     c.overviewBinding,
        service:      c.serviceBinding,
        category:     c.categoryBinding,
        'rate-sheet': c.rateSheetBinding,
      }}
      openPanel={c.openPanel}
      onTogglePanel={(module) => c.setOpenPanel((open) => open === module ? null : module)}
      editing={c.editing && c.draft ? {
        module: 'overview',
        session: {
          draft:  c.draft,
          patch:  (patch) => c.setDraft((current) => current ? { ...current, ...patch } : current),
          replace: (next) => c.setDraft(next as typeof c.draft),
          onSave:   c.saveQuantity,
          onCancel: c.cancelEdit,
          saving:   c.saving,
          saveErr:  c.saveErr,
          isDirty:  c.isDirty,
          saveDisabled: c.saveDisabled,
          title:   c.record ? `${c.record.name} — Quantity` : 'Quantity',
          extras:  c.editorExtras,
        },
      } : null}
    >
      {/* saveTierFeatures writes the Tier's features draft; settling belongs to
          the Tier, so this must not read as published. */}
      {c.saveOk && <div class="cz-admin-ok-msg">Quantity saved — settle the Tier to publish.</div>}
      {!c.editing && c.saveErr && <div class="cz-admin-error-msg" role="alert">{c.saveErr}</div>}
      {c.exitDialog && (
        <div class="cz-sc-table__confirm" role="alertdialog" aria-label="Discard unsaved quantity">
          <span class="cz-sc-table__confirm-label">Discard the unsaved quantity change?</span>
          <button type="button" class="button" onClick={() => c.setExitDialog(false)}>Keep editing</button>
          <button type="button" class="button button-primary" onClick={c.handleExitDiscard}>Discard</button>
        </div>
      )}
    </EntityDrawer>
  );
}
