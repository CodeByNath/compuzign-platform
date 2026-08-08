// Pure contract for buildTierLifecycleMenu (single-footer, scope-aware
// lifecycle command model, Phase 3). No DOM, no bundling — the function is
// plain TypeScript, so this is a direct import + assertion, same style as
// supported-action-footer-contract.ts. The mounted-DOM proof (real clicks,
// real endpoints) is Phase 5's regression; this file proves the MODEL is
// correct in isolation, against the exact matrix and worked examples the
// audit was approved against.

import assert from 'node:assert/strict';
import { buildTierLifecycleMenu, type TierLifecycleInputs, type SelectedEditionLifecycleInputs } from '../resources/ts/package-station/drawer/tier/tierLifecycleMenu';

const noop = () => {};

function tier(overrides: Partial<TierLifecycleInputs> = {}): TierLifecycleInputs {
  return {
    hasBeenPublished: true, enabled: true, hasContent: true,
    onPublish: noop, onToggleEnabled: noop, onArchive: noop,
    ...overrides,
  };
}
function edition(overrides: Partial<SelectedEditionLifecycleInputs> = {}): SelectedEditionLifecycleInputs {
  return {
    id: 'edt_1', title: 'Nath', platformStatus: 'active', disabledMasked: false, canPublish: true,
    onPublish: noop, onDisable: noop, onEnable: noop, onTrash: noop, onDelete: noop, onRestore: noop, onMoveToBin: noop,
    ...overrides,
  };
}
function labels(model: ReturnType<typeof buildTierLifecycleMenu>): string[] {
  return model.entries.map((e) => e.label);
}

let failures = 0;
function check(label: string, cond: unknown, detail?: unknown) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures += 1; }
}

console.log('Tier lifecycle menu contract (single-footer, scope-aware command model)\n');

console.log('1) Approved worked example — Edition Active + Tier Disabled');
{
  const model = buildTierLifecycleMenu(
    tier({ hasBeenPublished: true, enabled: false }),
    edition({ platformStatus: 'active' }),
  );
  check('top-level label is Disable (Edition\'s own immediate transition)', model.splitLabel === 'Disable', model.splitLabel);
  check('exactly the three approved rows, in the approved order', JSON.stringify(labels(model)) === JSON.stringify([
    'Disable Edition — Nath', 'Enable Tier', 'Archive Tier',
  ]), labels(model));
}

console.log('\n2) Approved worked example — Edition Disabled + Tier Active');
{
  const model = buildTierLifecycleMenu(
    tier({ hasBeenPublished: true, enabled: true }),
    edition({ platformStatus: 'disabled', disabledMasked: true }),
  );
  check('top-level label is Enable (Edition\'s own immediate transition)', model.splitLabel === 'Enable', model.splitLabel);
  check('exactly the three approved rows, in the approved order', JSON.stringify(labels(model)) === JSON.stringify([
    'Enable Edition — Nath', 'Disable Tier', 'Archive Tier',
  ]), labels(model));
}

console.log('\n3) No Edition selected — the footer behaves like the normal Tier footer');
{
  const neverPublishedNoContent = buildTierLifecycleMenu(tier({ hasBeenPublished: false, hasContent: false }), null);
  check('never-published, no content: top label is Move to Trash (today\'s exact fallback)', neverPublishedNoContent.splitLabel === 'Move to Trash');
  check('no Publish row when there is nothing to publish', labels(neverPublishedNoContent).every((l) => !l.includes('Publish')));
  check('exactly one row: Move Tier to Trash', JSON.stringify(labels(neverPublishedNoContent)) === JSON.stringify(['Move Tier to Trash']));

  const neverPublishedWithContent = buildTierLifecycleMenu(tier({ hasBeenPublished: false, hasContent: true }), null);
  check('never-published with content: top label is still Move to Trash — unchanged from today\'s split label', neverPublishedWithContent.splitLabel === 'Move to Trash');
  check('Publish Tier is offered as a menu row, ahead of Move Tier to Trash', JSON.stringify(labels(neverPublishedWithContent)) === JSON.stringify(['Publish Tier', 'Move Tier to Trash']));

  const active = buildTierLifecycleMenu(tier({ hasBeenPublished: true, enabled: true }), null);
  check('active: top label is Disable', active.splitLabel === 'Disable');
  check('active: Disable Tier then Archive Tier', JSON.stringify(labels(active)) === JSON.stringify(['Disable Tier', 'Archive Tier']));

  const disabled = buildTierLifecycleMenu(tier({ hasBeenPublished: true, enabled: false }), null);
  check('disabled: top label is Enable', disabled.splitLabel === 'Enable');
  check('disabled: Enable Tier then Archive Tier', JSON.stringify(labels(disabled)) === JSON.stringify(['Enable Tier', 'Archive Tier']));
  check('no Edition-scoped entry ever appears with no selected Edition', labels(disabled).every((l) => !l.includes('Edition')));
}

