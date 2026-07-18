// Drawer contracts — the zero-dependency type module for the drawer axis.
//
// Kept separate from drawerRegistry.tsx so both the registry (which value-imports
// the entity content) and the entity content (which needs only these types) can
// import from here without forming a cycle. Imports nothing by design.

// The two first-level tabs of the Admin Station drawer. Not the old EntityDrawer
// Details/Connections axis — this drawer is a view surface and an edit surface.
export type DrawerMode = 'view' | 'edit';

// Registered drawer template keys. A string-literal union so a binding and an
// intent can only name a template the registry actually defines.
export type DrawerTemplateKey = 'service-category-group';

// What the shell hands a template's content: the numeric record identity that
// drove the intent, the active tab, and a close handle. The content resolves the
// record from the id — the identity stays numeric across the whole boundary.
export interface DrawerContentProps {
  recordId: number;
  mode:     DrawerMode;
  onClose:  () => void;
}

export type DrawerContent = (props: DrawerContentProps) => import('preact').VNode;

export interface DrawerTemplateRegistration {
  key:            DrawerTemplateKey;
  // Neutral header title, entity-named in data (not by a shell branch).
  title:          string;
  supportedModes: DrawerMode[];
  content:        DrawerContent;
}
