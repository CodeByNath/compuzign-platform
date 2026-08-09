// Contract: while a focused drawer task owns the individual Tier drawer's
// body — the parent Tier's own Overview/Inclusions/FAQs editor, the selected
// Edition's own module editor, OR the Edition Bin — the redundant parent
// drawer chrome (AdminStationDrawer's header, the four-group Tabs/Accordion
// nav) hides, driven by ONE combined signal (focusedTaskActive), never a
// second independently-drifting flag. The Edition child chip strip
// additionally unmounts outright (not just CSS-hidden) for BOTH the module
// editor and the Bin — there is only ever one visible focused-task identity,
// never a secondary-nav row left showing underneath it.
//
// Three safeguards this contract locks in:
//
//   1. editingTab inside TierEditionDeclarationSwitcher remains the
//      authoritative Edition edit-session state. The controller-level
//      editionModuleEditing value is only a REPORTED/DERIVED signal — the
//      switcher reports it reactively AND guarantees a false report on its
//      own unmount, independent of editingTab's own transitions.
//   2. setHeaderHidden has a guaranteed reset path at the HOST level
//      (AdminStationDrawer), not only trusted content cleanup — a content/
//      drawer identity change must reset it to false itself.
//   3. focusedTaskActive (anyEditingActive OR editionBinActive) drives
//      chrome suppression and the pinned footer's 'none' mode, but the
//      dirty-edit guards (selectTierTab/selectOverviewTab, the
//      beforeunload/setCloseGuard effect) key ONLY on editingSection —
//      never on focusedTaskActive or editionBinActive — since the Edition
//      Bin carries no draft and must never raise a "Discard unsaved
//      changes?" confirm.
//
// It also locks in what this pass deliberately does NOT touch: the
// previously-disclosed Edition Escape/backdrop/group-switch close-guard gap
// stays deferred, not folded into this presentation-only change.
//
// This reads composition text. It does not execute Preact, so it asserts no
// rendered pixel and no browser behaviour — the mounted lifecycle regression
// (tier-edition-lifecycle-regression.mjs sections 8 and 14) covers the real
// DOM/signal behaviour this describes.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`Tier drawer editor-chrome contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

const switcher = source('resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx');
const controller = source('resources/ts/package-station/drawer/tier/useTierDrawerController.ts');
const detailModel = source('resources/ts/package-station/drawer/tier/tierDetailModel.ts');
const drawerContent = source('resources/ts/package-station/drawer/tier/TierDrawerContent.tsx');
const adminStationDrawer = source('resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx');
const drawerTypes = source('resources/ts/station-manager/drawerTypes.ts');
const entityDrawerHost = source('resources/ts/drawer-kit/entityDrawerHost.ts');
const tierDrawerHost = source('resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx');
const drawerKitCss = source('resources/css/modules/drawer-kit.css');

// ── Safeguard 1: editingTab stays authoritative; the controller only gets a reported signal ─

check(
  switcher.includes('onEditingActiveChange?.(editingTab !== null)'),
  'TierEditionDeclarationSwitcher reports editingTab\'s own transitions upward — it does not let the parent set editingTab',
);
check(
  /useEffect\(\(\) => \(\) => onEditingActiveChange\?\.\(false\), \[onEditingActiveChange\]\)/.test(switcher),
  'a dedicated cleanup-only effect guarantees a false report on unmount, independent of editingTab\'s own change-driven effect',
);
check(
  controller.includes('Reported, not owned') && controller.includes('const [editionModuleEditing, setEditionModuleEditing] = useState(false)'),
  'useTierDrawerController documents editionModuleEditing as a reported/derived signal, not a competing edit-session owner',
);
check(
  controller.includes('const anyEditingActive = editingSection !== null || editionModuleEditing'),
  'anyEditingActive combines the parent Tier\'s own editingSection with the reported Edition-editing signal — one signal, not two independent flags',
);
check(
  controller.includes('const focusedTaskActive = anyEditingActive || editionBinActive'),
  'focusedTaskActive extends anyEditingActive with the Edition Bin (Edition lifecycle/Bin UX correction) — the Bin is a focused drawer task too, but is deliberately kept OUT of anyEditingActive itself so the dirty-edit guards never see it',
);
check(
  detailModel.includes('focusedTaskActive: boolean') && !detailModel.includes('anyEditingActive: boolean') && !detailModel.includes('editingSection: TierEditingSection'),
  'buildTierFooterModel takes the combined focusedTaskActive boolean (renamed from anyEditingActive to reflect that it now also covers the Bin), not the parent-only editingSection — so the Edition editor AND the Edition Bin both hide the pinned footer',
);

