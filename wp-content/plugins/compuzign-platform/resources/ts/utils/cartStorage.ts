import type { QuoteItem } from '@/components/cost-builder/types';

const CART_KEY    = 'compuzign_quote_cart_v1';
const CART_TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CartPayload {
  version:   1;
  expiresAt: number;
  updatedAt: number;
  items:     QuoteItem[];
}

export function saveCart(items: QuoteItem[]): void {
  try {
    const payload: CartPayload = {
      version:   1,
      expiresAt: Date.now() + CART_TTL_MS,
      updatedAt: Date.now(),
      items,
    };
    localStorage.setItem(CART_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private browsing, storage quota exceeded)
  }
}

export function loadCart(): QuoteItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw) as CartPayload;
    if (payload.version !== 1) return [];
    if (Date.now() > payload.expiresAt) {
      localStorage.removeItem(CART_KEY);
      return [];
    }
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // localStorage unavailable
  }
}
