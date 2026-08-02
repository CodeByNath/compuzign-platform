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

assert.throws(
  () => resolveSupportedFooterActions([
    { id: 'close', label: 'Close', placement: 'close', onSelect: noop },
    { id: 'publish', label: 'Publish', placement: 'primary', onSelect: noop },
    { id: 'enable', label: 'Enable', placement: 'primary', onSelect: noop },
  ]),
  /at most one primary/,
);

assert.throws(
  () => resolveSupportedFooterActions([
    { id: 'publish', label: 'Publish', placement: 'primary', onSelect: noop },
  ]),
  /exactly one Close/,
);

console.log('Supported action footer contract: OK');
