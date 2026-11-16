'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, CartData } from '@/lib/api';
import { useAnalytics } from './AnalyticsContext';

interface CartContextValue {
  cart: CartData | null;
  loading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: number, quantity?: number, openOnSuccess?: boolean) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { sessionToken, visitorId } = useAnalytics();

  const refreshCart = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: CartData }>('/cart');
      setCart(res.data);
    } catch {
      // Ignore initial load error
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addToCart = useCallback(
    async (variantId: number, quantity = 1, openOnSuccess = true) => {
      setLoading(true);
      try {
        const res = await apiFetch<{ success: boolean; data: CartData }>('/cart/items', {
          method: 'POST',
          body: JSON.stringify({
            variantId,
            quantity,
            analyticsSessionToken: sessionToken,
            visitorId,
          }),
        });
        setCart(res.data);
        if (openOnSuccess) setIsDrawerOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [sessionToken, visitorId]
  );

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: CartData }>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: CartData }>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: CartData }>('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCart(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        applyCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
