import { derivePackageFamilyFooterState } from '../resources/ts/package-station/drawer/package-family/usePackageFamilyDrawerController';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family footer signal contract: ${message}`);
  console.log(`  ok — ${message}`);
}

function state(
  groupId: string,
  platformStatus: string,
  moduleTransition: string,
  overviewStatus: string,
  hasDraft = false,
) {
  return derivePackageFamilyFooterState({
    group_id: groupId,
    platform_status: platformStatus,
    module_status: { overview: moduleTransition },
  }, overviewStatus, hasDraft);
}

console.log('Package Family footer signal contract\n');

const localNew = state('', 'disabled', 'not-configured', 'pending-dim');
check(localNew.isNewNeverPublished, 'only the identity-less local seed is new-never-published');
check(!localNew.canPublish, 'the local seed cannot publish');
check(!localNew.hasBeenPublished, 'the local seed has no published signal');

const persistedPending = state('pcg_pending', 'disabled', 'pending', 'pending-full');
check(!persistedPending.isNewNeverPublished, 'a returned native identity leaves the local-new state');
check(persistedPending.canPublish, 'a complete persisted Pending Family can publish');
check(!persistedPending.hasBeenPublished, 'a first-publication Pending Family does not unlock Archive');

const active = state('pcg_active', 'active', 'settled', 'active');
check(active.hasBeenPublished, 'an Active Family carries the published footer signal');

const disabledSettled = state('pcg_disabled', 'disabled', 'settled', 'disabled');
check(disabledSettled.hasBeenPublished, 'a settled explicitly Disabled Family retains the published signal');

const enabledPendingDraft = state('pcg_enabled', 'disabled', 'pending', 'pending-full', true);
check(!enabledPendingDraft.isNewNeverPublished, 'an Enabled pending-draft Family is still a persisted record');
check(enabledPendingDraft.canPublish, 'an Enabled pending-draft Family can return through Publish');
check(!enabledPendingDraft.hasBeenPublished, 'the Category-equivalent transition signal does not invent stored history');

const restoredSettled = state('pcg_restored', 'disabled', 'settled', 'pending-full');
check(restoredSettled.hasBeenPublished, 'a restored settled Family retains the settled publication signal');

console.log('\nAll Package Family footer signal checks passed.');
