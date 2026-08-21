import type { ComponentChildren } from 'preact';
import type { ModuleNote } from './utils/moduleNotifications';
import { ModuleStatusPill } from './ui/ModuleStatusPill';
import { ModuleNotificationPanel } from './ui/ModuleNotificationPanel';
import { ActionFooter } from './ActionFooter';
import type { FooterAction } from './ActionFooter';

interface Props {
  title: string;
  // Footer — either an ordered action descriptor list (S1b, preferred) or the
  // legacy single-Edit shorthand. `actions` wins when both are supplied.
  actions?: FooterAction[];
  onEdit?: () => void;
  editDisabled?: boolean;
  // Optional full-module header parts, matching the Service Overview card.
  // `icon` is the inner SVG; it is wrapped in the shared `.drawerModule__icon`
  // frame (add `iconVariant` for the per-module variant hook). `subtitle` renders
  // the helper line beneath the title. `scopeClass` is appended to the root
  // `.drawerModule` (e.g. `drawerOverview tier`) to opt into the label/value scope.
  // All are opt-in — omit them for a plain read card.
  icon?: ComponentChildren;
  iconVariant?: string;
  subtitle?: string;
  scopeClass?: string;
  // Optional module lifecycle. When `status` is supplied the canonical
  // ModuleStatusPill renders in the header and, when opened, the
  // ModuleNotificationPanel renders between header and body — the same
  // structure every drawerModule uses. Omit all of these for a plain read card.
  status?: string;
  notes?: ModuleNote[];
  panelOpen?: boolean;
  onTogglePanel?: () => void;
  children: ComponentChildren;
}

export function ReadBlock({
  title, actions, onEdit, editDisabled,
  icon, iconVariant, subtitle, scopeClass,
  status, notes, panelOpen, onTogglePanel, children,
}: Props) {
  const moduleNotes = notes ?? [];
  const showPanel   = !!status && panelOpen === true && moduleNotes.length > 0;
  // Normalise the legacy onEdit shorthand into a descriptor list — one footer path.
  const footerActions: FooterAction[] = actions
    ?? (onEdit ? [{ id: 'edit', label: 'Edit', onSelect: onEdit, disabled: editDisabled }] : []);

  // Renders the canonical self-contained `.drawerModule` card directly — the same
  // bare frame the Service drawer view cards use (no `.cz-shell-section` wrapper),
  // so module-to-module spacing follows the shared `.drawerModule` rhythm.
  return (
    <div class={`drawerModule${scopeClass ? ` ${scopeClass}` : ''}`}>
        <div class="drawerModule__header">
          {icon && (
            <span class={`drawerModule__icon${iconVariant ? ` ${iconVariant}` : ''}`}>
              {icon}
            </span>
          )}
          <div class="drawerModule__heading">
            <p class="drawerModule__title">{title}</p>
            {subtitle && <p class="drawerModule__subtitle">{subtitle}</p>}
          </div>
          {status && (
            <div class={`drawerModule__status${status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
              <ModuleStatusPill
                status={status}
                notes={moduleNotes}
                onOpen={onTogglePanel}
              />
            </div>
          )}
        </div>
        {showPanel && <ModuleNotificationPanel notes={moduleNotes} />}
        <div class="drawerModule__body">
          {children}
        </div>
        <ActionFooter actions={footerActions} />
    </div>
  );
}
