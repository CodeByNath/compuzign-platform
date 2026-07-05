import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ReadBlock } from '../ReadBlock';
import type { FooterAction } from '../ActionFooter';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { Skeleton } from '../ui/Skeleton';

// Render modes — one module, two presentations. Data ownership stays with the
// caller; `mode` only gates chrome (status/notes/footer) and content shape.
//   'details'    — the canonical owning workspace view: status pill, notes panel,
//                  Edit / Discard footer, editing-oriented empty states.
//   'connection' — read-only transit view for another workspace's Connections tab:
//                  same icon / title / subtitle as Details; status pill + notes
//                  panel shown when a status/notes are supplied; View-only footer
//                  (no Edit / Discard); optional Includes field.
// Shell + footer come from ReadBlock/ActionFooter (S1b); this file owns only
// the Service Overview content (fields, empty copy, loading shimmer).
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
  // Title / Category / Description are sourced from the authoritative detail; until
  // it resolves, shimmer the values instead of rendering the handoff fallback.
  // Connection mode receives already-resolved data, so it never shimmers.
  const loading = !isConnection && status === 'loading';
  // Details always carries a status; connection shows the pill only when a real
  // status is supplied ('idle' is the read-only no-status default).
  const showStatus = !isConnection || status !== 'idle';
  const headerSubtitle = subtitle ?? 'General information about the service.';

  const actions: FooterAction[] = isConnection
    ? [{ id: 'view', label: 'View', onSelect: onView, disabled: !onView }]
    : [
        ...(hasDraft ? [{ id: 'discard-draft', label: 'Discard Draft', onSelect: onDiscard }] : []),
        { id: 'edit', label: 'Edit', onSelect: onEdit },
      ];

  return (
    <ReadBlock
      title="Service Overview"
      subtitle={headerSubtitle}
      icon={MODULE_ICONS.overview}
      iconVariant="drawerModule__icon--overview"
      scopeClass="drawerOverview service"
      status={showStatus ? status : undefined}
      notes={notes}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel ?? (() => {})}
      actions={actions}
    >
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
            <p class={`drawerModule__value${
              displayContent
                ? ' drawerModule__value--clamp'
                : isConnection
                  ? ''                              // read-only value — not muted just for being a placeholder
                  : ' drawerModule__value--muted'
            }`}>
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
    </ReadBlock>
  );
}
