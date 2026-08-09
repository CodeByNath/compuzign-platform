// Edition Bin — a compact admin table (Edition lifecycle/Bin UX cleanup),
// replacing the former ad hoc inline-styled <ul> that used to live inside
// TierEditionDeclarationSwitcher. Pure presentation over the controller,
// mirroring the occupant-owned bin's own TierBinList.tsx convention: every
// lifecycle call lives in useTierEditions (ctl), this component only
// renders rows and wires icon-only row actions to it. No new store, no new
// bin, no change to moveToBin/restoreFromBin/trashBinEntry/deleteBinEntry,
// tier_edition_bin[] storage, or ordering.
//
// Columns: Title | Platform ID (CZTE) | Status | Actions. Status reuses the
// SAME TravelStatusPill (drawer-kit/ui) every other bin surface in this
// codebase already renders through — never a second status vocabulary.
// Actions are icon-only (TrashIcon/RestoreIcon, admin-station/shell/icons)
// with an explicit tooltip/aria-label naming the real operation, since the
// SAME trash-shaped icon maps to a DIFFERENT backend call depending on the
// row's own status — see the exact matrix in this file's own comments
// below and the audit's own §5/§8:
//
//   Archived bin entry -> trash icon  = Move to Trash  (trashBinEntry)
//   Trashed  bin entry -> trash icon  = Delete permanently (deleteBinEntry)
//   Either status       -> restore icon = Restore Edition (restoreFromBin)

import { RestoreIcon, TrashIcon } from '@/admin-station/shell/icons';
import { TravelStatusPill } from '@/drawer-kit/ui/TravelStatusPill';
import type { TierEditionsController } from '../../surface/tierSurface/useTierEditions';

export function TierEditionBinList({ ctl }: { ctl: TierEditionsController }) {
  if (ctl.editionBin.length === 0) {
    return (
      <div class="cz-admin-empty" style="margin-top: var(--cz-space-2)">
        <p>The Edition Bin is empty.</p>
      </div>
    );
  }

  return (
    <div class="cz-tier-edition-bin-table-wrap" style="margin-top: var(--cz-space-2)">
      <table class="cz-tier-edition-bin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Platform ID</th>
            <th>Status</th>
            <th class="cz-tier-edition-bin-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ctl.editionBin.map((entry) => {
            const name = entry.edition.title.trim() || '(untitled)';
            // The destructive icon's real operation depends on the row's
            // own status — an Archived row's trash icon moves it to
            // Trashed (still reversible via Restore); a Trashed row's
            // identical-looking trash icon instead permanently deletes it.
            // Never guessed: this mirrors the exact operations
            // PackageSchema::trashTierEditionBinEntry/deleteTierEditionBinEntry
            // already gate by StationLifecycle (see tests/tier-edition-bin.php).
            const destructive = entry.status === 'archived'
              ? { label: 'Move to Trash', onSelect: () => ctl.trashBinEntry(entry.bin_id) }
              : { label: 'Delete permanently', onSelect: () => ctl.deleteBinEntry(entry.bin_id) };
            return (
              <tr key={entry.bin_id}>
                <td class="cz-sp-tier-table__name">{name}</td>
                <td class="cz-tier-edition-bin-table__platform-id">{entry.edition.edition_platform_id || '—'}</td>
                <td><TravelStatusPill status={entry.status} /></td>
                <td>
                  <div class="cz-tier-edition-bin-table__actions">
                    <button
                      type="button"
                      class="cz-station-iconbtn cz-tier-edition-bin-table__icon-btn cz-tier-edition-bin-table__icon-btn--danger"
                      disabled={ctl.saving}
                      aria-label={`${destructive.label} — ${name}`}
                      title={destructive.label}
                      onClick={destructive.onSelect}
                    >
                      <TrashIcon />
                    </button>
                    <button
                      type="button"
                      class="cz-station-iconbtn cz-tier-edition-bin-table__icon-btn"
                      disabled={ctl.saving}
                      aria-label={`Restore Edition — ${name}`}
                      title="Restore Edition"
                      onClick={() => ctl.restoreFromBin(entry.bin_id)}
                    >
                      <RestoreIcon />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
