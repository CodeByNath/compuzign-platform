// Contract: the registered Tier drawer's own composition — the Tier System
// aggregate (registration/instance settings) and the per-slot occupant entry
// — as distinct from the Tier Workspace lanes (Connections/Settings) that
// dispatch into it. Split out of package-tier-workspace-contract.ts, which had
// grown into a god file spanning unrelated subsystems; see that file's header
// for the current responsibility map.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier System drawer contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

// Tier System registration is the PENDING state of one lifecycle, not a
// second Tier editor: TierRegistrationHost and TierInstanceSettingsHost are
// thin data-loading adapters only — both must mount the SAME TierSystemContent
// composition, one entity manifest, one controller, one footer model.
const tierSystemSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierSystemContent.tsx',
), 'utf8');
const tierSystemController = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/useTierSystemController.ts',
), 'utf8');
const tierSystemFooterSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierSystemFooter.tsx',
), 'utf8');
const registrationHostSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx',
), 'utf8');
const instanceSettingsHostSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierSurface/TierInstanceSettingsHost.tsx',
), 'utf8');
check(
  registrationHostSource.includes('<TierSystemContent') && instanceSettingsHostSource.includes('<TierSystemContent'),
  'both the pending and persisted hosts mount the same TierSystemContent composition',
);
for (const host of [registrationHostSource, instanceSettingsHostSource]) {
  check(
    !/const \[.*useState/.test(host) && !host.includes('useEffect'),
    'the hosts stay thin data-loading adapters — no independent lifecycle logic of their own',
  );
  // A host's fatal branch unmounts the composition, discarding the drawer's
  // local pending→persisted identity. Only the COLLECTION READ may do that. A
  // rejected mutation (a 422 from the assignment ledger, say) reports inside
  // the mounted composition, which still owns the retry and the record Publish
  // just created.
  check(
    host.includes('loadError') && !/\.error\b/.test(host.replace(/loadError/g, '')),
    'a host mounts or refuses on the collection read alone — a mutation rejection never unmounts the composition',
  );
}
// Publish mints the instance inside this same mounted registration drawer, so
// the pending host must carry the Rate Sheet inventory the Rate Sheet Access
// module needs the moment that happens. It never re-mounts as the persisted
// host, so an inventory left to the persisted route alone is one this route
// can never obtain.
check(
  registrationHostSource.includes('useTierRateSheetInventory')
    && registrationHostSource.includes('rateSheets={')
    && registrationHostSource.includes('refetchRateSheets={'),
  'the pending host supplies the Rate Sheet inventory its own post-Publish state needs',
);

// Fixed-slot occupant concerns (Basic/Standard/Premium/Enterprise/Ultimate)
// never leak into the aggregate composition — only the whole-instance
// allowed_rate_sheet_ids field, which belongs to this manifest's own Rate
// Sheet Access module, is legitimate here.
for (const forbidden of ['encodeTierSlotDrawerRecordId', 'saveTierFeatures', 'current_occupant', 'occupant_id']) {
  check(!tierSystemSource.includes(forbidden), `the Tier System composition performs no ${forbidden}`);
  check(!tierSystemController.includes(forbidden), `the Tier System controller performs no ${forbidden}`);
}
check(
  tierSystemSource.includes('c.instance?.tier_instance_id'),
  'the Tier System composition reports the stored id the backend minted, never the title it was given',
);

// The drawer footer is HOST state: setting it re-renders the content. A
// stable dependency array and a presentational footer component (no computed
// per-render object) are what make the set/re-render loop impossible.
check(
  !tierSystemSource.includes('setFooter(footer)'),
  'the Tier System composition sets no raw computed footer variable, so it cannot drive the set/re-render loop',
);
check(
  tierSystemSource.includes('bridge.setFooter(') && tierSystemSource.includes('<TierSystemFooter'),
  'the Tier System composition always publishes the mature TierSystemFooter, never a bespoke Close-only footer',
);

// Presentation uses the styled editor vocabulary. `drawerModule__field` and its
// siblings are only styled under `.drawerOverview`, so using them outside that
// scope renders an unstyled form.
for (const [name, source] of [
  ['Tier System', tierSystemSource],
] as const) {
  for (const unstyled of [
    'cz-drawer-actions',
    'drawerModule__field',
    'drawerModule__label',
    'drawerModule__hint',
    'drawerModule__fields',
  ]) {
    check(!source.includes(unstyled), `${name} does not use the unstyled ${unstyled}`);
  }
  // A pending record is an edit surface with no record behind it yet, so it
  // wears the module edit shell the mature drawer already wears — which owns
  // Save/Cancel, the dirty confirmation, the busy state and the error slot —
  // rather than hand-rolling a footer beside it.
  check(
    source.includes('InlineEditorShell') || source.includes('EntityDrawer'),
    `${name} wears the drawer kit's mature composition`,
  );
}
// One manifest serves both states: a schema-placed overview module plus Rate
// Sheet Access, with each module's own inline editor over it. Not a bespoke
// form dropped into the drawer body, and not two separate manifests.
check(
  tierSystemSource.includes('EntityDrawer')
    && tierSystemSource.includes('TIER_SYSTEM_ENTITY')
    && tierSystemSource.includes("module: 'overview'")
    && tierSystemSource.includes("'rate-sheet-access'"),
  'the Tier System composition renders one manifest with placed overview and rate-sheet-access modules, not a bespoke form',
);
check(
  !existsSync(resolve(root, 'resources/ts/package-station/drawer/schema/entities/tierRegistration.ts'))
    && !existsSync(resolve(root, 'resources/ts/package-station/drawer/schema/bindings/tierRegistration.tsx'))
    && !existsSync(resolve(root, 'resources/ts/package-station/drawer/schema/entities/tierInstance.ts'))
    && !existsSync(resolve(root, 'resources/ts/package-station/drawer/schema/bindings/tierInstance.tsx')),
  'the separate registration-only and instance-only manifests are retired, not duplicated beside the unified one',
);
check(
  tierSystemSource.includes('handlers: { edit:'),
  'the Overview module offers Edit, so it re-enters the same editor',
);

// Rate Sheet Access's own read card is draft-preferred, matching Overview
// (whose draft state doubles as its display source) and the documented
// Tier Edition pattern (draftPreferredEdition) — a just-Saved-but-not-yet-
// Applied selection must display immediately, not the stale persisted
// projection. This was the module's actual defect (2026-08-16): its read
// card was built from c.projection alone, so Overview's own fields looked
// like they "followed" Save while this sibling module silently didn't.
check(
  tierSystemSource.includes('c.rateSheetHasUnappliedChanges && c.rateSheetAccess !== null')
    && tierSystemSource.includes('c.rateSheetAccess.allowedRateSheetIds'),
  'the Rate Sheet Access read card prefers the in-editor draft while it has unapplied changes, never c.projection alone',
);
const tierSystemEditor = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/editors/TierSystemOverviewEditor.tsx',
), 'utf8');
check(
  tierSystemEditor.includes('cz-tf-field') && tierSystemEditor.includes('cz-tf-label')
    && tierSystemEditor.includes('cz-tf-hint'),
  'the Tier System Overview editor uses the established cz-tf-* vocabulary',
);
for (const chrome of ['InlineEditorShell', 'EntityActionFooter', 'cz-drawer-actions']) {
  check(!tierSystemEditor.includes(chrome), `the Tier System Overview editor owns no ${chrome} of its own`);
}

