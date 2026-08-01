// Service drawer confirm + exit dialogs — pure presentation over the controller.
//
// Publish/settle, discard-draft, the unsaved-changes and pending-modules exit
// prompts, and the new-never-published draft prompt. Each reads controller state
// and calls a controller handler; none owns business logic or calls an API.

import type { ServiceDrawerController } from './useServiceDrawerController';

export function ServiceDrawerDialogs({ c }: { c: ServiceDrawerController }) {
  const serviceTitle = c.displayTitle || 'this service';
  const loading = c.station.loading.status;
  const isNew = c.station.isNew;

  return (
    <>
      {/* ── Publish / Settle confirmation ──────────────────────────────────── */}
      {c.showPublishModal && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setShowPublishModal(false); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {isNew ? `Save Overview before publishing ${serviceTitle}` : c.isActive ? `Settle changes to ${serviceTitle}?` : `Ready to publish ${serviceTitle}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {isNew
                  ? 'Save a complete Overview to create the Pending Service record before publishing.'
                  : c.isActive
                  ? 'This confirms the current live content as the settled state for each module.'
                  : 'You are about to publish this service and make it visible in the catalog.'}
              </p>
              {!isNew && (
                <ul class="cz-publish-confirm__summary">
                  <li><strong>Service Overview:</strong> Ready</li>
                  <li style={c.inclSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                    <strong>Included Features:</strong> {c.inclSummary.text}
                  </li>
                  <li style={c.faqsSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                    <strong>Common Questions:</strong> {c.faqsSummary.text}
                  </li>
                </ul>
              )}
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setShowPublishModal(false)} disabled={loading}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleConfirmPublish} disabled={loading}>
                {loading ? '…' : isNew ? 'Save Overview' : c.isActive ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard draft confirmation ─────────────────────────────────────── */}
      {c.discardConfirm && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setDiscardConfirm(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Discard draft?</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This will remove the saved draft and return this module to its last settled version.
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setDiscardConfirm(null)}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={c.handleConfirmDiscard}>
                Discard Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved-changes exit ───────────────────────────────────────────── */}
      {c.exitDialog === 'unsaved' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setExitDialog(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Unsaved changes</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                You have unsaved changes in <strong>{c.editingSectionLabel}</strong>. Closing will discard them.
              </p>
              {c.saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-2)">{c.saveErr}</p>}
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={c.handleExitDiscard} disabled={c.exitSaving}>
                Discard and close
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleExitSaveAndProceed} disabled={c.exitSaving}>
                {c.exitSaving ? 'Saving…' : 'Save now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending-modules exit ───────────────────────────────────────────── */}
      {c.exitDialog === 'pending' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setExitDialog(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Unsettled modules</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">The following modules have live changes that have not been settled:</p>
              <ul class="cz-publish-confirm__summary">
                {c.pendingModuleNames.map((name) => (
                  <li key={name}><strong>{name}</strong> — Pending</li>
                ))}
              </ul>
              <p style="margin-top:var(--cz-space-3);font-size:var(--admin-fs-s-label);color:var(--admin-text-muted)">
                Changes are saved as a draft and not yet live. Settle now to publish them, or close and return later.
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={c.handleExitCloseWithoutSettling} disabled={c.exitSaving}>
                Close without settling
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleExitSettle} disabled={c.exitSaving}>
                {c.exitSaving ? 'Settling…' : 'Settle Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New never-published exit prompt ────────────────────────────────── */}
      {c.exitDialog === 'new-service-draft' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setExitDialog(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Before you leave</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">Select the fields you want to keep in your draft.</p>
              <div style="display:flex;flex-direction:column;gap:var(--cz-space-3);margin-top:var(--cz-space-3)">
                {[
                  { key: 'title',       label: 'Title',       value: c.stationOverviewDraft?.title || '(empty)'        },
                  { key: 'category',    label: 'Category',    value: c.displayCategory || 'Not selected'               },
                  { key: 'description', label: 'Description', value: c.stationOverviewDraft?.content ? '…' : '(empty)' },
                ].map(({ key, label, value }) => (
                  <label key={key} class="cz-tf-field__inline" style="cursor:pointer">
                    <input
                      type="checkbox"
                      class="cz-tf-checkbox"
                      checked={(c.newSvcFields as Record<string, boolean>)[key]}
                      onChange={(e) => c.setNewSvcFields((prev) => ({ ...prev, [key]: (e.target as HTMLInputElement).checked }))}
                    />
                    <span>
                      <strong style="font-size:var(--admin-fs-label)">{label}</strong>
                      <span style="margin-left:var(--cz-space-2);font-size:var(--admin-fs-s-label);color:var(--admin-text-faint)">{value}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setExitDialog(null)} disabled={c.exitSaving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={c.handleNewSvcTrash} disabled={c.exitSaving}>
                Move to Trash
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary"
                onClick={c.handleNewSvcSaveDraft}
                disabled={c.exitSaving || (!c.newSvcFields.title && !c.newSvcFields.category && !c.newSvcFields.description)}
              >
                {c.exitSaving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
