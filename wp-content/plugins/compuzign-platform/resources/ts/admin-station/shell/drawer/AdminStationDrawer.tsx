// Admin Station drawer — the shared, entity-agnostic drawer shell.
//
// It renders whatever drawer template the controller's open-state resolves to:
// a right-side panel with a header, scrolling body, and entity-supplied footer.
// Overview / Connections and module editing are owned by the composition. It
// names no entity and imports no entity content directly — it resolves the
// template through the registry key, so it stays generic.
//
// Behaviour mirrors the slide menu: background scroll lock, Escape and backdrop
// close, focus moved into the panel and restored to the prior element on close.
// Switching tabs preserves the native recordId (the controller keeps it); the
// content is keyed by template + recordId, so it survives tab switches and
// remounts only for a different record.

import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useAdminStationDrawer } from './AdminStationDrawerContext';
import type { OpenDrawerState } from './AdminStationDrawerContext';
import { resolveDrawerTemplate } from '@/station-manager/registry/drawerTemplates';
import type { DrawerMode } from '@/station-manager/drawerTypes';

export function AdminStationDrawer() {
  const { open, close } = useAdminStationDrawer();
  if (!open) return null;
  // Mounts only while a drawer is open, so the overlay's own effect owns the
  // scroll lock and focus lifecycle cleanly.
  return <DrawerOverlay open={open} onClose={close} />;
}

function DrawerOverlay({ open, onClose }: { open: OpenDrawerState; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);

  // Entity-supplied record footer (a node) and close-guard (a predicate), both
  // owned here so the shell's own chrome (Escape / backdrop / header close) and
  // the content agree on when a close is allowed and what the footer shows. The
  // shell stays entity-agnostic: it renders and consults these without knowing
  // what they mean.
  const [footer, setFooter] = useState<ComponentChildren>(null);
  const closeGuardRef = useRef<(() => boolean) | null>(null);
  const setCloseGuard = useCallback((guard: (() => boolean) | null) => {
    closeGuardRef.current = guard;
  }, []);

  // The single close path: honour the content's guard, then close. When the
  // guard returns false the content has raised its own blocking UI and drives
  // the close itself; the shell does nothing further.
  const requestClose = useCallback(() => {
    const guard = closeGuardRef.current;
    if (guard && !guard()) return;
    onClose();
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const restoreFocusTo = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusTo?.focus?.();
    };
  }, [requestClose]);

  const template = resolveDrawerTemplate(open.drawerTemplateKey);

  return (
    <div class="cz-station-drawer-layer">
      <div class="cz-station-drawer-backdrop" onClick={requestClose} />
      <aside
        ref={panelRef}
        class="cz-station-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={template ? template.title : 'Drawer'}
        tabIndex={-1}
      >
        {template
          ? <ResolvedDrawer open={open} template={template} onClose={requestClose} setFooter={setFooter} setCloseGuard={setCloseGuard} />
          : <UnresolvedDrawer onClose={requestClose} />}
        {/* Entity-supplied record footer. Absent unless content published one, so
            drawers that keep their actions inside the body are unchanged. */}
        {footer && <div class="cz-station-drawer__foot">{footer}</div>}
      </aside>
    </div>
  );
}

function ResolvedDrawer({
  open,
  template,
  onClose,
  setFooter,
  setCloseGuard,
}: {
  open: OpenDrawerState;
  template: NonNullable<ReturnType<typeof resolveDrawerTemplate>>;
  onClose: () => void;
  setFooter: (footer: ComponentChildren) => void;
  setCloseGuard: (guard: (() => boolean) | null) => void;
}) {
  const { setMode, notifySaved } = useAdminStationDrawer();
  const Content = template.content;

  // Clamp the requested mode to one the template supports, so a mode the drawer
  // cannot render never leaves a blank tab.
  const activeMode: DrawerMode = template.supportedModes.includes(open.mode)
    ? open.mode
    : template.supportedModes[0];

  return (
    <>
      <header class="cz-station-drawer__head">
        <h2 class="cz-station-drawer__title">{template.title}</h2>
        <button type="button" class="cz-station-drawer__close" aria-label="Close" onClick={onClose}>×</button>
      </header>

      <div class="cz-station-drawer__body">
        {/* Keyed by template + record so it survives tab switches and remounts
            only for a different record — the numeric identity never resets. */}
        <Content
          key={`${template.key}:${open.recordId}`}
          recordId={open.recordId}
          mode={activeMode}
          onClose={onClose}
          onModeChange={setMode}
          onSaved={notifySaved}
          setFooter={setFooter}
          setCloseGuard={setCloseGuard}
        />
      </div>
    </>
  );
}

// Neutral state for an intent that names no known drawer template — an honest
// dead-end with a way out, never a blank panel or a thrown error.
function UnresolvedDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <header class="cz-station-drawer__head">
        <h2 class="cz-station-drawer__title">Unavailable</h2>
        <button type="button" class="cz-station-drawer__close" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <div class="cz-station-drawer__body">
        <p class="cz-station-empty">This item can’t be opened here yet.</p>
      </div>
    </>
  );
}
