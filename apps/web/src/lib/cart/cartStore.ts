'use client';

import { useSyncExternalStore } from 'react';

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
};

export type CartItemInput = Omit<CartItem, 'quantity'> & { quantity?: number };

type CartState = {
  items: Record<string, CartItem>;
};

type CartStoreState = CartState & {
  addToCart: (item: CartItemInput) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'cart_store_v1';
const listeners = new Set<() => void>();
const EMPTY_STATE: CartState = { items: {} };
let state: CartState = EMPTY_STATE;
let hasHydrated = false;

const isBrowser = () => typeof window !== 'undefined';

const notify = () => {
  listeners.forEach((listener) => listener());
};

const persist = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch {
    // Ignore persistence errors (private mode, storage full, etc).
  }
};

const hydrateOnce = () => {
  if (hasHydrated || !isBrowser()) return;
  hasHydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CartItem>;
    if (parsed && typeof parsed === 'object') {
      state = { items: parsed };
    }
  } catch {
    // Ignore invalid storage data.
  }
};

const setState = (updater: (current: CartState) => CartState) => {
  state = updater(state);
  persist();
  notify();
};

const ensureHydrated = () => {
  if (!hasHydrated) {
    hydrateOnce();
  }
};

const addToCart = (item: CartItemInput) => {
  ensureHydrated();
  const quantity = Math.max(1, item.quantity ?? 1);
  setState((current) => {
    const existing = current.items[item.variantId];
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    return {
      items: {
        ...current.items,
        [item.variantId]: {
          ...existing,
          ...item,
          quantity: nextQuantity,
        },
      },
    };
  });
};

const increment = (variantId: string) => {
  ensureHydrated();
  setState((current) => {
    const existing = current.items[variantId];
    if (!existing) return current;
    return {
      items: {
        ...current.items,
        [variantId]: { ...existing, quantity: existing.quantity + 1 },
      },
    };
  });
};

const decrement = (variantId: string) => {
  ensureHydrated();
  setState((current) => {
    const existing = current.items[variantId];
    if (!existing) return current;
    if (existing.quantity <= 1) {
      const next = { ...current.items };
      delete next[variantId];
      return { items: next };
    }
    return {
      items: {
        ...current.items,
        [variantId]: { ...existing, quantity: existing.quantity - 1 },
      },
    };
  });
};

const setQuantity = (variantId: string, quantity: number) => {
  ensureHydrated();
  const nextQuantity = Math.floor(quantity);
  setState((current) => {
    const existing = current.items[variantId];
    if (!existing) return current;
    if (nextQuantity <= 0) {
      const next = { ...current.items };
      delete next[variantId];
      return { items: next };
    }
    return {
      items: {
        ...current.items,
        [variantId]: { ...existing, quantity: nextQuantity },
      },
    };
  });
};

const removeItem = (variantId: string) => {
  ensureHydrated();
  setState((current) => {
    if (!current.items[variantId]) return current;
    const next = { ...current.items };
    delete next[variantId];
    return { items: next };
  });
};

const clear = () => {
  ensureHydrated();
  setState(() => ({ items: {} }));
};

const actions = {
  addToCart,
  increment,
  decrement,
  setQuantity,
  removeItem,
  clear,
};

const getSnapshot = () => state;

const getServerSnapshot = () => EMPTY_STATE;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!hasHydrated) {
    const prev = state;
    hydrateOnce();
    if (state !== prev) {
      queueMicrotask(notify);
    }
  }
  return () => listeners.delete(listener);
};

export const useCartStore = <T>(selector: (state: CartStoreState) => T) => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return selector({ ...snapshot, ...actions });
};

export type { CartStoreState };
