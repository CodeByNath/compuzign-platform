import {
  adaptActivePackageForManager,
  createActivePackageReadOnlyProvider,
} from '../resources/ts/components/admin/relations/providers/active-package-read-only';
import type { ActivePackageContractFixture } from '../resources/ts/components/admin/relations/providers/active-package-read-only';
import {
  createManagerCoordinatorState,
  managerIsDirty,
  seedProviderReadModel,
} from '../resources/ts/components/admin/relations/coordinator';
import { relationProvidersFor } from '../resources/ts/components/admin/relations/registry';
import type { ManagerProviderAdapter } from '../resources/ts/components/admin/relations/coordinator';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Active Package read-only provider contract: ${message}`);
}

const unresolved = { code: 'unresolved_item', path: 'selections.0.item_id', item_id: 'removed-item' } as const;
const incomplete = { code: 'incomplete_pricing', path: 'pricing.total', item_id: null } as const;
const fixture: ActivePackageContractFixture = {
  package_id: 'pkg-managed-cloud', lifecycle: { status: 'active' },
  rate_sheet: { items: [
    { item_id: 'rate-vm', available: true },
    { item_id: 'rate-backup', available: false },
    { item_id: 'rate-os', available: true },
  ] },
  tiers: {
    basic: {
      enabled: true, contact: false,
      selections: [{ item_id: 'rate-vm', quantity: 4, option_selections: ['ubuntu'] }],
      readiness: { ready: true, blockers: [] },
    },
    enterprise: { enabled: true, contact: true, selections: [], readiness: { ready: true, blockers: [] } },
    premium: {
      enabled: true, contact: false,
      selections: [{ item_id: 'removed-item', quantity: 1, option_selections: [] }],
      readiness: { ready: false, blockers: [unresolved, incomplete] },
    },
    standard: {
      enabled: true, contact: false,
      selections: [{ item_id: 'rate-backup', quantity: 1, option_selections: [] }],
      readiness: { ready: false, blockers: [{ code: 'unavailable_item', path: 'selections.0.item_id', item_id: 'rate-backup' }] },
    },
    ultimate: {
      enabled: true, contact: false,
      selections: [{ item_id: 'rate-os', quantity: 1, option_selections: ['not-offered'] }],
      readiness: { ready: false, blockers: [{ code: 'invalid_option', path: 'selections.0.option_selections', item_id: 'rate-os' }, incomplete] },
    },
  },
  activation: {
    active: true,
    blockers: { premium: [unresolved, incomplete] },
    projection: {
      tiers: {
        basic: { tier_id: 'basic', selections: [{ item_id: 'rate-vm', quantity: 4, option_selections: ['ubuntu'] }], pricing: { mode: 'catalogue', total: 144 } },
        enterprise: { tier_id: 'enterprise', selections: [], pricing: { mode: 'contact', total: null } },
      },
      popular_tier: 'basic',
    },
  },
};

const frozenBefore = JSON.stringify(fixture);
const scope = { kind: 'connection-graph' as const, stationContext: { type: 'service' as const, id: 42 } };
let receivedScope: unknown = scope;
let receivedSignal: AbortSignal | undefined;
const provider = createActivePackageReadOnlyProvider(async (candidate, signal) => {
  receivedScope = candidate;
  receivedSignal = signal;
  return fixture;
});
const controller = new AbortController();
const readModel = await provider.load(scope, controller.signal);
check(receivedScope === scope && receivedSignal === controller.signal, 'load receives the exact scope and abort signal');
check(provider.access === 'read-only' && provider.capabilities.fields.length === 0, 'provider is strictly read-only');
check(!('save' in provider) && !('validate' in provider) && !('createDraft' in provider), 'provider exposes no write lifecycle');

const adapter = provider as ManagerProviderAdapter;
let state = createManagerCoordinatorState([adapter]);
state = seedProviderReadModel(state, adapter, scope, readModel);
check(state.readModelByProvider['active-package'] === readModel, 'existing coordinator seeds the provider read model');
check(!('active-package' in state.draftByProvider) && !('active-package' in state.originalDraftByProvider), 'read-only seeding creates no drafts');
check(!('active-package' in state.saveStateByProvider) && !managerIsDirty(state, [adapter]), 'read-only provider has no save or dirty state');

const rows = provider.rows(readModel);
const missing = rows.find((row) => row.item_id === 'removed-item');
check(missing?.resolved === false, 'unresolved Rate Sheet selection remains visible');
check(provider.display(missing!, readModel).description === '(unresolved Rate Sheet item)', 'unresolved selection has a diagnostic display label');
const missingHealth = provider.health(missing!, readModel, scope);
check(missingHealth.state.status === 'pending-full' && missingHealth.notes.some((note) => note.id.includes('unresolved_item')), 'unresolved selection emits stable unhealthy diagnostics');
check(!('destination' in provider), 'read-only diagnostics do not restore the removed transit-drawer destination contract');
check(rows.some((row) => row.item_id === 'rate-backup' && !row.available), 'unavailable selection remains diagnosable');
check(provider.health(rows.find((row) => row.item_id === 'rate-os')!, readModel, scope).notes.some((note) => note.id.includes('invalid_option')), 'invalid option remains diagnosable');

const contact = rows.find((row) => row.tier_id === 'enterprise')!;
check(provider.health(contact, readModel, scope).state.status === 'active', 'ready contact-only Tier is healthy');
check(readModel.commercial_projection?.tiers.enterprise.pricing.total === null, 'contact-only projection explicitly carries null total');
check(readModel.commercial_projection?.tiers.basic.pricing.total === 144, 'ready priced Tier carries its authoritative total');
check(!JSON.stringify(readModel.commercial_projection).includes('resolved_subtotal'), 'consumer projection excludes diagnostic partial totals');
check(!JSON.stringify(readModel.commercial_projection).includes('provider_key'), 'consumer projection excludes source provenance');
check(provider.identityKey(provider.identity(missing!)) === 'premium:removed-item', 'Tier and item identity are stable through adaptation');
check(JSON.stringify(fixture) === frozenBefore, 'adaptation does not mutate fixture input');
check(!relationProvidersFor(scope).some((candidate) => candidate.key === provider.key), 'unregistered provider is not production-discoverable');

const unsafeFixture = structuredClone(fixture);
unsafeFixture.activation = { active: false, blockers: { premium: [unresolved, incomplete] }, projection: null };
check(adaptActivePackageForManager(unsafeFixture).commercial_projection === null, 'unsafe Package exposes no commercial projection');

const aborted = new AbortController();
aborted.abort();
let abortRejected = false;
try { await provider.load(scope, aborted.signal); } catch (error) { abortRejected = error instanceof DOMException && error.name === 'AbortError'; }
check(abortRejected, 'aborted load fails before fixture adaptation');

console.log('Active Package read-only provider contract checks passed.');
