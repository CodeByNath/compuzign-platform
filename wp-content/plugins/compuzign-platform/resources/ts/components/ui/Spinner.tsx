interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Loading…' }: SpinnerProps) {
  return (
    <div class="cz-spinner" role="status" aria-label={label}>
      <span class="cz-spinner__ring" aria-hidden="true" />
      <span class="cz-muted">{label}</span>
    </div>
  );
}
