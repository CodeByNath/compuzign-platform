// Presentation-only descriptor layer for entity-controlled footer actions.
// Owning controllers decide which actions exist and where they are placed.
// This module deliberately receives no status or lifecycle vocabulary.

import {
  EntityActionFooter,
  type EntityFooterAction,
  type EntityFooterSplitAction,
} from './EntityActionFooter';

export type SupportedFooterAction = EntityFooterAction & {
  placement: 'close' | 'primary' | 'split';
  tone?: 'danger' | 'secondary';
  overflow?: EntityFooterAction[];
  open?: boolean;
  onToggle?: () => void;
};

export interface SupportedActionFooterModel {
  close: EntityFooterAction;
  primary: EntityFooterAction | null;
  split: EntityFooterSplitAction | null;
}

export function resolveSupportedFooterActions(
  actions: readonly SupportedFooterAction[],
): SupportedActionFooterModel {
  const closeActions = actions.filter((action) => action.placement === 'close');
  const primaryActions = actions.filter((action) => action.placement === 'primary');
  const splitActions = actions.filter((action) => action.placement === 'split');

  if (closeActions.length !== 1 || primaryActions.length > 1 || splitActions.length > 1) {
    throw new Error('Supported footer requires exactly one Close action and at most one primary and split action.');
  }

  const withoutPlacement = (action: SupportedFooterAction): EntityFooterAction => {
    const { placement: _placement, tone: _tone, overflow: _overflow, open: _open, onToggle: _onToggle, ...resolved } = action;
    return resolved;
  };

  const split = splitActions[0];
  return {
    close: withoutPlacement(closeActions[0]),
    primary: primaryActions[0] ? withoutPlacement(primaryActions[0]) : null,
    split: split ? {
      ...withoutPlacement(split),
      tone: split.tone ?? 'secondary',
      overflow: split.overflow ?? [],
      open: split.open ?? false,
      onToggle: split.onToggle ?? (() => {}),
    } : null,
  };
}

export function SupportedActionFooter({ actions }: { actions: readonly SupportedFooterAction[] }) {
  const model = resolveSupportedFooterActions(actions);
  return <EntityActionFooter close={model.close} primary={model.primary} split={model.split} />;
}
