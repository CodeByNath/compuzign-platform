const FOCUSED_TIER_KEY = 'compuzign_focused_tier_v1';
const FOCUSED_TIER_TTL_MS = 60 * 60 * 1000; // 60 minutes, matching cartStorage's own TTL

interface FocusedTierPayload {
  version:   1;
  expiresAt: number;
  familyId:  string;
  tierId:    string;
  editionId: string | null;
}

export interface FocusedTierState {
  familyId:  string;
  tierId:    string;
  editionId: string | null;
}

export function saveFocusedTier(state: FocusedTierState): void {
  try {
    const payload: FocusedTierPayload = {
      version:   1,
      expiresAt: Date.now() + FOCUSED_TIER_TTL_MS,
      familyId:  state.familyId,
      tierId:    state.tierId,
      editionId: state.editionId,
    };
    localStorage.setItem(FOCUSED_TIER_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private browsing, storage quota exceeded)
  }
}

export function loadFocusedTier(): FocusedTierState | null {
  try {
    const raw = localStorage.getItem(FOCUSED_TIER_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as FocusedTierPayload;
    if (payload.version !== 1) return null;
    if (Date.now() > payload.expiresAt) {
      localStorage.removeItem(FOCUSED_TIER_KEY);
      return null;
    }
    if (typeof payload.familyId !== 'string' || typeof payload.tierId !== 'string') return null;
    return { familyId: payload.familyId, tierId: payload.tierId, editionId: payload.editionId ?? null };
  } catch {
    return null;
  }
}

export function clearFocusedTier(): void {
  try {
    localStorage.removeItem(FOCUSED_TIER_KEY);
  } catch {
    // localStorage unavailable
  }
}
