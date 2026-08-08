// Presentation-only descriptor layer for entity-controlled footer actions.
// Owning controllers decide which actions exist and where they are placed.
// This module deliberately receives no status or lifecycle vocabulary.

import {
  EntityActionFooter,
  type EntityFooterAction,
  type EntityFooterSplitAction,
} from './EntityActionFooter';

export type SupportedFooterAction = EntityFooterAction & {
  // 'split-forward' is a second, independent split (additive — every
  // existing caller omits it) that renders on the opposite side of 'split'.
  // See EntityActionFooter's own `splitForward` prop comment.
  placement: 'close' | 'primary' | 'split' | 'split-forward';
  tone?: 'danger' | 'secondary';
  overflow?: EntityFooterAction[];
  open?: boolean;
  onToggle?: () => void;
  // See EntityFooterSplitAction's own comment — additive, defaults to today's
  // direct-click behavior for every existing caller.
  menuOnly?: boolean;
};

export interface SupportedActionFooterModel {
  close: EntityFooterAction;
  primary: EntityFooterAction | null;
  split: EntityFooterSplitAction | null;
  splitForward: EntityFooterSplitAction | null;
}

export function resolveSupportedFooterActions(
  actions: readonly SupportedFooterAction[],
): SupportedActionFooterModel {
  const closeActions = actions.filter((action) => action.placement === 'close');
  const primaryActions = actions.filter((action) => action.placement === 'primary');
  const splitActions = actions.filter((action) => action.placement === 'split');
  const splitForwardActions = actions.filter((action) => action.placement === 'split-forward');

  if (
    closeActions.length !== 1 || primaryActions.length > 1
    || splitActions.length > 1 || splitForwardActions.length > 1
  ) {
    throw new Error('Supported footer requires exactly one Close action and at most one of each: primary, split, split-forward.');
  }

  const withoutPlacement = (action: SupportedFooterAction): EntityFooterAction => {
    const { placement: _placement, tone: _tone, overflow: _overflow, open: _open, onToggle: _onToggle, ...resolved } = action;
    return resolved;
  };

  const resolveSplit = (split: SupportedFooterAction | undefined): EntityFooterSplitAction | null =>
    split ? {
      ...withoutPlacement(split),
      tone: split.tone ?? 'secondary',
      overflow: split.overflow ?? [],
      open: split.open ?? false,
      onToggle: split.onToggle ?? (() => {}),
      menuOnly: split.menuOnly ?? false,
    } : null;

  return {
    close: withoutPlacement(closeActions[0]),
    primary: primaryActions[0] ? withoutPlacement(primaryActions[0]) : null,
    split: resolveSplit(splitActions[0]),
    splitForward: resolveSplit(splitForwardActions[0]),
  };
}

export function SupportedActionFooter({ actions }: { actions: readonly SupportedFooterAction[] }) {
  const model = resolveSupportedFooterActions(actions);
  return <EntityActionFooter close={model.close} primary={model.primary} split={model.split} splitForward={model.splitForward} />;
}
