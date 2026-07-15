// The global Footer carries only platform-level information: build/version,
// environment, and platform identity. Entity-specific actions (Save, Cancel,
// Archive, Publish) belong to the relevant Station or Drawer footer, never
// here.

const BUILD_LABEL = 'v1.0.0';
const ENVIRONMENT_LABEL = 'development';

export function AdminStationFooter() {
  return (
    <footer class="cz-station-footer">
      <span class="cz-station-footer__identity">CompuZign Platform</span>
      <span class="cz-station-footer__meta">
        <span class="cz-station-footer__build">{BUILD_LABEL}</span>
        <span
          class="cz-station-footer__env"
          data-environment={ENVIRONMENT_LABEL}
        >
          {ENVIRONMENT_LABEL}
        </span>
      </span>
    </footer>
  );
}
