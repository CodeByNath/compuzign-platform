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
    id: 'edt_1', title: 'Nath', platformStatus: 'active', disabledMasked: false,
    hasBeenPublished: true, canPublish: true,
    onPublish: noop, onDisable: noop, onEnable: noop, onArchive: noop, onTrash: noop, onDelete: noop, onRestore: noop, onMoveToBin: noop,
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

// The approved worked examples showed exactly three rows (Edition row, Tier
// toggle, Archive Tier), illustrating the ordering rule. Implementing them
// literally would have silently removed two real, pre-existing
// capabilities, both restored here with the reasoning recorded at the point
// of correction (tierLifecycleMenu.ts's own comments):
//
//  - "Publish Tier": an already-Active/Disabled Tier that picks up a new
//    pending module draft must still be able to re-Publish/settle it (the
//    SAME `disabled: !hasContent`-only gate the original flat Publish
//    button always used, independent of hasBeenPublished).
//    tier-occupant-lifecycle-regression.mjs's own Save-then-republish flow
//    depends on this.
//  - "Archive Edition": independent of "Archive Tier", which ALSO
//    displaces the whole parent Tier occupant into occupant_bin[] — not an
//    acceptable substitute for archiving just the Edition.
//    tier-edition-lifecycle-regression.mjs's own Archive → Trash → guarded
//    permanent delete flow, scoped to one Edition only, depends on this.
//
// Both are deliberate, disclosed deviations from the examples' literal row
// COUNT (three becomes five), not from their ordering PRINCIPLE (Edition's
// own rows first, Tier's own valid action(s) next regardless of verb match,
// cascade after that, destructive last).

console.log('1) Approved worked example — Edition Active + Tier Disabled');
{
  const model = buildTierLifecycleMenu(
    tier({ hasBeenPublished: true, enabled: false }),
    edition({ platformStatus: 'active', canPublish: false }),
  );
  check('top-level label is Disable (Edition\'s own immediate transition)', model.splitLabel === 'Disable', model.splitLabel);
  check('Disable/Archive Edition lead; Publish Tier/Enable Tier/Archive Tier follow — the Tier\'s own valid actions are never hidden', JSON.stringify(labels(model)) === JSON.stringify([
    'Disable Edition — Nath', 'Archive Edition — Nath', 'Publish Tier', 'Enable Tier', 'Archive Tier',
  ]), labels(model));
}

