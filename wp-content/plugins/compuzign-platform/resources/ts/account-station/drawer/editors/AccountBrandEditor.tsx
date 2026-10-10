// Account Brand editor — Name, Code, and the Logo/Favicon pickers. Logo and
// Favicon are uploaded through this one platform-owned picker: a hidden file
// input immediately uploads through uploadAccountBrandMedia() and previews
// the real returned image — never the WordPress Media Library admin dialog
// (wp.media()). WordPress still owns storage/metadata underneath, through
// AccountController::uploadBrandMedia()'s use of media_handle_upload(); see
// AccountSchema::resolveAttachmentId for the Save-time validation this
// deliberately leaves unchanged.

import { useRef, useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import { uploadAccountBrandMedia } from '../../api';
import type { AccountBrandPayload } from '../../types';

export interface AccountBrandDraft extends AccountBrandPayload {
  logo_url: string | null;
  favicon_url: string | null;
}

interface Props {
  draft: AccountBrandDraft;
  onChange: (patch: Partial<AccountBrandDraft>) => void;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface MediaPickerFieldProps {
  label: string;
  attachmentId: number | null;
  url: string | null;
  onUploaded: (id: number, url: string) => void;
  onClear: () => void;
}

function MediaPickerField({ label, attachmentId, url, onUploaded, onClear }: MediaPickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError('Must be a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    setError(null);
    setUploading(true);
    uploadAccountBrandMedia(file)
      .then((response) => {
        if (!response.success) throw new Error('Could not upload the image.');
        onUploaded(response.id, response.url);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not upload the image.');
      })
      .finally(() => setUploading(false));
  };

  return (
    <div class="cz-tf-field">
      <span class="cz-tf-label">{label}</span>
      <div>
        {url ? (
          <img
            src={url}
            alt={label}
            style={{ display: 'block', width: '64px', height: '64px', objectFit: 'contain', marginBottom: '6px' }}
          />
        ) : (
          <span>Not set</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) pickFile(file);
            target.value = '';
          }}
        />
        {' '}
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : attachmentId ? 'Replace' : 'Pick'}
        </button>
        {attachmentId !== null && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={uploading} onClick={onClear}>
            Clear
          </button>
        )}
        {error && <div class="cz-tf-hint" role="alert">{error}</div>}
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
        url={draft.logo_url}
        onUploaded={(id, url) => onChange({ logo_attachment_id: id, logo_url: url })}
        onClear={() => onChange({ logo_attachment_id: null, logo_url: null })}
      />

      <MediaPickerField
        label="Favicon"
        attachmentId={draft.favicon_attachment_id}
        url={draft.favicon_url}
        onUploaded={(id, url) => onChange({ favicon_attachment_id: id, favicon_url: url })}
        onClear={() => onChange({ favicon_attachment_id: null, favicon_url: null })}
      />
    </div>
  );
}
