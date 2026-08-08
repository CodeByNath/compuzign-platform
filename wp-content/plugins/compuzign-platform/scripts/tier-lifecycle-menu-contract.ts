// Pure contract for buildTierLifecycleMenu / buildTierPublishMenu
// (single-footer, scope-aware lifecycle command model, Phase 3; UI
// refinement Phase 1 split the one combined menu into these two functions).
// No DOM, no bundling — both functions are plain TypeScript, so this is a
// direct import + assertion, same style as
// supported-action-footer-contract.ts. The mounted-DOM proof (real clicks,
// real endpoints, real two-split footer) is the regression suite; this file
// proves the MODELS are correct in isolation, against the exact matrix and
// worked examples the audit was approved against.

import assert from 'node:assert/strict';
import {
  buildTierLifecycleMenu, buildTierPublishMenu,
  type TierLifecycleInputs, type SelectedEditionLifecycleInputs,
} from '../resources/ts/package-station/drawer/tier/tierLifecycleMenu';

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
function labels(model: { entries: { label: string }[] }): string[] {
  return model.entries.map((e) => e.label);
}

let failures = 0;
function check(label: string, cond: unknown, detail?: unknown) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures += 1; }
}

console.log('Tier lifecycle + publish menu contracts (single-footer, scope-aware command model)\n');

// The approved worked examples showed exactly three rows (Edition row, Tier
// toggle, Archive Tier) inside one combined menu, illustrating the ordering
// rule. Implementing them literally, and combined, would have silently
// removed two real, pre-existing capabilities, both restored here (and now
// each living in whichever of the two split menus it belongs to — reasoning
// recorded at the point of correction, tierLifecycleMenu.ts's own comments):
//
//  - "Publish Tier": an already-Active/Disabled Tier that picks up a new
//    pending module draft must still be able to re-Publish/settle it (the
//    SAME `disabled: !hasContent`-only gate the original flat Publish
//    button always used, independent of hasBeenPublished). Now lives in the
//    PUBLISH menu (buildTierPublishMenu), never the lifecycle menu.
//    tier-occupant-lifecycle-regression.mjs's own Save-then-republish flow
//    depends on this.
//  - "Archive Edition": independent of "Archive Tier", which ALSO
//    displaces the whole parent Tier occupant into occupant_bin[] — not an
//    acceptable substitute for archiving just the Edition. Lives in the
//    LIFECYCLE menu (backward/travel action).
//    tier-edition-lifecycle-regression.mjs's own Archive → Trash → guarded
//    permanent delete flow, scoped to one Edition only, depends on this.
//
// Both are deliberate, disclosed deviations from the examples' literal row
// COUNT, not from their ordering PRINCIPLE (Edition's own rows first,
// Tier's own valid action(s) next regardless of verb match, cascade after
// that, destructive last) — a principle each menu now applies independently
// within its own scope (lifecycle rows in one menu, publish rows in the
// other).

console.log('1) Approved worked example — Edition Active + Tier Disabled');
{
  const t = tier({ hasBeenPublished: true, enabled: false });
  const e = edition({ platformStatus: 'active', canPublish: false });
  const lifecycle = buildTierLifecycleMenu(t, e);
  const publish = buildTierPublishMenu(t, e);
  check('lifecycle top-level label is Disable (Edition\'s own immediate transition)', lifecycle.splitLabel === 'Disable', lifecycle.splitLabel);
  check('lifecycle: Disable/Archive Edition lead; Enable Tier/Archive Tier follow — Tier\'s own valid actions are never hidden', JSON.stringify(labels(lifecycle)) === JSON.stringify([
    'Disable Edition — Nath', 'Archive Edition — Nath', 'Enable Tier', 'Archive Tier',
  ]), labels(lifecycle));
  check('publish: Edition not publishable, Tier has content — only Publish Tier offered', JSON.stringify(labels(publish)) === JSON.stringify(['Publish Tier']), labels(publish));
}

