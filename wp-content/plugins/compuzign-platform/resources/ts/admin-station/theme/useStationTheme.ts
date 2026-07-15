// Admin Station theme state.
//
// Theme appearance is entirely token-driven: this hook only tracks which theme
// is active and writes it to `data-station-theme` on the Admin Station root (in
// AdminStation.tsx). All colours live in scoped CSS custom properties, never in
// components.
//
// The selection persists locally using the repository's safe local-preference
// pattern (try/catch-guarded localStorage, mirroring utils/cartStorage.ts), so
// private-browsing or quota failures degrade to session-only silently.

import { useState, useCallback } from 'preact/hooks';

export type StationTheme = 'light' | 'dark';

const STORAGE_KEY = 'cz-station-theme';
const DEFAULT_THEME: StationTheme = 'dark';

function readStoredTheme(): StationTheme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // localStorage unavailable (private browsing, quota) — fall back to default.
    return null;
  }
}

function writeStoredTheme(theme: StationTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Persistence unavailable — keep the choice for this session only.
  }
}

export interface StationThemeApi {
  theme: StationTheme;
  toggleTheme: () => void;
}

export function useStationTheme(): StationThemeApi {
  const [theme, setTheme] = useState<StationTheme>(() => readStoredTheme() ?? DEFAULT_THEME);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: StationTheme = current === 'dark' ? 'light' : 'dark';
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