// Rate Sheet Access module (2026-08-16 rename/rebuild): "Included Rate
// Sheets" everywhere it's user-visible — the module card, its editor's own
// session title, and the header notification shown before Publish. A
// hardcoded old-name string surviving in only one of these spots is exactly
// the defect a prior pass shipped (the editor's own title stayed "Rate
// Sheet Access" through a full copy pass).
const tierSystemBindingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tierSystem.tsx',
), 'utf8');
check(
  tierSystemBindingsSource.includes("title: 'Included Rate Sheets'")
    && tierSystemBindingsSource.includes("subtitle: 'Manage rate sheet access.'"),
  'the Rate Sheet Access module card header reads "Included Rate Sheets" / "Manage rate sheet access."',
);
check(
  tierSystemSource.includes("title: 'Included Rate Sheets'"),
  'the Rate Sheet Access inline editor carries the same session title as its module card, not the old "Rate Sheet Access" name',
);
const tierModuleRulesEarly = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/utils/moduleNotifications/tier.ts',
), 'utf8');
check(
  tierModuleRulesEarly.includes("message: 'Edit and activate ratesheets'"),
  'the unconfigured Rate Sheet Access notification reads the short imperative message, not the old two-sentence explanation',
);
// Body content is exactly Name (draft-preferred, checked above) and Selected
// ratesheets — no Access Mode / Availability / Active / Unresolved restating
// the same facts across four separate rows.
for (const retired of ["label: 'Access Mode'", "label: 'Availability'", "label: 'Active Rate Sheets'", "label: 'Unresolved References'"]) {
  check(!tierSystemBindingsSource.includes(retired), `the Rate Sheet Access module card carries no retired ${retired} field`);
}
check(
  tierSystemBindingsSource.includes("label: 'Selected ratesheets'")
    && tierSystemBindingsSource.includes("fallback: 'Not configured'"),
  'the Rate Sheet Access module card is exactly Name (Not configured when empty) and Selected ratesheets',
);

