import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';
import { Skeleton } from '../ui/Skeleton';

// Render modes — one module, two presentations. Data ownership stays with the
// caller; `mode` only gates chrome (status/notes/footer) and content shape.
//   'details'    — the canonical owning workspace view: status pill, notes panel,
//                  Edit / Discard footer, editing-oriented empty states.
//   'connection' — read-only transit view for another workspace's Connections tab:
//                  no status pill, no notes, View-only footer, configurable
//                  subtitle, optional Includes field.
type ServiceOverviewMode = 'details' | 'connection';

interface ServiceOverviewViewCardProps {
  mode?:           ServiceOverviewMode;
  displayTitle:    string;
  // Short Description (excerpt) is temporarily disabled and hidden from workflow.
  // The prop is retained so the call site requires no change; the field is not rendered.
  displayExcerpt?: string;
  displayContent:  string;
  displayCategory: string;
  // Header subtitle. Defaults to the canonical Details wording; connection callers
  // pass their own ("The service this package belongs to.", etc.).
  subtitle?:       string;
  // ── Details-mode lifecycle (owned by the service workspace) ──
  status?:         string;
  notes?:          ModuleNote[];
  panelOpen?:      boolean;
  onTogglePanel?:  () => void;
  hasDraft?:       boolean;
  onEdit?:         () => void;
  onDiscard?:      () => void;
  // ── Connection-mode extras ──
  // Optional "N features | N common questions" summary line.
  includesLabel?:  string;
  // Read-only View action; button is disabled when absent.
  onView?:         () => void;
}

export function ServiceOverviewViewCard({
  mode = 'details',
  displayTitle,
  displayContent,
  displayCategory,
  subtitle,
  status = 'idle',
  notes = [],
  panelOpen = false,
  onTogglePanel,
  hasDraft = false,
  onEdit,
  onDiscard,
  includesLabel,
  onView,
}: ServiceOverviewViewCardProps) {
  const isConnection = mode === 'connection';
  const statusDimmed = status === 'pending-dim';
  // Title / Category / Description are sourced from the authoritative detail; until
  // it resolves, shimmer the values instead of rendering the handoff fallback.
  // Connection mode receives already-resolved data, so it never shimmers.
  const loading = !isConnection && status === 'loading';
  const headerSubtitle = subtitle ?? 'General information about the service.';

  return (
    <div class="drawerModule drawerOverview service">
      <div class="drawerModule__header">
        <span class="drawerModule__icon drawerModule__icon--overview">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="drawerModule__icon-svg"
            aria-hidden="true"
            focusable="false"
          >
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        </span>
        <div class="drawerModule__heading">
          <p class="drawerModule__title">Service Overview</p>
          <p class="drawerModule__subtitle">{headerSubtitle}</p>
        </div>
        {!isConnection && (
          <div class={`drawerModule__status${statusDimmed ? ' drawerModule__status--dim' : ''}`}>
            <ModuleStatusPill status={status} notes={notes} onOpen={onTogglePanel ?? (() => {})} />
          </div>
        )}
      </div>

      {!isConnection && panelOpen && notes.length > 0 && (
        <ModuleNotificationPanel notes={notes} />
      )}

      <div class="drawerModule__body">
        <div class="drawerModule__fields">
          <div class="drawerModule__field">
            <p class="drawerModule__label">Title</p>
            {loading ? (
              <p class="drawerModule__value"><Skeleton width="55%" /></p>
            ) : (
              <p class="drawerModule__value">
                {displayTitle || 'New Service'}
              </p>
            )}
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Category</p>
            {loading ? (
              <p class="drawerModule__value"><Skeleton width="40%" /></p>
            ) : (
              <p class="drawerModule__value">{displayCategory}</p>
            )}
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Description</p>
            {loading ? (
              <p class="drawerModule__value">
                <Skeleton width="100%" />
                <Skeleton width="80%" />
              </p>
            ) : (
              <p class={`drawerModule__value${displayContent ? ' drawerModule__value--clamp' : ' drawerModule__value--muted'}`}>
                {displayContent
                  ? displayContent
                  : isConnection
                    ? 'No description provided.'
                    : displayTitle
                      ? `Enter a description for the ${displayTitle}.`
                      : 'Enter a description for the service.'
                }
              </p>
            )}
          </div>
          {isConnection && includesLabel && (
            <div class="drawerModule__field">
              <p class="drawerModule__label">Includes</p>
              <p class="drawerModule__value">{includesLabel}</p>
            </div>
          )}
        </div>
      </div>

      <div class="drawerModule__footer">
        {isConnection ? (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
            onClick={() => onView?.()}
            disabled={!onView}
          >
            View
          </button>
        ) : (
          <>
            {hasDraft && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onDiscard}>
                Discard Draft
              </button>
            )}
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onEdit}>
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
