// Display conditions — where and when a module mounts on a given page.
// Each condition type maps to a specific WordPress page context.
// resolveCondition() returns the target HTMLElement when the condition
// is satisfied on the current page, or null when it is not.

export interface ShortcodeCondition {
  type: 'shortcode';
  // The id attribute of the div rendered by the WordPress shortcode.
  mountId: string;
}

export interface PageCondition {
  type: 'page';
  // Future: match by WordPress page slug or numeric ID.
  slug?: string;
  pageId?: number;
}

export interface ArchiveCondition {
  type: 'archive';
  // Future: match by post type archive (e.g. 'cz_service').
  postType: string;
}

export interface SingleCondition {
  type: 'single';
  // Future: match single post/CPT views, optionally scoped by post type.
  postType?: string;
}

export type MountCondition =
  | ShortcodeCondition
  | PageCondition
  | ArchiveCondition
  | SingleCondition;

// Resolves a mount condition to a DOM element on the current page.
// Returns null when the condition does not apply (module should not mount here).
export function resolveCondition(condition: MountCondition): HTMLElement | null {
  switch (condition.type) {
    case 'shortcode':
      return document.getElementById(condition.mountId);

    case 'page':
    case 'archive':
    case 'single':
      // Not yet implemented — WordPress will need to inject page-type context
      // via CompuZignConfig for these conditions to resolve.
      return null;

    default:
      return null;
  }
}