console.log('\n4) Selected Edition, Pending (never published)');
{
  const canPublish = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: false, canPublish: true }));
  check('top label is Publish', canPublish.splitLabel === 'Publish');
  check('Publish Edition leads, Tier\'s own row(s) follow', JSON.stringify(labels(canPublish)) === JSON.stringify([
    'Publish Edition — Nath', 'Disable Tier', 'Archive Tier',
  ]), labels(canPublish));

  const cannotPublish = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: false, canPublish: false }));
  check('top label is still Publish even when not yet actionable', cannotPublish.splitLabel === 'Publish');
  check('no ghost Publish row when the Edition is not actually publishable', labels(cannotPublish).every((l) => !l.includes('Edition')), labels(cannotPublish));
  check('Tier\'s own valid action is never hidden just because nothing is offered for the Edition', JSON.stringify(labels(cannotPublish)) === JSON.stringify(['Disable Tier', 'Archive Tier']));
}

console.log('\n5) Selected Edition, Archived/Trashed — Move Edition to Bin rises near the top, distinct from Archive');
{
  const archived = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'archived' }));
  check('top label is Restore', archived.splitLabel === 'Restore');
  check('Restore, then Move Edition to Bin, then Tier rows, then the destructive row last', JSON.stringify(labels(archived)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Disable Tier', 'Archive Tier', 'Move Edition to Trash — Nath',
  ]), labels(archived));
  check('the destructive Edition row is flagged danger and sits last', archived.entries.at(-1)?.danger === true);
  check('Move Edition to Bin and Move Edition to Trash are distinct rows, never conflated', new Set(labels(archived)).size === labels(archived).length);

  const trashed = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'trashed' }));
  check('trashed: Restore, then Move Edition to Bin, then Tier rows, then Permanently Delete last', JSON.stringify(labels(trashed)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Disable Tier', 'Archive Tier', 'Permanently Delete Edition — Nath',
  ]), labels(trashed));
}

console.log('\n6) No independent "Archive Edition" row for an Active/Disabled selected Edition');
{
  const active = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'active' }));
  check('no "Archive Edition" row — Archive Tier already IS the one legitimate archive path for a live Edition', labels(active).every((l) => l !== 'Archive Edition — Nath'), labels(active));
  const disabled = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: true }));
  check('same for a Disabled selected Edition', labels(disabled).every((l) => l !== 'Archive Edition — Nath'), labels(disabled));
}

console.log('\n7) No fabricated "All" actions anywhere, across the full state space (audit §D)');
{
  const forbidden = /\ball\b/i;
  const statuses: SelectedEditionLifecycleInputs['platformStatus'][] = ['active', 'disabled', 'archived', 'trashed', 'draft'];
  const tierStates: Array<Partial<TierLifecycleInputs>> = [
    { hasBeenPublished: false, hasContent: false }, { hasBeenPublished: false, hasContent: true },
    { hasBeenPublished: true, enabled: true }, { hasBeenPublished: true, enabled: false },
  ];
  let scanned = 0;
  for (const t of tierStates) {
    for (const noSel of [buildTierLifecycleMenu(tier(t), null)]) {
      scanned += 1;
      check(`no "All" wording — Tier only, ${JSON.stringify(t)}`, !forbidden.test(noSel.splitLabel) && labels(noSel).every((l) => !forbidden.test(l)), labels(noSel));
    }
    for (const status of statuses) {
      for (const masked of [true, false]) {
        for (const canPublish of [true, false]) {
          const model = buildTierLifecycleMenu(tier(t), edition({ platformStatus: status, disabledMasked: masked, canPublish }));
          scanned += 1;
          check(
            `no "All" wording — Edition ${status}/masked=${masked}/canPublish=${canPublish}, Tier ${JSON.stringify(t)}`,
            !forbidden.test(model.splitLabel) && model.entries.every((e) => !forbidden.test(e.label)),
            labels(model),
          );
        }
      }
    }
  }
  console.log(`  (scanned ${scanned} state combinations)`);
}

console.log('');
if (failures > 0) {
  console.error(`Tier lifecycle menu contract FAILED — ${failures} check(s) did not hold.`);
  process.exit(1);
}
console.log('Tier lifecycle menu contract: OK');
