// Category Group drawer — the request contract and its seam.
//
// This is the whole drawer surface for this phase: a request shape, an action→
// mode mapping, and the callback the card action dispatches into. No drawer, no
// editor, no form, no persistence.
//
// MISSING DEPENDENCY — the new Admin Station has no drawer shell. The shell tree
// owns the Header, Body, Footer, and slide menu only; the platform's drawer
// (components/admin/EntityDrawer.tsx) is old-tree UI whose stylesheet this
// environment never loads. The phase brief is explicit that the callback should
// be exposed and the gap reported rather than a second drawer system invented,
// so `openCategoryGroupDrawer` below is deliberately inert until a station
// drawer shell exists. It is the single place that shell will attach.

import type {
  CategoryGroupCardActionEvent,
  CategoryGroupDrawerMode,
  CategoryGroupDrawerRequest,
} from './types';

/** The shape a future station drawer host will implement. */
export type OpenCategoryGroupDrawer = (request: CategoryGroupDrawerRequest) => void;

// Action id → drawer mode. Keyed by the action's stable id, never by a Category
// Group's name. An unmapped action opens no drawer rather than guessing a mode.
const ACTION_DRAWER_MODE: Record<string, CategoryGroupDrawerMode> = {
  view: 'overview',
  edit: 'edit',
  archive: 'archive',
};

/**
 * Build a drawer request from a card action.
 *
 * The identity travels straight from the dispatching card, so the request always
 * describes the card the user acted on — the sample item is never assumed.
 * Returns null when the action maps to no drawer mode.
 */
export function toCategoryGroupDrawerRequest(
  event: CategoryGroupCardActionEvent,
): CategoryGroupDrawerRequest | null {
  const mode = ACTION_DRAWER_MODE[event.actionId];
  if (!mode) {
    return null;
  }

  return {
    categoryGroupId: event.cardId,
    categoryGroupKey: event.cardKey,
    mode,
  };
}

/**
 * The drawer seam.
 *
 * Inert by design: there is no station drawer shell to open yet (see the file
 * header). Wiring this to the old EntityDrawer would import old UI into the new
 * environment, and building a drawer here would invent a competing system — both
 * are out of scope for this phase. When the station drawer shell lands, it is
 * hosted here and every card action already reaches it with the right identity
 * and mode.
 */
export function openCategoryGroupDrawer(_request: CategoryGroupDrawerRequest): void {
  // Intentionally empty — awaiting the station drawer shell.
}
