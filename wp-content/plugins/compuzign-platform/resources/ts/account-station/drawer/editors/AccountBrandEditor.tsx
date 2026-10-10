// Account Brand editor — Name, Code, and the Logo/Favicon pickers. Each image
// field is a platform-owned picker inside this one editor (no WordPress Media
// Library dialog, no nested drawer): "Upload new" sends a file to Account
// Station's own storage and selects the result; "Choose existing" opens an
// inline list of images Account Station already stores. Clear empties the
// field and keeps the stored file for reuse. The reference only persists via
// an ordinary Save — see AccountController::uploadBrandMedia().
//
// A Brand saved before Account owned its media may still carry a legacy
// WordPress attachment id: it keeps previewing (read-only compatibility) until
// an Account image replaces it or it is Cleared.

import { useRef, useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import { fetchAccountMediaLibrary, uploadAccountBrandMedia } from '../../api';
import type { AccountBrandPayload, AccountMediaItem } from '../../types';

export interface AccountBrandDraft extends AccountBrandPayload {
  logo_url: string | null;
  favicon_url: string | null;
}

interface Props {
  draft: AccountBrandDraft;
  onChange: (patch: Partial<AccountBrandDraft>) => void;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** The one library of already-stored images, shared by both fields and fetched on first use. */
interface Library {
  items: AccountMediaItem[] | null;
  loading: boolean;
  error: string | null;
  load: () => void;
  add: (item: AccountMediaItem) => void;
}

function useLibrary(): Library {
  const [items, setItems] = useState<AccountMediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (items !== null || loading) return;
    setLoading(true);
    setError(null);
    fetchAccountMediaLibrary()
      .then((response) => {
        if (!response.success) throw new Error('Could not load your images.');
        setItems(response.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your images.'))
      .finally(() => setLoading(false));
  };

  // A fresh upload joins the list at the top, replacing any same-id entry (identical bytes re-uploaded).
  const add = (item: AccountMediaItem) =>
    setItems((current) => (current === null ? current : [item, ...current.filter((existing) => existing.id !== item.id)]));

  return { items, loading, error, load, add };
}

interface MediaPickerFieldProps {
  label: string;
  mediaId: string | null;
  legacyAttachmentId: number | null;
  url: string | null;
  library: Library;
  onSelect: (item: AccountMediaItem) => void;
  onClear: () => void;
}

function MediaPickerField({ label, mediaId, legacyAttachmentId, url, library, onSelect, onClear }: MediaPickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const hasValue = mediaId !== null || legacyAttachmentId !== null;

  const uploadFile = (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError('Must be a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    setError(null);
    setUploading(true);
    uploadAccountBrandMedia(file)
      .then((response) => {
        if (!response.success) throw new Error('Could not upload the image.');
        library.add(response.item);
        setBrowsing(false);
        onSelect(response.item);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not upload the image.'))
      .finally(() => setUploading(false));
  };

  const toggleBrowsing = () => {
    if (!browsing) library.load();
    setBrowsing(!browsing);
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
        {legacyAttachmentId !== null && mediaId === null && (
          <div class="cz-tf-hint">
            Saved before Account stored its own images. Upload or choose an image to replace it.
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) uploadFile(file);
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
          {uploading ? 'Uploading…' : 'Upload new'}
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          aria-expanded={browsing}
          disabled={uploading}
          onClick={toggleBrowsing}
        >
          Choose existing
        </button>
        {hasValue && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={uploading} onClick={onClear}>
            Clear
          </button>
        )}
        {error && <div class="cz-tf-hint" role="alert">{error}</div>}
        {browsing && (
          <div
            role="group"
            aria-label={`${label} images`}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              // Closes this list only — never the surrounding drawer.
              e.stopPropagation();
              setBrowsing(false);
            }}
          >
            {library.loading && <span>Loading…</span>}
            {library.error && <span class="cz-tf-hint" role="alert">{library.error}</span>}
            {library.items !== null && library.items.length === 0 && <span>No images uploaded yet.</span>}
            {library.items?.map((item) => (
              <button
                key={item.id}
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary"
                aria-pressed={item.id === mediaId}
                title={item.name}
                onClick={() => {
                  setBrowsing(false);
                  onSelect(item);
                }}
              >
                <img
                  src={item.url}
                  alt={item.name || 'Image'}
                  style={{ display: 'block', width: '48px', height: '48px', objectFit: 'contain' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountBrandEditor({ draft, onChange }: Props) {
  const library = useLibrary();

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
        mediaId={draft.logo_media_id}
        legacyAttachmentId={draft.logo_attachment_id}
        url={draft.logo_url}
        library={library}
        onSelect={(item) => onChange({ logo_media_id: item.id, logo_attachment_id: null, logo_url: item.url })}
        onClear={() => onChange({ logo_media_id: null, logo_attachment_id: null, logo_url: null })}
      />

      <MediaPickerField
        label="Favicon"
        mediaId={draft.favicon_media_id}
        legacyAttachmentId={draft.favicon_attachment_id}
        url={draft.favicon_url}
        library={library}
        onSelect={(item) => onChange({ favicon_media_id: item.id, favicon_attachment_id: null, favicon_url: item.url })}
        onClear={() => onChange({ favicon_media_id: null, favicon_attachment_id: null, favicon_url: null })}
      />
    </div>
  );
}