console.log('\n2) Approved worked example — Edition Disabled + Tier Active');
{
  const t = tier({ hasBeenPublished: true, enabled: true });
  const e = edition({ platformStatus: 'disabled', disabledMasked: true, canPublish: false });
  const lifecycle = buildTierLifecycleMenu(t, e);
  const publish = buildTierPublishMenu(t, e);
  check('lifecycle top-level label is Enable (Edition\'s own immediate transition)', lifecycle.splitLabel === 'Enable', lifecycle.splitLabel);
  check('lifecycle: Enable/Archive Edition lead; Disable Tier/Archive Tier follow', JSON.stringify(labels(lifecycle)) === JSON.stringify([
    'Enable Edition — Nath', 'Archive Edition — Nath', 'Disable Tier', 'Archive Tier',
  ]), labels(lifecycle));
  check('publish: only Publish Tier offered', JSON.stringify(labels(publish)) === JSON.stringify(['Publish Tier']), labels(publish));
}

console.log('\n3) No Edition selected — both menus behave like the normal Tier footer');
{
  const neverPublishedNoContent = tier({ hasBeenPublished: false, hasContent: false });
  const l1 = buildTierLifecycleMenu(neverPublishedNoContent, null);
  const p1 = buildTierPublishMenu(neverPublishedNoContent, null);
  check('never-published, no content: lifecycle top label is Move to Trash (today\'s exact fallback)', l1.splitLabel === 'Move to Trash');
  check('never-published, no content: exactly one lifecycle row — Move Tier to Trash', JSON.stringify(labels(l1)) === JSON.stringify(['Move Tier to Trash']));
  check('never-published, no content: publish menu is empty — nothing to publish', labels(p1).length === 0, labels(p1));

  const neverPublishedWithContent = tier({ hasBeenPublished: false, hasContent: true });
  const l2 = buildTierLifecycleMenu(neverPublishedWithContent, null);
  const p2 = buildTierPublishMenu(neverPublishedWithContent, null);
  check('never-published with content: lifecycle top label is still Move to Trash', l2.splitLabel === 'Move to Trash');
  check('never-published with content: lifecycle menu carries only Move Tier to Trash — Publish moved out entirely', JSON.stringify(labels(l2)) === JSON.stringify(['Move Tier to Trash']), labels(l2));
  check('never-published with content: publish menu offers Publish Tier', JSON.stringify(labels(p2)) === JSON.stringify(['Publish Tier']), labels(p2));

  const active = tier({ hasBeenPublished: true, enabled: true });
  const l3 = buildTierLifecycleMenu(active, null);
  const p3 = buildTierPublishMenu(active, null);
  check('active: lifecycle top label is Disable', l3.splitLabel === 'Disable');
  check('active: lifecycle menu is Disable Tier, then Archive Tier — no Publish row', JSON.stringify(labels(l3)) === JSON.stringify(['Disable Tier', 'Archive Tier']), labels(l3));
  check('active: publish menu offers Publish Tier', JSON.stringify(labels(p3)) === JSON.stringify(['Publish Tier']));

  const disabled = tier({ hasBeenPublished: true, enabled: false });
  const l4 = buildTierLifecycleMenu(disabled, null);
  const p4 = buildTierPublishMenu(disabled, null);
  check('disabled: lifecycle top label is Enable', l4.splitLabel === 'Enable');
  check('disabled: lifecycle menu is Enable Tier, then Archive Tier', JSON.stringify(labels(l4)) === JSON.stringify(['Enable Tier', 'Archive Tier']), labels(l4));
  check('disabled: publish menu offers Publish Tier', JSON.stringify(labels(p4)) === JSON.stringify(['Publish Tier']));
  check('no Edition-scoped entry ever appears in either menu with no selected Edition', labels(l4).every((l) => !l.includes('Edition')) && labels(p4).every((l) => !l.includes('Edition')));

  const activeNoDraft = tier({ hasBeenPublished: true, enabled: true, hasContent: false });
  const l5 = buildTierLifecycleMenu(activeNoDraft, null);
  const p5 = buildTierPublishMenu(activeNoDraft, null);
  check('a published Tier with no content still offers its lifecycle rows unaffected', JSON.stringify(labels(l5)) === JSON.stringify(['Disable Tier', 'Archive Tier']), labels(l5));
  check('a published Tier can lack Publish Tier if it genuinely has no content', !labels(p5).includes('Publish Tier'), labels(p5));
}

