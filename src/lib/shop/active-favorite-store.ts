'use client';

import { create } from 'zustand';

interface ShopActiveFavoriteState {
  productId: string | null;
  isFavorite: boolean;
  setActiveFavorite: (productId: string | null, isFavorite: boolean) => void;
  applyToggledFavorite: (productId: string, isFavorite: boolean) => void;
}

export const useShopActiveFavoriteStore = create<ShopActiveFavoriteState>(
  (set, get) => ({
    productId: null,
    isFavorite: false,
    setActiveFavorite: (productId, isFavorite) => set({ productId, isFavorite }),
    applyToggledFavorite: (productId, isFavorite) => {
      const cur = get();
      if (cur.productId === productId) {
        set({ isFavorite });
      }
    },
  }),
);
