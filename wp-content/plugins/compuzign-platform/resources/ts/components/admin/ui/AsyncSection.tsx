// Shared async gate blocks (Schema architecture S1c).
//
// The loading spinner and error+retry blocks previously copy-pasted across
// every station and drawer step. Kept as two early-return blocks (not a
// children wrapper) so call sites keep their `if (loading) return …` control
// flow and never evaluate data-dependent JSX before the data exists.

import { Spinner } from '@/components/ui/Spinner';

export function AsyncLoading({ label }: { label: string }) {
  return (
    <div class="cz-admin-loading">
      <Spinner label={label} />
    </div>
  );
}

export function AsyncError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div>
      <div class="cz-admin-error-msg">{error}</div>
      <button
        type="button"
        class="cz-admin-btn cz-admin-btn--secondary"
        style="margin-top:12px"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