// Mirrors CanonicalEntityFooter's own prior isNewNeverPublished branch
// exactly: a never-published Edition's top label is "Move to Trash" (the
// same never-published fallback the Tier itself uses), NOT "Publish" —
// Publish Edition is an independently-gated PUBLISH-menu row (canPublish
// alone), exactly like the old primary Publish button's
// `disabled: !canPublish` was unconditional on hasBeenPublished.
console.log('\n4) Selected Edition, Pending (never published)');
{
  const t = tier();
  const canPublish = edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: true });
  const lCanPublish = buildTierLifecycleMenu(t, canPublish);
  const pCanPublish = buildTierPublishMenu(t, canPublish);
  check('top label is Move to Trash — the never-published fallback, not Publish', lCanPublish.splitLabel === 'Move to Trash', lCanPublish.splitLabel);
  check('lifecycle: only the never-published travel row, then Tier\'s own rows — Publish Edition is not a lifecycle row', JSON.stringify(labels(lCanPublish)) === JSON.stringify([
    'Move Edition to Trash — Nath', 'Disable Tier', 'Archive Tier',
  ]), labels(lCanPublish));
  check('publish: Edition\'s own Publish leads, then Tier\'s', JSON.stringify(labels(pCanPublish)) === JSON.stringify(['Publish Edition — Nath', 'Publish Tier']), labels(pCanPublish));

  const cannotPublish = edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: false });
  const lCannot = buildTierLifecycleMenu(t, cannotPublish);
  const pCannot = buildTierPublishMenu(t, cannotPublish);
  check('top label is still Move to Trash even when not yet publishable', lCannot.splitLabel === 'Move to Trash');
  check('lifecycle: the never-published travel row and Tier\'s own valid action are never hidden', JSON.stringify(labels(lCannot)) === JSON.stringify([
    'Move Edition to Trash — Nath', 'Disable Tier', 'Archive Tier',
  ]), labels(lCannot));
  check('publish: no ghost Publish Edition row when the Edition is not actually publishable', !labels(pCannot).includes('Publish Edition — Nath') && labels(pCannot).includes('Publish Tier'), labels(pCannot));

  // The republish case: an already-live Edition (hasBeenPublished: true)
  // that has picked up a new pending draft must still be able to
  // re-Publish/settle it — the same capability the Tier's own
  // Save-then-republish flow depends on (tier-occupant-lifecycle-
  // regression.mjs), now proven for Edition too, in the PUBLISH menu.
  const republish = edition({ platformStatus: 'active', canPublish: true });
  const lRepublish = buildTierLifecycleMenu(t, republish);
  const pRepublish = buildTierPublishMenu(t, republish);
  check('an already-Active Edition with a new pending draft still offers Publish Edition in the publish menu, alongside Publish Tier', JSON.stringify(labels(pRepublish)) === JSON.stringify(['Publish Edition — Nath', 'Publish Tier']), labels(pRepublish));
  check('the SAME Edition\'s lifecycle menu independently offers Disable/Archive, never Publish', JSON.stringify(labels(lRepublish)) === JSON.stringify(['Disable Edition — Nath', 'Archive Edition — Nath', 'Disable Tier', 'Archive Tier']), labels(lRepublish));
  check('the lifecycle top label still follows the Edition\'s real live state (Disable), not Publish, once it has been published', lRepublish.splitLabel === 'Disable', lRepublish.splitLabel);
}