console.log('\n2) Approved worked example — Edition Disabled + Tier Active');
{
  const model = buildTierLifecycleMenu(
    tier({ hasBeenPublished: true, enabled: true }),
    edition({ platformStatus: 'disabled', disabledMasked: true, canPublish: false }),
  );
  check('top-level label is Enable (Edition\'s own immediate transition)', model.splitLabel === 'Enable', model.splitLabel);
  check('Enable/Archive Edition lead; Publish Tier/Disable Tier/Archive Tier follow', JSON.stringify(labels(model)) === JSON.stringify([
    'Enable Edition — Nath', 'Archive Edition — Nath', 'Publish Tier', 'Disable Tier', 'Archive Tier',
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
  check('active: Publish Tier, then Disable Tier, then Archive Tier', JSON.stringify(labels(active)) === JSON.stringify(['Publish Tier', 'Disable Tier', 'Archive Tier']));

  const disabled = buildTierLifecycleMenu(tier({ hasBeenPublished: true, enabled: false }), null);
  check('disabled: top label is Enable', disabled.splitLabel === 'Enable');
  check('disabled: Publish Tier, then Enable Tier, then Archive Tier', JSON.stringify(labels(disabled)) === JSON.stringify(['Publish Tier', 'Enable Tier', 'Archive Tier']));
  check('no Edition-scoped entry ever appears with no selected Edition', labels(disabled).every((l) => !l.includes('Edition')));

  const activeNoDraft = buildTierLifecycleMenu(tier({ hasBeenPublished: true, enabled: true, hasContent: false }), null);
  check('a published Tier can still lack Publish Tier if it genuinely has no content', !labels(activeNoDraft).includes('Publish Tier'), labels(activeNoDraft));
}

// Mirrors CanonicalEntityFooter's own prior isNewNeverPublished branch
// exactly: a never-published Edition's top label is "Move to Trash" (the
// same never-published fallback the Tier itself uses), NOT "Publish" —
// Publish Edition is an independently-gated row (canPublish alone), exactly
// like the old primary Publish button's `disabled: !canPublish` was
// unconditional on hasBeenPublished.
console.log('\n4) Selected Edition, Pending (never published)');
{
  const canPublish = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: true }));
  check('top label is Move to Trash — the never-published fallback, not Publish', canPublish.splitLabel === 'Move to Trash', canPublish.splitLabel);
  check('Publish Edition leads, then the never-published travel row, then Tier\'s own rows', JSON.stringify(labels(canPublish)) === JSON.stringify([
    'Publish Edition — Nath', 'Move Edition to Trash — Nath', 'Publish Tier', 'Disable Tier', 'Archive Tier',
  ]), labels(canPublish));

  const cannotPublish = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: false }));
  check('top label is still Move to Trash even when not yet publishable', cannotPublish.splitLabel === 'Move to Trash');
  check('no ghost Publish row when the Edition is not actually publishable', labels(cannotPublish).every((l) => !l.includes('Publish Edition')), labels(cannotPublish));
  check('the never-published travel row and Tier\'s own valid action are never hidden', JSON.stringify(labels(cannotPublish)) === JSON.stringify([
    'Move Edition to Trash — Nath', 'Publish Tier', 'Disable Tier', 'Archive Tier',
  ]), labels(cannotPublish));

  // The republish case: an already-live Edition (hasBeenPublished: true)
  // that has picked up a new pending draft must still be able to
  // re-Publish/settle it — the same capability the Tier's own
  // Save-then-republish flow depends on (tier-occupant-lifecycle-
  // regression.mjs), now proven for Edition too.
  const republish = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'active', canPublish: true }));
  check('an already-Active Edition with a new pending draft still offers Publish Edition, alongside Disable/Archive', JSON.stringify(labels(republish)) === JSON.stringify([
    'Publish Edition — Nath', 'Disable Edition — Nath', 'Archive Edition — Nath', 'Publish Tier', 'Disable Tier', 'Archive Tier',
  ]), labels(republish));
  check('the top label still follows the Edition\'s real live state (Disable), not Publish, once it has been published', republish.splitLabel === 'Disable', republish.splitLabel);
}

console.log('\n5) Selected Edition, Archived/Trashed — Move Edition to Bin rises near the top, distinct from Archive');
{
  const archived = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'archived' }));
  check('top label is Restore', archived.splitLabel === 'Restore');
  check('Restore, then Move Edition to Bin, then Tier rows, then the destructive row last', JSON.stringify(labels(archived)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Publish Tier', 'Disable Tier', 'Archive Tier', 'Move Edition to Trash — Nath',
  ]), labels(archived));
  check('the destructive Edition row is flagged danger and sits last', archived.entries.at(-1)?.danger === true);
  check('Move Edition to Bin and Move Edition to Trash are distinct rows, never conflated', new Set(labels(archived)).size === labels(archived).length);

  const trashed = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'trashed' }));
  check('trashed: Restore, then Move Edition to Bin, then Tier rows, then Permanently Delete last', JSON.stringify(labels(trashed)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Publish Tier', 'Disable Tier', 'Archive Tier', 'Permanently Delete Edition — Nath',
  ]), labels(trashed));
}

console.log('\n6) Archive Edition is independent of Archive Tier for an Active/Disabled selected Edition');
{
  const active = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'active' }));
  check('an Active Edition offers its own independent Archive Edition row', labels(active).includes('Archive Edition — Nath'), labels(active));
  check('Archive Edition and Archive Tier are both present and distinct — one archives only the Edition, the other cascades', labels(active).includes('Archive Edition — Nath') && labels(active).includes('Archive Tier') && new Set(labels(active)).size === labels(active).length, labels(active));
  const disabled = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: true }));
  check('same for a Disabled selected Edition', labels(disabled).includes('Archive Edition — Nath') && labels(disabled).includes('Archive Tier'), labels(disabled));
  const pending = buildTierLifecycleMenu(tier(), edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: false }));
  check('a Pending Edition (never live) offers no Archive Edition row of its own — nothing live to archive yet', !labels(pending).includes('Archive Edition — Nath'), labels(pending));
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