// ── Safeguard 2: setHeaderHidden has a host-level guaranteed reset ──────────

check(
  drawerTypes.includes('setHeaderHidden?:') && entityDrawerHost.includes('setHeaderHidden?:'),
  'setHeaderHidden is optional on both DrawerContentProps and EntityDrawerHostBridge — additive, no other drawer/content is required to implement it',
);
check(
  /useEffect\(\(\) => \{\s*setHeaderHidden\(false\);\s*\}, \[open\.drawerTemplateKey, open\.recordId\]\)/.test(adminStationDrawer),
  'AdminStationDrawer resets headerHidden to false itself whenever the open drawer\'s content identity changes — a host-level guarantee, not only trusted content cleanup',
);
check(
  tierDrawerHost.includes('setHeaderHidden: (hidden) => headerRef.current?.(hidden)'),
  'TierDrawerHost threads setHeaderHidden into the bridge the same way it already threads setFooter/setCloseGuard',
);
check(
  /useEffect\(\(\) => \{\s*bridge\.setHeaderHidden\?\.\(c\.focusedTaskActive\);\s*return \(\) => bridge\.setHeaderHidden\?\.\(false\);/.test(drawerContent),
  'TierDrawerContent also resets setHeaderHidden to false on its own unmount — a second line of defense alongside AdminStationDrawer\'s host-level reset — and the hide signal itself is focusedTaskActive, not the narrower anyEditingActive, so the Edition Bin hides the header too',
);

// ── The chrome-suppression mechanism never reparents mounted content ───────

check(
  drawerContent.includes("c.tierGroupView === 'accordion' ? (")
    && drawerContent.includes('<DrawerGroupAccordion')
    && drawerContent.includes('<DrawerGroupTabs'),
  'DrawerGroupTabs/DrawerGroupAccordion selection still depends only on tierGroupView, never on anyEditingActive — neither renderer is conditionally unmounted while editing, so an open editor\'s own local state is never wiped by a reparenting remount',
);
check(
  drawerContent.includes("cz-req-detail--editing"),
  'chrome suppression is a CSS class toggle on the existing root, not a conditional render swap',
);
check(
  drawerKitCss.includes('.cz-req-detail--editing .cz-drawer-groups__tablist')
    && drawerKitCss.includes('.cz-req-detail--editing .cz-drawer-groups__accordion-trailing'),
  'the --editing class suppresses both the Tabs tablist and the Accordion trailing/trigger chrome in CSS',
);

// ── Edition child nav/empty-state hides while the module editor is open;
//    the Edition Bin is its own exclusive early return, replacing BOTH the
//    chip strip AND the module cards — never a second visible identity ─────

check(
  /\{!editingModule && \(/.test(switcher),
  'the child chip strip and empty state are guarded together behind !editingModule — no separate flag per element',
);
check(
  /if \(binActive\) \{\s*return <TierEditionBinFocusedView/.test(switcher),
  'the Edition Bin is an early, exclusive return — before the chip strip or module cards render at all — so there is never a secondary-nav row left showing behind/above the focused Bin task',
);
check(
  switcher.includes("from './TierEditionBinFocusedView'") && !switcher.includes("from './TierEditionBinList'"),
  'the switcher itself renders the Bin through TierEditionBinFocusedView only — it no longer imports TierEditionBinList directly (that import moved into TierEditionBinFocusedView)',
);

// ── Deferred, not included: the Edition close-guard gap ─────────────────────

check(
  /setCloseGuard\(editingSection !== null/.test(controller) && !/setCloseGuard\(anyEditingActive/.test(controller),
  'the close-guard still keys on editingSection alone — the separately-discovered Edition Escape/backdrop/group-switch close-guard gap is deliberately deferred, not folded into this presentation-only change',
);

console.log(`Tier drawer editor-chrome contract passed: ${checks} checks.`);