console.log('\n5) Selected Edition, Archived/Trashed — Move Edition to Bin rises near the top, distinct from Archive; no Publish transition exists');
{
  const t = tier();
  const archived = edition({ platformStatus: 'archived' });
  const lArchived = buildTierLifecycleMenu(t, archived);
  const pArchived = buildTierPublishMenu(t, archived);
  check('top label is Restore', lArchived.splitLabel === 'Restore');
  check('lifecycle: Restore, then Move Edition to Bin, then Tier rows, then the destructive row last', JSON.stringify(labels(lArchived)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Disable Tier', 'Archive Tier', 'Move Edition to Trash — Nath',
  ]), labels(lArchived));
  check('the destructive Edition row is flagged danger and sits last', lArchived.entries.at(-1)?.danger === true);
  check('Move Edition to Bin and Move Edition to Trash are distinct rows, never conflated', new Set(labels(lArchived)).size === labels(lArchived).length);
  check('an Archived Edition has no Publish transition — publish menu carries only the Tier\'s own', JSON.stringify(labels(pArchived)) === JSON.stringify(['Publish Tier']), labels(pArchived));

  const trashed = edition({ platformStatus: 'trashed' });
  const lTrashed = buildTierLifecycleMenu(t, trashed);
  const pTrashed = buildTierPublishMenu(t, trashed);
  check('trashed: Restore, then Move Edition to Bin, then Tier rows, then Permanently Delete last', JSON.stringify(labels(lTrashed)) === JSON.stringify([
    'Restore Edition — Nath', 'Move Edition to Bin', 'Disable Tier', 'Archive Tier', 'Permanently Delete Edition — Nath',
  ]), labels(lTrashed));
  check('a Trashed Edition likewise has no Publish transition', JSON.stringify(labels(pTrashed)) === JSON.stringify(['Publish Tier']), labels(pTrashed));
}

console.log('\n6) Archive Edition is independent of Archive Tier for an Active/Disabled selected Edition');
{
  const t = tier();
  const active = buildTierLifecycleMenu(t, edition({ platformStatus: 'active' }));
  check('an Active Edition offers its own independent Archive Edition row', labels(active).includes('Archive Edition — Nath'), labels(active));
  check('Archive Edition and Archive Tier are both present and distinct — one archives only the Edition, the other cascades', labels(active).includes('Archive Edition — Nath') && labels(active).includes('Archive Tier') && new Set(labels(active)).size === labels(active).length, labels(active));
  const disabled = buildTierLifecycleMenu(t, edition({ platformStatus: 'disabled', disabledMasked: true }));
  check('same for a Disabled selected Edition', labels(disabled).includes('Archive Edition — Nath') && labels(disabled).includes('Archive Tier'), labels(disabled));
  const pending = buildTierLifecycleMenu(t, edition({ platformStatus: 'disabled', disabledMasked: false, hasBeenPublished: false, canPublish: false }));
  check('a Pending Edition (never live) offers no Archive Edition row of its own — nothing live to archive yet', !labels(pending).includes('Archive Edition — Nath'), labels(pending));
}

