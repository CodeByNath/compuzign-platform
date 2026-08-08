import assert from 'node:assert/strict';
import { resolveSupportedFooterActions, type SupportedFooterAction } from '../resources/ts/drawer-kit/SupportedActionFooter';

const noop = () => {};
const actions: SupportedFooterAction[] = [
  { id: 'delete', label: 'Delete', placement: 'split', tone: 'danger', onSelect: noop },
  { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
  { id: 'apply', label: 'Apply', placement: 'primary', onSelect: noop },
];

const resolved = resolveSupportedFooterActions(actions);
assert.equal(resolved.close.id, 'close');
assert.equal(resolved.primary?.id, 'apply');
assert.equal(resolved.split?.id, 'delete');
assert.equal(resolved.split?.tone, 'danger');
// The unified Tier lifecycle menu (correction plan) is the only opt-in
// consumer of menuOnly; every existing caller that omits it — as this one
// does — must keep resolving to false, so the click-immediately behavior
// every other footer consumer's regression suite already proves stays
// byte-identical.
assert.equal(resolved.split?.menuOnly, false, 'omitting menuOnly on the descriptor resolves to false — today\'s direct-click behavior, unchanged');

const menuOnlyResolved = resolveSupportedFooterActions([
  { id: 'delete', label: 'Delete', placement: 'split', tone: 'danger', onSelect: noop, menuOnly: true },
  { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
]);
assert.equal(menuOnlyResolved.split?.menuOnly, true, 'an explicit opt-in caller can set menuOnly: true');

assert.throws(
  () => resolveSupportedFooterActions([
    { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
    { id: 'publish', label: 'Publish', placement: 'primary', onSelect: noop },
    { id: 'enable', label: 'Enable', placement: 'primary', onSelect: noop },
  ]),
  /at most one of each/,
);

assert.throws(
  () => resolveSupportedFooterActions([
    { id: 'publish', label: 'Publish', placement: 'primary', onSelect: noop },
  ]),
  /exactly one Close/,
);

// splitForward (UI refinement, Phase 1) — a second, independent split for
// the footer's opposite side (e.g. the Tier drawer's own forward/publish
// split, next to its backward/travel `split`). Additive: every caller that
// omits it, including every non-Tier consumer, keeps resolving splitForward
// to null and is otherwise unaffected.
const withSplitForward = resolveSupportedFooterActions([
  { id: 'delete', label: 'Delete', placement: 'split', tone: 'danger', onSelect: noop },
  { id: 'publish', label: 'Publish', placement: 'split-forward', tone: 'secondary', onSelect: noop, menuOnly: true },
  { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
]);
assert.equal(withSplitForward.split?.id, 'delete');
assert.equal(withSplitForward.splitForward?.id, 'publish');
assert.equal(withSplitForward.splitForward?.tone, 'secondary');
assert.equal(withSplitForward.splitForward?.menuOnly, true);

assert.equal(resolved.splitForward, null, 'omitting split-forward resolves to null — every existing caller is unaffected');

assert.throws(
  () => resolveSupportedFooterActions([
    { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
    { id: 'publish', label: 'Publish', placement: 'split-forward', onSelect: noop },
    { id: 'archive', label: 'Archive', placement: 'split-forward', onSelect: noop },
  ]),
  /at most one of each/,
);

console.log('Supported action footer contract: OK');
