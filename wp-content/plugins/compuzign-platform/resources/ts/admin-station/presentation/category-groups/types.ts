/*
 * Category Group cards — the presentation contract.
 *
 * The narrow, entity-shaped contract the Category Group card grid renders. It is
 * a PRESENTATION contract, not a station model: the future Category Station owns
 * the read and adapts its records into these shapes. Cards never fetch.
 *
 * Identity is carried by `id` (and the optional `key`) and nothing else. Every
 * action dispatch and drawer request travels by that identity, so no consumer
 * ever branches on a Category Group's name.
 *
 * Status and notifications deliberately reuse the platform's existing non-visual
 * contracts rather than restating them:
 *   - `CategoryGroupStatus` is the existing 5-state resolver vocabulary
 *     (components/admin/utils/moduleStatus.tsx), whose label/class mapping is
 *     owned by the Presentation Status Contract chokepoint
 *     (components/admin/schema/presentation.ts).
 *   - `CategoryGroupNotification` is the existing ModuleNote, re-exported through
 *     this narrow adapter so the card depends on the notification *contract*
 *     without reaching for the old notification UI.
 * Both imports are type-only and non-visual, matching the precedent set by
 * useServiceStation.
 */

import type { ComponentType } from 'preact';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';

// ── Identity and vocabulary ──────────────────────────────────────────────────

/**
 * The existing 5-state resolver vocabulary — NOT a new set of statuses.
 *
 * These are exactly the keys PILL_META accepts; the pill collapses both pending
 * flavours to a single Pending label. A Category Group's status is resolved by
 * categoryGroupOverviewModule, which already exists.
 */
export type CategoryGroupStatus = 'active' | 'disabled' | 'pending-dim' | 'pending-full';

/**
 * The card's notification contract — the existing ModuleNote under a local name.
 *
 * A non-visual adapter, and only that. The platform's note *data* layer
 * (ModuleNote, noteCount, categoryGroupOverviewModule) is pure logic and freely
 * reusable, but its only renderer — ModuleNotificationPanel — is old-tree UI
 * whose stylesheet this environment never loads, and the old system's affordance
 * for it (a clickable status pill opening that panel) cannot be composed without
 * migrating it.
 *
 * So this phase carries the notes in the contract and renders none: the panel is
 * reported as a missing station dependency rather than reinvented as a badge
 * with nowhere to lead. When a station notification surface exists, cards already
 * hold the data it needs.
 */
export type CategoryGroupNotification = ModuleNote;

// ── Card parts ───────────────────────────────────────────────────────────────

/** One metric block. The card loops these — it never names them. */
export interface CategoryGroupCardMetric {
  id:    string;
  label: string;
  value: number | string;
  icon?: ComponentType<{ class?: string }>;
}

/**
 * One action offered by a card.
 *
 * The first non-disabled action is the split control's primary; the remainder
 * fill its menu. `destructive` is honoured only when the data supplies it — the
 * card never invents a destructive action.
 */
export interface CategoryGroupCardAction {
  id:    string;
  label: string;
  icon?:        ComponentType<{ class?: string }>;
  disabled?:    boolean;
  destructive?: boolean;
}

// ── The card item ────────────────────────────────────────────────────────────

/** One Category Group, as the grid renders it. */
export interface CategoryGroupCardItem {
  // Stable identity — keys the render and travels with every dispatch.
  id:    string;
  // Optional stable slug/key. Carried through dispatches so a future consumer
  // may resolve by key without a lookup.
  key?:  string;
  name:  string;
  description?:   string;
  icon?:          ComponentType<{ class?: string }>;
  // Short code / family pill shown beside the name where available.
  code?:          string;
  status?:        CategoryGroupStatus;
  notifications?: CategoryGroupNotification[];
  metrics:        CategoryGroupCardMetric[];
  actions:        CategoryGroupCardAction[];
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/** The payload every card action emits. Identity-only — never a name. */
export interface CategoryGroupCardActionEvent {
  cardId:   string;
  cardKey?: string;
  actionId: string;
}

/** Drawer modes the future Category Group drawer may support. */
export type CategoryGroupDrawerMode = 'overview' | 'edit' | 'archive';

/**
 * The drawer-opening request.
 *
 * Prepared now and emitted by the card's primary action; the drawer that
 * consumes it does not exist yet (see the phase report). The selected card's id
 * determines the content — nothing here is bound to the sample item.
 */
export interface CategoryGroupDrawerRequest {
  categoryGroupId:   string;
  categoryGroupKey?: string;
  mode:              CategoryGroupDrawerMode;
}
