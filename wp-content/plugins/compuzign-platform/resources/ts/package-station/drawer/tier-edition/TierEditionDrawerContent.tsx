// Scoped Tier Edition drawer — content for the registered `tier-edition`
// drawer template.
//
// A Tier Edition is an independently addressed, independently lifecycled
// child record of one occupant: this drawer gives it the same canonical
// StationLifecycle footer (publish / disable / enable / archive / trash /
// restore / permanently delete) every other conforming entity (Category,
// Package Family) already gets from CanonicalEntityFooter — not a bespoke
// footer, not a second lifecycle system. It never opens (or is opened from
// within) the parent Tier drawer: drawer content cannot open another drawer
// (see StationDrawerLifecycleContract-v1.md — "never nests another
// drawer"), so this is a sibling entry point, reached the same way
// tier-rate-sheet:{...} is — from a Home-level (workspace) surface, not
// from inside the mounted Tier drawer's own content.
//
// The editor form is TierEditionOverviewFields, shared verbatim with the
// inline TierEditionsPanel — the two surfaces render literally the same
// form rather than two copies that could drift.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { CanonicalEntityFooter } from '@/drawer-kit/CanonicalEntityFooter';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { decodeTierEditionDrawerRecordId } from './tierEditionDrawerTypes';
import type { TierEditionDrawerTarget } from './tierEditionDrawerTypes';
import { useTierEditionDrawer } from '../../surface/tierSurface/useTierEditionDrawer';
import { TierEditionOverviewFields } from '../tier/TierEditionOverviewFields';
import { draftFromTierEdition, tierEditionStatusLabel } from '../tier/tierEditionModel';
import type { TierEditionOverviewDraft } from '../../types';
import { TIER_LABELS } from '../../vocabulary';

export function TierEditionDrawerContent(props: DrawerContentProps): VNode {
  const target = typeof props.recordId === 'string'
    ? decodeTierEditionDrawerRecordId(props.recordId)
    : null;
  if (target === null) {
    return <div class="cz-station-drawer__state">This Tier Edition identity is invalid.</div>;
  }
  return <TierEditionDrawerBody target={target} {...props} />;
}