// The editor is a MultiSelectField dropdown, not a bare checkbox-per-row list
// with an explanatory paragraph above it — the module entry contract already
// forbids explanation blocks; this is the same rule applied to an editor body.
const tierRateSheetAccessEditorSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/editors/TierRateSheetAccessEditor.tsx',
), 'utf8');
check(
  tierRateSheetAccessEditorSource.includes('MultiSelectField')
    && !tierRateSheetAccessEditorSource.includes("type: 'checkbox'")
    && !tierRateSheetAccessEditorSource.includes('cz-tf-hint'),
  'the Rate Sheet Access editor is one MultiSelectField, not a hand-rolled checkbox list with explanatory text',
);

// MultiSelectField (drawer-kit/fields) is the ONE trigger+floating-panel
// multiselect — extracted from Tier Overview's own Customer Groups picker
// once Rate Sheet Access needed the identical shape. Both real consumers
// must keep using the shared component rather than either one drifting back
// to a hand-rolled duplicate, and the panel must genuinely measure itself
// against the viewport rather than always opening downward.
const multiSelectFieldSource = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/fields/MultiSelectField.tsx',
), 'utf8');
const drawerKitFieldsIndex = readFileSync(resolve(root, 'resources/ts/drawer-kit/fields/index.ts'), 'utf8');
const tierOverviewEditorSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx',
), 'utf8');
check(
  drawerKitFieldsIndex.includes('MultiSelectField'),
  'MultiSelectField is exported from the one field system barrel, not a component consumers reach into directly',
);
check(
  multiSelectFieldSource.includes('setOpenUp')
    && multiSelectFieldSource.includes('spaceBelow')
    && multiSelectFieldSource.includes('spaceAbove'),
  'MultiSelectField measures the trigger against the viewport and can open upward, not just downward',
);
check(
  tierOverviewEditorSource.includes('MultiSelectField')
    && !tierOverviewEditorSource.includes('cz-tier-audience-groups'),
  'Tier Overview\'s Customer Groups picker uses the shared MultiSelectField, not its own retired hand-rolled panel',
);

