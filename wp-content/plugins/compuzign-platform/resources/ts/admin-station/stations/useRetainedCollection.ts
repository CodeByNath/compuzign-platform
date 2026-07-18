// Retain a loaded collection through a revalidation.
//
// Why this exists. The shared `useApi` resets to `{ data: null, loading: true }`
// at the start of every fetch, including a `refetch()`. That is correct for a
// first load, but wrong for a refresh triggered by a drawer save: the wall the
// user is looking at would blank to "Loading…" and repopulate — a reload of the
// whole surface to show one changed card.
//
// So a data source wraps its projection in this hook. While a RELOAD is in
// flight over a wall that already has content, the last loaded collection stays
// on screen and `loading` reads false; when the response lands, the fresh items
// swap in place. A first load is untouched — no previous collection exists, so
// the real loading state shows.
//
// This is the "stale-while-revalidate" behaviour, kept local to the Admin
// Station's data sources rather than changed inside `useApi`, which the old tree
// also uses and whose reset-on-refetch other callers may rely on.

import { useRef } from 'preact/hooks';

export interface RetainedCollection<Item> {
  items:   Item[];
  loading: boolean;
}

export function useRetainedCollection<Item>(items: Item[], loading: boolean): RetainedCollection<Item> {
  // Cache-during-render: deterministic, derived only from this render's inputs,
  // and never read before it is written in the same pass.
  const lastLoaded = useRef<Item[] | null>(null);

  if (!loading) {
    lastLoaded.current = items;
    return { items, loading };
  }

  // Reloading over content that is already on screen — keep it and hide the
  // loading state so the refresh is a swap, not a blank.
  if (lastLoaded.current !== null) {
    return { items: lastLoaded.current, loading: false };
  }

  // First load: nothing to retain, so report the truth.
  return { items, loading };
}
