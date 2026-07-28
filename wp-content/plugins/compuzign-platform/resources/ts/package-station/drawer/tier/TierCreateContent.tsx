// Tier system creation — the `tier` drawer's `tier-instance:new[:familyId]`
// composition.
//
// It renders the SAME TIER_ENTITY the mature per-occupant drawer uses: Tier
// Overview, Included Features and Common Questions, each in their ordinary
// empty/Pending module state. Only Tier Overview is editable here — its Edit
// changes a local draft only; Save never calls the create endpoint. Included
// Features and Common Questions need the parent Service's resolved Rate Sheet
// catalogue, which does not exist before an instance does, so their Edit stays
// withheld until hand-off (immediately after creation, through the ordinary
// occupant cycle both already follow).
//
// The drawer's own footer (TierDrawerFooter, 'create' mode) is the sole
// authoritative mutation: it mints the instance, links the optional Family,
// persists the drafted overview, and settles the first occupant — then hands
// off to the real instance+occupant identity via onCreated. From that moment
// the caller mounts the ordinary, unmodified TierDrawerContent; this
// composition never renders again for that record.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { evaluateModule, tierFaqsModule, tierFeaturesModule, tierOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { TIER_ENTITY } from '../schema/entities/tier';
import type { TierFaqsShellData, TierFeaturesShellData, TierOverviewShellData } from '../schema/bindings/tier';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import { TIER_LABELS } from '../../vocabulary';
import { TierDrawerFooter } from './TierDrawerFooter';
import { TIER_CREATE_SLOT_ID, useTierCreate, type TierCreateResult } from './useTierCreate';

export interface TierCreateContentProps {
  serviceId: number;
  pendingFamilyId: string | null;
  bridge: EntityDrawerHostBridge;
  onCreated: (result: TierCreateResult) => void;
}

export function TierCreateContent({ serviceId, pendingFamilyId, bridge, onCreated }: TierCreateContentProps): VNode {
  const tc = useTierCreate(serviceId, pendingFamilyId, bridge.onMutationComplete);
  const editing = tc.editDraft !== null;
  // The module's own notification panel, opened from its pill — the same
  // wiring every other module-entry composition provides.
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  useEffect(() => {
    bridge.setFooter(
      <TierDrawerFooter
        mode={editing ? 'none' : 'create'}
        occupied={false}
        enabled={false}
        hasContent={tc.hasContent}
        saving={tc.creating}
        splitOpen={false}
        setSplitOpen={() => {}}
        onToggleEnabled={() => {}}
        onArchive={() => {}}
        onPublish={() => {
          void tc.create().then((result) => { if (result) onCreated(result); });
        }}
        onClose={bridge.close}
      />,
    );
    return () => bridge.setFooter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, editing, tc.hasContent, tc.creating]);

  useEffect(() => {
    bridge.setCloseGuard(editing ? () => window.confirm('Discard unsaved Tier system changes?') : null);
    return () => bridge.setCloseGuard(null);
  }, [bridge, editing]);

  const overviewData: TierOverviewShellData = {
    label:        tc.committed.label,
    idealFor:     tc.committed.ideal_for,
    tierName:     TIER_LABELS[TIER_CREATE_SLOT_ID],
    contact:      false,
    price:        null,
    billingCycle: tc.committed.billing_cycle,
    popular:      false,
    popularLabel: '',
  };
  const overviewBinding: ShellBinding<TierOverviewShellData> = {
    data:  overviewData,
    state: evaluateModule(
      tierOverviewModule,
      { enabled: false, price: null, contact: false, billing_cycle: tc.committed.billing_cycle },
      { platformStatus: 'disabled' },
    ),
    hasDraft: false,
    handlers: { edit: tc.openSection },
  };

  // Withheld handlers, not a broken editor: their content genuinely needs the
  // Rate Sheet catalogue this pre-creation state cannot read yet.
  const featuresBinding: ShellBinding<TierFeaturesShellData> = {
    data:  { items: [] },
    state: evaluateModule(tierFeaturesModule, { count: 0 }, { platformStatus: 'disabled', parentReady: false, parentLabel: 'Tier Overview' }),
    hasDraft: false,
    handlers: {},
  };
  const faqsBinding: ShellBinding<TierFaqsShellData> = {
    data:  { refs: [], pool: [] },
    state: evaluateModule(tierFaqsModule, { count: 0 }, { platformStatus: 'disabled', parentReady: false, parentLabel: 'Tier Overview' }),
    hasDraft: false,
    handlers: {},
  };

  return (
    <EntityDrawer
      entity={TIER_ENTITY}
      bindings={{ overview: overviewBinding, features: featuresBinding, faqs: faqsBinding }}
      openPanel={openPanel}
      onTogglePanel={(module) => setOpenPanel((current) => current === module ? null : module)}
      editing={tc.editDraft ? {
        module: 'overview',
        session: {
          draft: tc.editDraft,
          patch:   (patch) => tc.setEditDraft((current) => current ? { ...current, ...(patch as Partial<TierOverviewEditDraft>) } : current),
          replace: (next) => tc.setEditDraft(next as TierOverviewEditDraft),
          onSave:  async () => tc.saveSection(),
          onCancel: tc.cancelSection,
          saving:  false,
          saveErr: tc.error,
          isDirty: true,
          extras:  { rateSheets: [], hasSelections: false },
        },
      } : null}
    >
      {tc.error && !editing && <div class="cz-admin-error-msg" role="alert">{tc.error}</div>}
    </EntityDrawer>
  );
}