function TierEditionDrawerBody({
  target, mode, onClose, onModeChange, onSaved, setFooter, setCloseGuard,
}: DrawerContentProps & { target: TierEditionDrawerTarget }): VNode | null {
  const savedRef = useRef(onSaved); savedRef.current = onSaved;
  const notifySaved = () => savedRef.current();

  const scope = useTierEditionDrawer(target.instanceId, target.slotId, target.editionId, notifySaved);
  const { edition, ctl } = scope;

  const editing = mode === 'edit';
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);

  // Opening Edit seeds a fresh draft from the authoritative Edition every
  // time — never a stale one left over from a previous open, matching the
  // occupant's own module-editor convention (draft state lives only while
  // editing, discarded on Cancel/Save alike).
  useEffect(() => {
    if (editing && edition) setDraft(draftFromTierEdition(edition));
    if (!editing) setDraft(null);
  }, [editing, edition?.id]);

  useEffect(() => {
    setCloseGuard?.(editing ? () => window.confirm('Discard unsaved Edition changes?') : null);
    return () => setCloseGuard?.(null);
  }, [setCloseGuard, editing]);

  const requestEdit = () => onModeChange('edit');
  const cancelEdit = () => onModeChange('view');
  const saveDraft = async () => {
    if (!edition || !draft) return;
    const ok = await ctl.saveDraft(edition.id, draft);
    if (ok) await ctl.settle(edition.id);
    onModeChange('view');
  };

  // The one canonical StationLifecycle footer — the exact same component
  // Category/Package Family use, mapped from this Edition's own status.
  // Nulled while editing: TierEditionOverviewFields' own Save/Cancel owns
  // the footer then, the same rule every other conforming entity follows.
  const [splitOpen, setSplitOpen] = useState(false);
  useEffect(() => {
    if (!setFooter) return;
    if (editing || !edition) { setFooter(null); return () => setFooter(null); }
    const isDisabledMasked = edition.platform_status === 'disabled' && edition.previous_platform_status !== null;
    setFooter(
      <CanonicalEntityFooter
        platformStatus={edition.platform_status}
        isDisabledMasked={isDisabledMasked}
        isNewNeverPublished={edition.edition_platform_id === ''}
        hasBeenPublished={edition.edition_platform_id !== ''}
        canPublish={edition.platform_status === 'disabled'}
        busy={ctl.saving}
        splitOpen={splitOpen}
        setSplitOpen={setSplitOpen}
        onToggleActive={() => (isDisabledMasked ? ctl.enable(edition.id) : ctl.disable(edition.id))}
        onArchive={() => ctl.archive(edition.id)}
        onTrash={() => ctl.trash(edition.id)}
        onRestore={() => ctl.restore(edition.id)}
        onDelete={() => ctl.remove(edition.id)}
        onPublish={() => ctl.publish(edition.id)}
        onClose={onClose}
      />,
    );
    return () => setFooter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFooter, editing, edition, ctl.saving, splitOpen, onClose]);

  if (scope.loading) {
    return <div class="cz-station-drawer__state" aria-busy="true">Loading this Tier Edition…</div>;
  }
  if (scope.unavailable !== null) {
    return (
      <div class="cz-req-detail">
        <ReadBlock title="Tier Edition unavailable" subtitle={scope.unavailable}>
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-copy">
              This Edition could not be read. It may have been permanently deleted, or its
              parent occupant may have moved. Close and reopen from the Tier's own Editions list.
            </p>
          </div>
        </ReadBlock>
      </div>
    );
  }
  if (edition === null) return null;

  if (editing && draft) {
    return (
      <div class="cz-req-detail">
        <TierEditionOverviewFields
          draft={draft}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
          rateSheetOptions={scope.rateSheetOptions}
          svc={scope.svc ?? { rate_sheets: [], package_relationships: [] }}
        />
        <EntityActionFooter
          close={{ id: 'cancel', label: 'Cancel', onSelect: cancelEdit, disabled: ctl.saving }}
          primary={{ id: 'save', label: 'Save', onSelect: saveDraft, busy: ctl.saving }}
        />
      </div>
    );
  }

  return (
    <div class="cz-req-detail">
      <ReadBlock
        title={edition.title}
        subtitle={`Payment Edition of ${TIER_LABELS[target.slotId] ?? target.slotId}`}
        actions={[{ id: 'edit', label: 'Edit', onSelect: requestEdit }]}
      >
        <div class="drawerModule__fields">
          <div class="drawerModule__field">
            <p class="drawerModule__label">Status</p>
            <p class="drawerModule__value">{tierEditionStatusLabel(edition)}</p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Pricing</p>
            <p class="drawerModule__value">
              {edition.price != null ? `$${edition.price.toFixed(2)}` : edition.contact ? 'Contact' : 'Not configured'}
              {' · '}{edition.billing_cycle ?? 'No billing cycle'}
            </p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Minimum Commitment</p>
            <p class="drawerModule__value">
              {edition.minimum_term_value != null ? `${edition.minimum_term_value} ${edition.minimum_term_unit ?? ''}` : 'None'}
            </p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Rate Sheet Selections</p>
            <p class="drawerModule__value">{edition.rate_sheet_items.length} row(s) selected</p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Platform ID</p>
            <p class="drawerModule__value">{edition.edition_platform_id || 'Assigned after Publish'}</p>
          </div>
          {edition.admin_description && (
            <div class="drawerModule__field">
              <p class="drawerModule__label">Admin Description</p>
              <p class="drawerModule__value">{edition.admin_description}</p>
            </div>
          )}
        </div>
      </ReadBlock>
    </div>
  );
}
