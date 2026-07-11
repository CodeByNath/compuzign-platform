import type { ActionConfig } from '../ActionShell';
import type { EntitySchema } from '../schema/types';
import type { ModuleNote, ModuleState } from '../utils/moduleNotifications';

export interface ManagerEntityRef {
  type: EntitySchema['id'];
  id: string | number;
}

export type StationManagerScope =
  | {
    kind: 'connection-graph';
    stationContext: ManagerEntityRef;
    activeProviderKey?: string;
    activeRelationshipKey?: string;
  }
  | {
    kind: 'subject-connections';
    stationContext: ManagerEntityRef;
    subject: ManagerEntityRef;
    activeProviderKey?: string;
    activeRelationshipKey?: string;
  };

export interface StationConnectionDescriptor {
  providerKey: string;
  relationshipKey: string;
  stationContext: ManagerEntityRef;
  destinationRef?: ManagerEntityRef;
}

export interface ManagerContinuation {
  stationContext: ManagerEntityRef;
  scopeKind: StationManagerScope['kind'];
  subject?: ManagerEntityRef;
  /** Destination identity; separate from the Manager scope restored on Back. */
  destination?: ManagerEntityRef;
  activeProviderKey: string;
  activeRelationshipKey?: string;
  selectedSectionKey?: string;
  originatingTab: 'manager';
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
  sectionId?: string;
  rowIdentity?: string;
}

export type ProviderValidationResult =
  | { valid: true; issues: [] }
  | { valid: false; issues: ProviderValidationIssue[] };

export interface ManagerSummaryContribution<ReadModel = unknown> {
  label: string;
  subtitle: string;
  project(readModel: ReadModel, scope: StationManagerScope, draft?: unknown): {
    status: ModuleState;
    metrics: readonly { id: string; label: string; value: number }[];
  };
}

export interface ManagerSubjectSummary {
  ref: ManagerEntityRef;
  label: string;
  title: string;
  subtitle?: string;
  status: ModuleState;
  fields: readonly {
    id: string;
    label: string;
    values: readonly string[];
  }[];
}

export interface ManagerEmptyStateDefinition {
  title: string;
  description?: string;
}

export interface ManagerSectionDefinition<ReadModel = unknown, Row = unknown, Identity = unknown> {
  /** Stable within the provider; the coordinator exposes `${providerKey}:${id}`. */
  id: string;
  label: string;
  role: 'rate-sheet' | 'structure' | 'relations';
  capabilities: readonly RelationCapabilityId[];
  rows?: (readModel: ReadModel) => readonly Row[];
  identity?: (row: Row) => Identity;
  emptyState: ManagerEmptyStateDefinition;
  validationPaths: readonly string[];
  project(readModel: ReadModel, scope: StationManagerScope, draft?: unknown):
    | {
      role: 'structure';
      rows: readonly { id: string; label: string; order: number; relationshipCount: number }[];
    }
    | {
      role: 'relations';
      filters: readonly { id: string; label: string }[];
      rows: readonly {
        id: string;
        filterIds: readonly string[];
        sourceLabel: string;
        groupLabel: string;
        order: number;
        state: ModuleState;
        stateDetail: string;
        availability: 'Available' | 'Not available' | 'Disabled' | 'Missing source';
        sourceHealth: 'Connected' | 'Missing';
      }[];
    }
    | {
      role: 'rate-sheet';
      configured: boolean;
      title: string;
      groups: readonly { id: string; label: string }[];
      options: readonly { id: string; label: string }[];
      units: readonly string[];
      items: readonly {
        id: string;
        optionId: string;
        optionLabel: string;
        unitPrice: number;
        per: string;
        quantity: number;
        groupId: string | null;
        groupLabel: string;
      }[];
    };
  structureControls?: {
    create(draft: unknown, groupId: string): unknown;
    rename(draft: unknown, groupId: string, label: string): unknown;
    move(draft: unknown, groupId: string, direction: -1 | 1): unknown;
    delete(draft: unknown, groupId: string): unknown;
  };
  rateSheetControls?: {
    replace(draft: unknown, rateSheet: {
      title: string;
      groups: readonly { id: string; label: string }[];
      items: readonly {
        id: string;
        optionId: string;
        unitPrice: number;
        per: string;
        quantity: number;
        groupId: string | null;
      }[];
    }): unknown;
  };
}

/** Provider presentation metadata only. The platform always owns the frame. */
export interface ManagerContribution<ReadModel = unknown, Row = unknown, Identity = unknown> {
  /** Stable registry priority; lower values appear first. Load timing is irrelevant. */
  order: number;
  summary?: ManagerSummaryContribution<ReadModel>;
  sections: readonly ManagerSectionDefinition<ReadModel, Row, Identity>[];
  subjects?: (readModel: ReadModel, scope: StationManagerScope) => readonly {
    ref: ManagerEntityRef;
    label: string;
  }[];
  subjectSummaries?: (readModel: ReadModel, scope: StationManagerScope) => readonly ManagerSubjectSummary[];
  destinationActions?: (readModel: ReadModel, scope: StationManagerScope) => readonly {
    id: 'view-all' | 'open-current' | 'edit-current';
    label: string;
  }[];
}

export interface ProviderScopeProfile {
  applicable: boolean;
  access: 'read-only' | 'writable';
  capabilities: {
    fields: readonly RelationCapabilityId[];
    customFields?: readonly RelationCustomField[];
  };
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

  profile(scope: StationManagerScope): ProviderScopeProfile;
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
  manager: ManagerContribution<ReadModel, Row, Identity>;
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
