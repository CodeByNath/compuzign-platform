// Read-only Service context modules.
//
// Renders the parent Service's Overview / Included Features / Common Questions as
// read-only cards, so a child screen (a tier or package drawer) can show full
// parent context without re-implementing service display or pulling in any edit,
// save, discard, or mutation logic.
//
// Presentation/data-display only. It owns no service data and performs no fetch or
// write — the caller passes already-available display data. Status pills are
// optional: when a module's lifecycle is supplied it renders the canonical
// ModuleStatusPill + ModuleNotificationPanel (read-only); when omitted the card
// renders as plain data. The single-open accordion is local presentation state.

import { useState } from 'preact/hooks';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';

export interface ContextModuleStatus {
  status: string;          // existing 5-state value
  notes:  ModuleNote[];
}

interface ServiceContextPanelProps {
  title:      string;
  category:   string;
  content:    string;      // description
  inclusions: Array<{ id: string; label: string }>;
  faqs:       Array<{ id: string; question: string; answer?: string }>;
  // Optional parent-context lifecycle. Omit to render a module without a pill.
  overviewStatus?:  ContextModuleStatus;
  featuresStatus?:  ContextModuleStatus;
  questionsStatus?: ContextModuleStatus;
}

type PanelKey = 'overview' | 'features' | 'questions';

export function ServiceContextPanel({
  title, category, content, inclusions, faqs,
  overviewStatus, featuresStatus, questionsStatus,
}: ServiceContextPanelProps) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const toggle = (k: PanelKey) => setOpenPanel((p) => (p === k ? null : k));

  const renderStatus = (key: PanelKey, st?: ContextModuleStatus) => {
    if (!st) return null;
    return (
      <div class={`drawerModule__status${st.status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
        <ModuleStatusPill status={st.status} notes={st.notes} onOpen={() => toggle(key)} />
      </div>
    );
  };

  const renderPanel = (key: PanelKey, st?: ContextModuleStatus) =>
    st && openPanel === key && st.notes.length > 0
      ? <ModuleNotificationPanel notes={st.notes} />
      : null;

  return (
    <>
      {/* ── Service Overview (read-only) ─────────────────────────────────────── */}
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
            <p class="drawerModule__subtitle">General information about this service.</p>
          </div>
          {renderStatus('overview', overviewStatus)}
        </div>
        {renderPanel('overview', overviewStatus)}
        <div class="drawerModule__body">
          <div class="drawerModule__fields">
            <div class="drawerModule__field">
              <p class="drawerModule__label">Title</p>
              <p class="drawerModule__value">{title || 'Untitled service'}</p>
            </div>
            <div class="drawerModule__field">
              <p class="drawerModule__label">Category</p>
              <p class="drawerModule__value">{category || 'Not selected'}</p>
            </div>
            <div class="drawerModule__field">
              <p class="drawerModule__label">Description</p>
              <p class={`drawerModule__value${content ? ' drawerModule__value--clamp' : ' drawerModule__value--muted'}`}>
                {content || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Included Features (read-only) ────────────────────────────────────── */}
      <div class="drawerModule">
        <div class="drawerModule__header">
          <span class="drawerModule__icon drawerModule__icon--features">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="drawerModule__icon-svg"
              aria-hidden="true"
              focusable="false"
            >
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          </span>
          <div class="drawerModule__heading">
            <p class="drawerModule__title">
              Included Features
              {inclusions.length > 0 && (
                <span class="drawerModule__count">{inclusions.length}</span>
              )}
            </p>
            <p class="drawerModule__subtitle">Features included in this service.</p>
          </div>
          {renderStatus('features', featuresStatus)}
        </div>
        {renderPanel('features', featuresStatus)}
        <div class="drawerModule__body">
          {inclusions.length > 0 ? (
            <div class="cz-sc-inclusion-pool">
              {inclusions.map((inc) => (
                <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
              ))}
            </div>
          ) : (
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">No features</p>
              <p class="drawerModule__empty-copy">This service has no features yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Common Questions (read-only) ─────────────────────────────────────── */}
      <div class="drawerModule">
        <div class="drawerModule__header">
          <span class="drawerModule__icon drawerModule__icon--faqs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="drawerModule__icon-svg"
              aria-hidden="true"
              focusable="false"
            >
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </span>
          <div class="drawerModule__heading">
            <p class="drawerModule__title">
              Common Questions
              {faqs.length > 0 && (
                <span class="drawerModule__count">{faqs.length}</span>
              )}
            </p>
            <p class="drawerModule__subtitle">Questions and answers for this service.</p>
          </div>
          {renderStatus('questions', questionsStatus)}
        </div>
        {renderPanel('questions', questionsStatus)}
        <div class="drawerModule__body">
          {faqs.length > 0 ? (
            <div class="cz-sc-faq-list">
              {faqs.map((faq) => (
                <div key={faq.id} class="cz-sc-faq-item">
                  <p class="cz-sc-faq-item__q">{faq.question.trim() || 'No Question Added'}</p>
                  <p class="cz-sc-faq-item__a">{faq.answer?.trim() || 'No Answer Added'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">No questions added</p>
              <p class="drawerModule__empty-copy">This service has no common questions yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