// Milestone 1 footer action set only: Close+Publish while pending, and
// Close+Apply+guarded Delete once persisted. Aggregate status is currently
// DERIVED (TierInstanceSchema::withInstance recomputes it on every write), so
// Enable/Disable/Archive/Trash/Restore have no authoritative backend seam yet
// and must not appear until that backend work lands.
check(
  tierSystemFooterSource.includes("id: 'publish'")
    && tierSystemFooterSource.includes("id: 'apply'")
    && tierSystemFooterSource.includes("id: 'delete'"),
  'the Tier System footer offers exactly Publish (pending) and Apply + Delete (persisted)',
);
for (const forbidden of [
  "label: 'Enable'", "label: 'Disable'", "label: 'Archive'", "label: 'Trash'", "label: 'Restore'",
  'onToggleActive', 'onArchive', 'onTrash', 'onRestore',
]) {
  check(!tierSystemFooterSource.includes(forbidden), `the Tier System footer does not offer ${forbidden} in Milestone 1`);
  check(!tierSystemController.includes(forbidden), `the Tier System controller does not wire ${forbidden} in Milestone 1`);
}

// Inline Save commits a module's draft locally only — Publish/Apply own every
// create or update request, so Save itself must call neither. Each save
// function's body is nothing but the editor-close state flip.
function bodyBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = start >= 0 ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return start >= 0 && end > start ? source.slice(start, end) : '';
}
const saveOverviewBody = bodyBetween(tierSystemController, 'const saveOverviewDraft = useCallback', 'const cancelOverviewEdit');
const saveRateSheetBody = bodyBetween(tierSystemController, 'const saveRateSheetDraft = useCallback', 'const cancelRateSheetEdit');
for (const [name, body] of [
  ['Overview', saveOverviewBody],
  ['Rate Sheet Access', saveRateSheetBody],
] as const) {
  check(body.length > 0, `Inline Save for ${name} is defined where expected`);
  check(
    body.includes('setEditingModule(null)')
      && !body.includes('createInstance') && !body.includes('updateInstance'),
    `Inline Save on ${name} only closes the editor — no create or update call`,
  );
}
check(
  tierSystemController.includes('createInstance(') && tierSystemController.includes('const publish'),
  'createTierInstance is reachable only from the controller\'s publish() — the footer\'s authoritative write',
);
check(
  tierSystemController.includes('updateInstance(') && tierSystemController.includes('const apply'),
  'updateTierInstance is reachable only from the controller\'s apply() — the footer\'s authoritative write',
);
// `instance` reads createdInstance first once Publish has set it this
// session, and never falls back to tool.instances again for the pending
// host (TierRegistrationHost always passes instance={null}) — so apply()
// must re-sync createdInstance from its own updateInstance response, or
// every module read (Rate Sheet Access's pill included) stays frozen at
// whatever Publish saw until a full page reload re-derives from a fresh
// collection read (the actual 2026-08-16 defect).
check(
  /if \(createdInstance !== null\) setCreatedInstance\(saved\);/.test(tierSystemController),
  'apply() re-syncs createdInstance with its own response, so a first-session Apply is never frozen at Publish-time data',
);
// apply()'s family-reassignment failure surfaces the real backend rejection
// code (already captured in tool.error) instead of a fixed string, so a
// recurrence of a DIFFERENT failure mode carries evidence instead of
// requiring another blind diagnosis.
check(
  tierSystemController.includes('guardMessage(tool.error,'),
  'a failed family reassignment during Apply shows the real backend rejection code, not only a generic message',
);