console.log('\n7) The two menus never leak into each other\'s scope, across the full state space');
{
  const lifecycleVerbs = /\b(Disable|Enable|Archive|Trash|Restore|Bin)\b/;
  const statuses: SelectedEditionLifecycleInputs['platformStatus'][] = ['active', 'disabled', 'archived', 'trashed', 'draft'];
  const tierStates: Array<Partial<TierLifecycleInputs>> = [
    { hasBeenPublished: false, hasContent: false }, { hasBeenPublished: false, hasContent: true },
    { hasBeenPublished: true, enabled: true }, { hasBeenPublished: true, enabled: false },
  ];
  let scanned = 0;
  for (const t of tierStates) {
    const lNoSel = buildTierLifecycleMenu(tier(t), null);
    const pNoSel = buildTierPublishMenu(tier(t), null);
    scanned += 1;
    check(`lifecycle menu never contains Publish — Tier only, ${JSON.stringify(t)}`, labels(lNoSel).every((l) => !l.includes('Publish')), labels(lNoSel));
    check(`publish menu never contains a lifecycle verb — Tier only, ${JSON.stringify(t)}`, !lifecycleVerbs.test(pNoSel.splitLabel) && labels(pNoSel).every((l) => !lifecycleVerbs.test(l)), labels(pNoSel));
    for (const status of statuses) {
      for (const masked of [true, false]) {
        for (const canPublish of [true, false]) {
          const e = edition({ platformStatus: status, disabledMasked: masked, canPublish });
          const lModel = buildTierLifecycleMenu(tier(t), e);
          const pModel = buildTierPublishMenu(tier(t), e);
          scanned += 1;
          check(
            `lifecycle menu never contains Publish — Edition ${status}/masked=${masked}/canPublish=${canPublish}, Tier ${JSON.stringify(t)}`,
            labels(lModel).every((l) => !l.includes('Publish')),
            labels(lModel),
          );
          check(
            `publish menu never contains a lifecycle verb — Edition ${status}/masked=${masked}/canPublish=${canPublish}, Tier ${JSON.stringify(t)}`,
            !lifecycleVerbs.test(pModel.splitLabel) && labels(pModel).every((l) => !lifecycleVerbs.test(l)),
            labels(pModel),
          );
        }
      }
    }
  }
  console.log(`  (scanned ${scanned} state combinations, both menus each)`);
}

console.log('\n8) No fabricated "All" actions anywhere, in either menu, across the full state space (audit §D)');
{
  const forbidden = /\ball\b/i;
  const statuses: SelectedEditionLifecycleInputs['platformStatus'][] = ['active', 'disabled', 'archived', 'trashed', 'draft'];
  const tierStates: Array<Partial<TierLifecycleInputs>> = [
    { hasBeenPublished: false, hasContent: false }, { hasBeenPublished: false, hasContent: true },
    { hasBeenPublished: true, enabled: true }, { hasBeenPublished: true, enabled: false },
  ];
  let scanned = 0;
  for (const t of tierStates) {
    const lNoSel = buildTierLifecycleMenu(tier(t), null);
    const pNoSel = buildTierPublishMenu(tier(t), null);
    scanned += 1;
    check(`no "All" wording — Tier only, ${JSON.stringify(t)}`, !forbidden.test(lNoSel.splitLabel) && labels(lNoSel).every((l) => !forbidden.test(l)) && !forbidden.test(pNoSel.splitLabel) && labels(pNoSel).every((l) => !forbidden.test(l)), [labels(lNoSel), labels(pNoSel)]);
    for (const status of statuses) {
      for (const masked of [true, false]) {
        for (const canPublish of [true, false]) {
          const e = edition({ platformStatus: status, disabledMasked: masked, canPublish });
          const lModel = buildTierLifecycleMenu(tier(t), e);
          const pModel = buildTierPublishMenu(tier(t), e);
          scanned += 1;
          check(
            `no "All" wording — Edition ${status}/masked=${masked}/canPublish=${canPublish}, Tier ${JSON.stringify(t)}`,
            !forbidden.test(lModel.splitLabel) && labels(lModel).every((l) => !forbidden.test(l)) && !forbidden.test(pModel.splitLabel) && labels(pModel).every((l) => !forbidden.test(l)),
            [labels(lModel), labels(pModel)],
          );
        }
      }
    }
  }
  console.log(`  (scanned ${scanned} state combinations, both menus each)`);
}

console.log('');
if (failures > 0) {
  console.error(`Tier lifecycle + publish menu contracts FAILED — ${failures} check(s) did not hold.`);
  process.exit(1);
}
console.log('Tier lifecycle + publish menu contracts: OK');
