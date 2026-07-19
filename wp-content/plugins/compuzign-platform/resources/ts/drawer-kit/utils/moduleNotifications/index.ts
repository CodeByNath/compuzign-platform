// Module notifications barrel — preserves the original single-file public
// surface (`@/drawer-kit/utils/moduleNotifications`). The shared engine and the
// per-domain rule groups live in the sibling files; every consumer keeps its
// existing import specifier and symbols.

export * from './shared';
export * from './service';
export * from './package';
export * from './tier';
export * from './promotion';
export * from './category';
export * from './packageFamily';