// Guarded permanent delete: the existing backend endpoint, not a
// frontend-only reproduction of its guards.
check(
  tierSystemController.includes('tool.deleteInstance'),
  'delete goes through the existing guarded tier-instance delete endpoint via useTierInstances',
);
const tierInstancesToolSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierInstance/useTierInstances.ts',
), 'utf8');
const deleteInstanceBody = bodyBetween(
  tierInstancesToolSource,
  'const deleteInstance = useCallback',
  'const assignInstance = useCallback',
);
check(
  deleteInstanceBody.includes("Promise<string | null>")
    && !deleteInstanceBody.includes('setError(')
    && !deleteInstanceBody.includes('refetch()')
    && !deleteInstanceBody.includes('setInstances('),
  'guarded delete returns its own dialog error and does not replace or refetch the still-mounted drawer record',
);
// Order is load-bearing, not cosmetic. AdminStationDrawerContext.close()
// deliberately drops the originating wall's refetch handle, so notifying
// AFTER closing refreshes nothing and the wall keeps offering a Tier Group
// the endpoint already deleted — the stale binding that later opens a dead
// tier_instance_id and reports "Package Station not found". Since
// useTierInstances.deleteInstance deliberately does NOT refetch (it must not
// pull the record out from under the still-mounted confirmation dialog),
// this notification is the ONLY refresh the delete has.
check(
  tierSystemController.indexOf('bridge.onMutationComplete?.();', tierSystemController.indexOf('const confirmDelete'))
    < tierSystemController.indexOf('bridge.close();', tierSystemController.indexOf('const confirmDelete')),
  'successful Tier Group deletion refreshes its opener before the close that drops the refetch handle',
);
check(
  tierSystemController.indexOf('bridge.setCloseGuard(null);', tierSystemController.indexOf('const confirmDelete'))
    < tierSystemController.indexOf('bridge.close();', tierSystemController.indexOf('const confirmDelete')),
  'confirmed Tier Group deletion clears the draft close guard before its terminal drawer close',
);
check(
  !deleteInstanceBody.includes('setSaving('),
  'Tier Group deletion uses its owning dialog busy state without replacing the record footer',
);
const confirmDeleteBody = bodyBetween(
  tierSystemController,
  'const confirmDelete = useCallback',
  'const isDirty =',
);
check(
  !confirmDeleteBody.includes('setDeleteError(null)'),
  'retrying a blocked Tier Group deletion keeps its error visible so the dialog does not jump',
);
check(
  tierSystemSource.includes('deleteDialogOpen') && tierSystemSource.includes('confirmDelete'),
  'delete is gated behind an explicit confirmation dialog',
);

// A Package Family is not a field on a Tier system. The instance schema carries
// no Family vocabulary, so the link must stay a separate assignment write —
// unchanged by unification, and unchanged for an already-persisted system.
check(
  tierSystemController.includes('tool.assignInstance')
    && tierSystemController.includes('tool.unassignInstance'),
  'a Family is linked through the assignment ledger, not written onto the instance',
);
for (const forbidden of ['family_id', 'consumer_id:', 'group_id:']) {
  check(!tierSystemController.includes(forbidden), `the Tier System controller writes no ${forbidden} onto the instance`);
}
check(
  tierSystemController.includes('tool.eligibleFamilies'),
  'only Families holding no Tier system are offered, so no assignment is silently retargeted',
);
// Assignment failure after a successful create reports partial success and
// keeps the minted id — it never discards the created Tier System.
const publishStart = tierSystemController.indexOf('const publish = useCallback');
const publishEnd = tierSystemController.indexOf('const apply = useCallback', publishStart);
const publishBody = publishStart >= 0 && publishEnd > publishStart
  ? tierSystemController.slice(publishStart, publishEnd)
  : '';
check(
  publishBody.includes('setCreatedInstance(created)') && publishBody.includes('pointAssignment'),
  'publish() retains the created instance before attempting the optional Family assignment',
);
// …and a retry after that partial failure resumes THAT instance. Minting a
// second one leaves an orphan Tier Group behind and makes the ledger reject
// the retry outright with consumer_already_assigned, since the first attempt
// already claimed the Family.
check(
  publishBody.includes('createdInstance\n        ?? await tool.createInstance('),
  'publish() resumes the instance a prior attempt already created rather than minting a second one',
);

