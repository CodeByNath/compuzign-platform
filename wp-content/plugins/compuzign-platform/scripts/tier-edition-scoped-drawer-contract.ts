// Contract: the scoped Tier Edition drawer (tier-edition:{instance}:{slot}:
// {edition}) — an independently addressed, independently lifecycled child
// record, not a variant of `tier` and not opened from within it.
//
// Covers the real exported encode/decode functions (not a static type
// assertion — the same "exercise the actual function" convention
// tier-overview-is-addon-contract.ts established), plus source-scanning
// checks mirroring tier-instance-scope-contract.ts's own technique for the
// things only a text scan can prove: registration, footer reuse, no-nesting,
// and that the editor form/lifecycle hook are shared, not duplicated.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  encodeTierEditionDrawerRecordId,
  decodeTierEditionDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier-edition/tierEditionDrawerTypes';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Edition scoped drawer contract: ${message}`);
}

// ── Encode/decode: the real functions, round-tripped ─────────────────────────

const token = encodeTierEditionDrawerRecordId('ti_abc123', 'standard', 'edt_ghi789');
check(token === 'tier-edition:ti_abc123:standard:edt_ghi789', 'the encoded token has the documented shape');

const decoded = decodeTierEditionDrawerRecordId(token);
check(
  decoded !== null && decoded.instanceId === 'ti_abc123' && decoded.slotId === 'standard' && decoded.editionId === 'edt_ghi789',
  'the token round-trips instanceId, slotId, editionId in order',
);

check(decodeTierEditionDrawerRecordId('tier-edition:ti_abc123:not-a-real-slot:edt_1') === null, 'an unrecognised slot key fails to decode rather than guessing');
check(decodeTierEditionDrawerRecordId('tier-edition:ti_abc123:standard') === null, 'a missing editionId segment fails to decode');
check(decodeTierEditionDrawerRecordId('tier-rate-sheet:ti_abc123:standard:rs_1') === null, 'a different drawer\'s token is never mistaken for this one');
check(decodeTierEditionDrawerRecordId('tier-edition-group:ti_abc123:standard:edt_1') === null, 'a coined prefix that merely starts with the real one is rejected, not prefix-matched');

// ── Source scan: registration, footer reuse, no-nesting, shared editor ──────

const root = resolve(import.meta.dirname, '..');
const registerSource = readFileSync(resolve(root, 'resources/ts/package-station/register.ts'), 'utf8');
const drawerContentSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier-edition/TierEditionDrawerContent.tsx',
), 'utf8');
const tierDrawerContentSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
), 'utf8');
const panelSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierEditionsPanel.tsx',
), 'utf8');

check(
  registerSource.includes("key: 'tier-edition'") && registerSource.includes('content: TierEditionDrawerContent'),
  'tier-edition is registered as its own drawer template, not folded into the tier key',
);

check(
  drawerContentSource.includes("import { CanonicalEntityFooter }") && drawerContentSource.includes('<CanonicalEntityFooter'),
  'the scoped drawer uses the shared CanonicalEntityFooter — the same component Category/Package Family use — not a bespoke footer',
);
for (const action of ['onPublish', 'onToggleActive', 'onArchive', 'onTrash', 'onRestore', 'onDelete']) {
  check(drawerContentSource.includes(`${action}={`), `the footer wires ${action} to a real handler`);
}
check(
  drawerContentSource.includes('ctl.publish(') && drawerContentSource.includes('ctl.archive(')
    && drawerContentSource.includes('ctl.trash(') && drawerContentSource.includes('ctl.restore(')
    && drawerContentSource.includes('ctl.remove('),
  'every footer action drives the SAME useTierEditions actions the inline panel uses — no parallel lifecycle implementation',
);

// The hard architectural boundary: drawer content must never open another
// drawer. Neither the parent Tier drawer's content nor the inline Editions
// panel may IMPORT the scoped drawer's content or construct its token —
// prose in a comment documenting the sibling relationship (e.g.
// TierEditionsPanel's own header comment) is fine; an actual import or call
// is not.
for (const [label, source] of [
  ['TierDrawerContent (the parent Tier drawer)', tierDrawerContentSource],
  ['the inline TierEditionsPanel (itself mounted inside the Tier drawer)', panelSource],
] as const) {
  check(
    !source.includes('TierEditionDrawerContent') && !source.includes('encodeTierEditionDrawerRecordId') && !source.includes("from '../tier-edition/tierEditionDrawerTypes'"),
    `${label} never imports or constructs the scoped Edition drawer's token/content — no drawer nests another`,
  );
}

// Shared editor form and shared lifecycle hook — not duplicated.
check(
  drawerContentSource.includes("import { TierEditionOverviewFields }") && drawerContentSource.includes("from '../tier/TierEditionOverviewFields'"),
  'the scoped drawer\'s edit mode renders the SAME TierEditionOverviewFields the inline panel uses, not a second form',
);
check(
  drawerContentSource.includes("import { draftFromTierEdition, tierEditionStatusLabel }") || drawerContentSource.includes('draftFromTierEdition'),
  'the scoped drawer reuses the shared draft/status derivations, not its own copies',
);
check(
  readFileSync(resolve(root, 'resources/ts/package-station/surface/tierSurface/useTierEditionDrawer.ts'), 'utf8').includes('useTierEditions('),
  'the scoped drawer\'s own controller composes the SAME useTierEditions hook the inline panel uses — no parallel Edition mutation implementation',
);

console.log('Tier Edition scoped drawer contract checks passed.');
