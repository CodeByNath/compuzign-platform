import type { ComponentChildren } from 'preact';
import type { ActionConfig } from '../ActionShell';
import type { EntitySchema } from '../schema/types';
import type { ModuleNote, ModuleState } from '../utils/moduleNotifications';

export interface StationManagerScope {
  stationType: EntitySchema['id'];
  stationId: string | number;
  context: Record<string, unknown>;
}

export type RelationCapabilityId =
  | 'grouping'
  | 'ordering'
  | 'visibility'
  | 'availability'
  | 'decorated-label'
  | 'priority';

export interface RelationCustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface RelationNavigationContext {
  openAction: (config: ActionConfig) => void;
}

export interface RelationHealth {
  state: ModuleState;
  destinationAvailable: boolean;
  notes: ModuleNote[];
}

export interface ProviderValidationIssue {
  path: string;
  message: string;
}

export type ProviderValidationResult =
  | { valid: true; issues: [] }
  | { valid: false; issues: ProviderValidationIssue[] };

export interface ProviderControlContext<Row, Draft> {
  row: Row;
  draft: Draft;
  replaceDraft: (draft: Draft) => void;
}

export interface RelationProviderBase<
  Scope extends StationManagerScope,
  ReadModel,
  Row,
  Identity,
> {
  key: string;
  label: string;
  stationType: EntitySchema['id'];

  appliesTo(scope: StationManagerScope): scope is Scope;
  load(scope: Scope, signal?: AbortSignal): Promise<ReadModel>;
  rows(readModel: ReadModel): Row[];
  identity(row: Row): Identity;
  identityKey(identity: Identity): string;
  display(row: Row, readModel: ReadModel): {
    label: string;
    description?: string;
  };
  health(row: Row, readModel: ReadModel, scope: Scope): RelationHealth;
  destination(
    row: Row,
    readModel: ReadModel,
    scope: Scope,
    context: RelationNavigationContext,
  ): ActionConfig | null;
}

export interface ReadOnlyRelationProvider<
  Scope extends StationManagerScope,
  ReadModel,
  Row,
  Identity,
> extends RelationProviderBase<Scope, ReadModel, Row, Identity> {
  access: 'read-only';
  capabilities: {
    fields: readonly [];
  };
}

export interface WritableRelationProvider<
  Scope extends StationManagerScope,
  ReadModel,
  Row,
  Identity,
  Draft,
> extends RelationProviderBase<Scope, ReadModel, Row, Identity> {
  access: 'writable';
  capabilities: {
    fields: readonly RelationCapabilityId[];
    customFields?: readonly RelationCustomField[];
  };
  createDraft(readModel: ReadModel, scope: Scope): Draft;
  isDirty(draft: Draft, original: Draft, readModel: ReadModel): boolean;
  validate(draft: Draft, readModel: ReadModel, scope: Scope): ProviderValidationResult;
  save(
    scope: Scope,
    draft: Draft,
    original: Draft,
    readModel: ReadModel,
  ): Promise<ReadModel>;
  renderCustomControls?: (context: ProviderControlContext<Row, Draft>) => ComponentChildren;
}

export type StationRelationProvider<
  Scope extends StationManagerScope,
  ReadModel,
  Row,
  Identity,
  Draft = never,
> =
  | ReadOnlyRelationProvider<Scope, ReadModel, Row, Identity>
  | WritableRelationProvider<Scope, ReadModel, Row, Identity, Draft>;

export function providerHasManagementCapability(provider: {
  access: 'read-only' | 'writable';
  capabilities: { fields: readonly RelationCapabilityId[]; customFields?: readonly RelationCustomField[] };
}): boolean {
  return provider.access === 'writable' && (
    provider.capabilities.fields.length > 0
    || (provider.capabilities.customFields?.length ?? 0) > 0
  );
}