// The atomic-creation hook is gone. Family, Rate Sheet and group creation are
// owned by the drawers that already performed those writes, so a second writer
// of the one Package Manager document must not reappear beside them.
check(
  !existsSync(resolve(root, 'resources/ts/package-station/surface/packageManager')),
  'no second Package Manager creation writer sits beside the drawers that own those writes',
);

// Ordinary occupant/slot opens never mount either Tier System host, so the
// Family collection and instance-settings read stay out of every individual
// Tier drawer open.
const tierDrawerContentSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
), 'utf8');
check(
  !tierDrawerContentSource.includes('useTierInstances')
    && !tierDrawerContentSource.includes('TierSystemContent')
    && !tierDrawerContentSource.includes('TierRegistrationHost')
    && !tierDrawerContentSource.includes('TierInstanceSettingsHost'),
  'the individual Tier occupant composition never loads the Tier System tool or hosts',
);

// ── Empty-slot drawer entry ───────────────────────────────────────────────────
// An empty fixed slot opens the ordinary readable module screen. The drawer
// explains no setup sequence above it and opens no editor for it: the empty Tier
// Overview module carries its own Pending pill, that pill's message, and the Edit
// action that opens the editor — the cycle Included Features and Common Questions
// already follow.
check(
  !tierDrawerContentSource.includes('cz-tier-drawer-setup')
    && !tierDrawerContentSource.includes('This fixed slot is empty.'),
  'the empty-slot drawer presents no explanation block above its modules',
);
const tierDrawerHostSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx',
), 'utf8');
check(
  tierDrawerHostSource.includes(
    "initialTierSection={mode === 'edit' && slotTarget === null ? 'tier-overview' : undefined}",
  ),
  'an empty slot opens on the readable Overview screen, never straight into the Tier Overview editor',
);
const tierBindingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tier.tsx',
), 'utf8');
// Overview's own "+ Edition" footer action was relocated off this shell
// entirely (drawer refinement blueprint, UI refinement Phase 2) — it now
// lives solely in Options' own selector row (TierEditionDeclarationSwitcher),
// the single place that creates one. Overview, Pricing Rules, Features, and
// FAQs all use the plain shared DETAILS_FOOTER/DETAILS_ACTIONS now — no
// Overview-specific superset remains.
//
// Phase 2B1.1 added a fifth module, Customer Selection Rules
// (tierCustomerPolicyShell, composable occupant only), using this SAME
// shared footer/actions convention — the count below tracks how many Tier
// modules currently exist in this file, not a fixed ceiling; it moves from
// 4 to 5 because a genuine fifth module now exists, not because this check
// was loosened. The invariant itself — no module gets a footer/actions
// superset of its own — is unchanged and still enforced by the negative
// checks (OVERVIEW_FOOTER/OVERVIEW_ACTIONS/'add-edition') right below.
check(
  (tierBindingsSource.match(/footer:\s+DETAILS_FOOTER/g) ?? []).length === 5
    && !tierBindingsSource.includes('OVERVIEW_FOOTER')
    && !tierBindingsSource.includes('OVERVIEW_ACTIONS')
    && !tierBindingsSource.includes("id: 'add-edition'")
    && tierBindingsSource.includes("edit: { id: 'edit', label: 'Edit', intent: 'secondary' }"),
  'all five Tier modules offer the same Edit action into their own inline editor, through the one shared DETAILS_FOOTER/DETAILS_ACTIONS — Overview carries no second, Edition-creating action of its own anymore',
);
const tierModuleRules = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/utils/moduleNotifications/tier.ts',
), 'utf8');
check(
  /tierOverviewModule[^}]*emptyPrompt:\s+'Edit and configure this tier\.'/s.test(tierModuleRules),
  'the empty Tier Overview module carries the message its Pending pill opens with',
);

console.log('Tier System drawer contract checks passed.');
