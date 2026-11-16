'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type DesignVariant = '1' | '2' | '3';

interface DesignContextValue {
  design: DesignVariant;
  setDesign: (d: DesignVariant) => void;
  wishlistIds: number[];
  toggleWishlist: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
}

const DesignContext = createContext<DesignContextValue | null>(null);

export const DESIGN_META: Record<
  DesignVariant,
  { id: DesignVariant; name: string; label: string; tagline: string }
> = {
  '1': {
    id: '1',
    name: 'Luxury Minimal',
    label: 'Design 1 · Luxury Minimal',
    tagline: 'Editorial Fashion House · Quiet Luxury',
  },
  '2': {
    id: '2',
    name: 'Modern Premium',
    label: 'Design 2 · Modern Premium',
    tagline: 'High-Contrast Contemporary · Effortless Commerce',
  },
  '3': {
    id: '3',
    name: 'Traditional + Premium',
    label: 'Design 3 · Traditional + Premium',
    tagline: 'South Asian Craft Heritage · Oxblood & Zari Gold',
  },
};

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [design, setDesignState] = useState<DesignVariant>('1');
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qDesign = params.get('design');
      if (qDesign === '1' || qDesign === '2' || qDesign === '3') {
        setDesignState(qDesign);
        localStorage.setItem('qayz_design_sample', qDesign);
      } else {
        const saved = localStorage.getItem('qayz_design_sample');
        if (saved === '1' || saved === '2' || saved === '3') {
          setDesignState(saved);
        }
      }

      const savedWish = localStorage.getItem('qayz_wishlist');
      if (savedWish) {
        const parsed = JSON.parse(savedWish);
        if (Array.isArray(parsed)) setWishlistIds(parsed);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setDesign = useCallback((next: DesignVariant) => {
    setDesignState(next);
    try {
      localStorage.setItem('qayz_design_sample', next);
      const url = new URL(window.location.href);
      url.searchParams.set('design', next);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  }, []);

  const toggleWishlist = useCallback((productId: number) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem('qayz_wishlist', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  return (
    <DesignContext.Provider
      value={{ design, setDesign, wishlistIds, toggleWishlist, isWishlisted }}
    >
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used within DesignProvider');
  return ctx;
}

