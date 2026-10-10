// Account Brand editor — Name, Code, and the Logo/Favicon Media Library
// pickers. Logo/Favicon are real wp.media() attachment pickers (the standard
// WordPress Media Library), never a bespoke upload/decode pipeline — see
// AccountSchema::resolveAttachmentId. wp_enqueue_media() is loaded by
// AdminStationModule::renderShortcode() for this one page.

import { AdminField } from '@/drawer-kit/fields';
import type { AccountBrandPayload } from '../../types';

export interface AccountBrandDraft extends AccountBrandPayload {}

interface Props {
  draft: AccountBrandDraft;
  onChange: (patch: Partial<AccountBrandDraft>) => void;
}

interface WpMediaAttachment {
  id: number;
  url: string;
}

interface WpMediaFrame {
  on(event: string, handler: () => void): void;
  open(): void;
  state(): { get(key: string): { first(): { toJSON(): WpMediaAttachment } } };
}

declare global {
  interface Window {
    wp?: { media?: (options: Record<string, unknown>) => WpMediaFrame };
  }
}

function openMediaPicker(title: string, onSelect: (attachment: WpMediaAttachment) => void): void {
  const media = window.wp?.media;
  if (!media) return;
  const frame = media({ title, library: { type: 'image' }, multiple: false });
  frame.on('select', () => {
    onSelect(frame.state().get('selection').first().toJSON());
  });
  frame.open();
}

function MediaPickerField({ label, attachmentId, onPick, onClear }: {
  label: string;
  attachmentId: number | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div class="cz-tf-field">
      <span class="cz-tf-label">{label}</span>
      <div>
        <span>{attachmentId ? `Attachment #${attachmentId}` : 'Not set'}</span>
        {' '}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onPick}>
          {attachmentId ? 'Replace' : 'Pick'}
        </button>
        {attachmentId !== null && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function AccountBrandEditor({ draft, onChange }: Props) {
  return (
    <div class="cz-tf-form">
      <AdminField
        def={{ id: 'cz-account-brand-name', type: 'text', label: 'Brand Name', hint: 'Up to 60 characters. Optional — blank is valid.' }}
        value={draft.name}
        onChange={(name) => onChange({ name })}
      />

      <AdminField
        def={{ id: 'cz-account-brand-code', type: 'text', label: 'Brand Code', hint: 'Up to 6 uppercase letters (A–Z). Optional — blank is valid.' }}
        value={draft.code}
        onChange={(code) => onChange({ code: code.toUpperCase() })}
      />

      <MediaPickerField
        label="Logo"
        attachmentId={draft.logo_attachment_id}
        onPick={() => openMediaPicker('Select Logo', (a) => onChange({ logo_attachment_id: a.id }))}
        onClear={() => onChange({ logo_attachment_id: null })}
      />

      <MediaPickerField
        label="Favicon"
        attachmentId={draft.favicon_attachment_id}
        onPick={() => openMediaPicker('Select Favicon', (a) => onChange({ favicon_attachment_id: a.id }))}
        onClear={() => onChange({ favicon_attachment_id: null })}
      />
    </div>
  );
}
