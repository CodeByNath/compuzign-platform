// Account module rules — Account Station's single owned module, Brand.
//
// Brand has no required field (blanks are valid, AccountSchema::isBrandComplete()
// is unconditionally true), so "empty" here is never about field content — it is
// "has this singleton ever been Saved", the frontend's own equivalent of the
// create/new-sentinel gate every other Station's drawer carries. Once bootstrapped,
// Brand is never empty again.

import type { ModuleDefinition, ModuleNote } from './shared';

export interface AccountBrandLike {
  bootstrapped: boolean;
}

export const accountBrandModule: ModuleDefinition<AccountBrandLike> = {
  key: 'account-brand',
  emptyPrompt: 'Save to create the Account Profile record.',
  isEmpty: (data) => !data.bootstrapped,
  problems: (): ModuleNote[] => [],
  resolveStatus: (data, ctx) => {
    if (!data.bootstrapped) return 'pending-dim';
    if (ctx.moduleTransition === 'pending') return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};
