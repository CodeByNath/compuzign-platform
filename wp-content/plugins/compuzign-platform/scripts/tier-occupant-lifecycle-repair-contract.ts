// Locks the Tier Occupant Lifecycle Repair Blueprint's presentation contract
// (docs/code-map/tier-occupant-lifecycle-repair.md): the occupant's own
// is_explicitly_disabled marker — not parent Tier Group/station status — is
// occupant truth; per-module Overview/Features/FAQs independence; and the
// canonical draft/pending notification copy.

import { resolveTierStatus } from '../resources/ts/drawer-kit/utils/moduleStatus';
import type { TierLike } from '../resources/ts/drawer-kit/utils/moduleStatus';
import {
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
  getTierNotes,
} from '../resources/ts/drawer-kit/utils/moduleNotifications/tier';
import { evaluateModule } from '../resources/ts/drawer-kit/utils/moduleNotifications/shared';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier occupant lifecycle repair contract: ${message}`);
}

// ── resolveTierStatus: occupant truth, not Tier Group/station status ───────

const unconfigured: TierLike = { enabled: false, is_explicitly_disabled: false, price: null, billing_cycle: null };
check(resolveTierStatus(unconfigured, { pkgStatus: 'active' }) === 'pending-dim', 'first incomplete configuration reads Pending dim');
check(resolveTierStatus(undefined, { pkgStatus: 'active' }) === 'pending-dim', 'no occupant reads Pending dim');

const readyUnpublished: TierLike = { enabled: false, is_explicitly_disabled: false, price: 10, billing_cycle: 'monthly' };
check(resolveTierStatus(readyUnpublished, { pkgStatus: 'active' }) === 'pending-full', 'a ready, unpublished, unmasked occupant reads Pending full regardless of the parent status');
check(resolveTierStatus(readyUnpublished, { pkgStatus: 'disabled' }) === 'pending-full', 'Pending full never depends on the parent Tier Group/station status — occupant truth only');

const published: TierLike = { enabled: true, is_explicitly_disabled: false, price: 10, billing_cycle: 'monthly' };
check(resolveTierStatus(published, { pkgStatus: 'disabled' }) === 'active', 'Publish (enabled: true) reads Active even while the parent station is not active');

const explicitlyDisabled: TierLike = { enabled: true, is_explicitly_disabled: true, price: 10, billing_cycle: 'monthly' };
check(resolveTierStatus(explicitlyDisabled, { pkgStatus: 'active' }) === 'disabled', 'the explicit marker reads Disabled even over a stale active flag');

const enabledButUnpublished: TierLike = { enabled: false, is_explicitly_disabled: false, price: 10, billing_cycle: 'monthly' };
check(resolveTierStatus(enabledButUnpublished, { pkgStatus: 'active' }) === 'pending-full', 'Enable (marker cleared, still unpublished) reads Pending, never Disabled');

const incompleteButMarkerClear: TierLike = { enabled: false, is_explicitly_disabled: false, price: null, billing_cycle: null };
check(resolveTierStatus(incompleteButMarkerClear, { pkgStatus: 'active' }) === 'pending-dim', 'an empty shell never reads Disabled, even before any marker exists');

// ── Per-module independence: own moduleTransition/hasDraft/disabled/platformStatus ──

const overviewComplete = true;

const settledCtx = { platformStatus: 'active', moduleTransition: 'settled', hasDraft: false, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const overviewState = evaluateModule(tierOverviewModule, published, settledCtx);
check(overviewState.status === 'active', 'a settled, published Overview module reads Active');

const pendingCtx = { platformStatus: 'disabled', moduleTransition: 'pending', hasDraft: true, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const editedOverviewState = evaluateModule(tierOverviewModule, readyUnpublished, pendingCtx);
check(editedOverviewState.status === 'pending-full', 'ready module Save reads Pending full for that module');

// The canonical draft-saved note is reachable for Tier occupant modules (it
// was unreachable before this repair — includeDraftInTail was never set).
// It surfaces once there is something live to contrast against: an already-
// Active occupant with a fresh, unsettled edit on top. A never-published
// occupant's own draft correctly reads publication guidance instead — there
// is nothing live yet to say "not published" about.
const liveEditCtx = { platformStatus: 'active', moduleTransition: 'pending', hasDraft: true, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const liveEditState = evaluateModule(tierOverviewModule, published, liveEditCtx);
check(
  liveEditState.notes.some((n) => n.message === 'Draft saved — settle to publish'),
  'an unsettled edit on an already-Active occupant reuses the canonical draft-saved note text'
);
check(
  editedOverviewState.notes.some((n) => n.message.startsWith('Waiting for')),
  'a never-published occupant\'s own pending draft reads publication guidance, not the draft-saved note'
);

// Siblings retain their own state — Features stays settled/active while
// Overview above is mid-edit, because each module receives its OWN ctx.
const featuresSettledCtx = { platformStatus: 'active', moduleTransition: 'settled', hasDraft: false, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const featuresState = evaluateModule(tierFeaturesModule, { count: 3 }, featuresSettledCtx);
check(featuresState.status === 'active', 'a sibling module independently reads Active while Overview is mid-edit');

// An incomplete module (no draft, never configured) stays dim, never full.
const dimCtx = { platformStatus: 'disabled', moduleTransition: 'not-configured', hasDraft: false, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const emptyFaqsState = evaluateModule(tierFaqsModule, { count: 0 }, dimCtx);
check(emptyFaqsState.status === 'pending-dim', 'an incomplete module remains Pending dim, never promoted by a sibling draft');

// Explicit Disable masks every module, independent of transition/draft state.
const disabledCtx = { platformStatus: 'disabled', moduleTransition: 'pending', hasDraft: true, disabled: true, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const disabledOverviewState = evaluateModule(tierOverviewModule, published, disabledCtx);
check(disabledOverviewState.status === 'disabled', 'Disable masks a module even with a live draft underneath it');

// Inactive-unmasked publication guidance: settled, unpublished, unmasked.
const waitingCtx = { platformStatus: 'disabled', moduleTransition: 'settled', hasDraft: false, disabled: false, parentReady: overviewComplete, parentLabel: 'Tier Overview' };
const waitingState = evaluateModule(tierOverviewModule, readyUnpublished, waitingCtx);
check(waitingState.status === 'pending-full', 'a settled, unpublished, unmasked module reads Pending full');
check(
  waitingState.notes.some((n) => n.message.startsWith('Waiting for')),
  'a settled, unpublished, unmasked module carries publication guidance'
);

// ── getTierNotes: Disabled precedes every other note ────────────────────────

const disabledNotes = getTierNotes(explicitlyDisabled, { platformStatus: 'active', disabled: true });
check(disabledNotes.length === 1 && disabledNotes[0].message.includes('disabled'), 'Disabled precedes every other note in the whole-tier fold');

console.log('Tier occupant lifecycle repair contract checks passed.');
