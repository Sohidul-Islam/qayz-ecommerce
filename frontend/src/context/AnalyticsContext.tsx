'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export interface TrackEventPayload {
  eventType:
  | 'Page Viewed'
  | 'Product Viewed'
  | 'Product Search'
  | 'Category Viewed'
  | 'Cart Created'
  | 'Add To Cart'
  | 'Remove From Cart'
  | 'Quantity Changed'
  | 'Cart Viewed'
  | 'Cart Abandoned'
  | 'Checkout Started'
  | 'Checkout Completed'
  | 'Purchase Completed'
  | 'Buy Now'
  | 'Wishlist Added'
  | 'Wishlist Removed'
  | 'Product Variant Selected'
  | 'Size Selected'
  | 'Color Selected';
  productId?: number | null;
  variantId?: number | null;
  categoryId?: number | null;
  orderId?: number | null;
  cartId?: number | null;
  searchQuery?: string | null;
  searchResultsCount?: number | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  dwellTimeSeconds?: number | null;
  pagePath?: string;
  metadata?: Record<string, unknown>;
}

interface AnalyticsContextValue {
  visitorId: string;
  sessionToken: string;
  trackEvent: (payload: TrackEventPayload) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

function getOrCreateIds(): { visitorId: string; sessionToken: string } {
  if (typeof window === 'undefined') {
    return { visitorId: '', sessionToken: '' };
  }
  let visitorId = localStorage.getItem('qayz_visitor_id') || '';
  if (!visitorId) {
    visitorId = `vis_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem('qayz_visitor_id', visitorId);
  }
  let sessionToken = sessionStorage.getItem('qayz_session_token') || '';
  if (!sessionToken) {
    sessionToken = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    sessionStorage.setItem('qayz_session_token', sessionToken);
  }
  return { visitorId, sessionToken };
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const idsRef = useRef<{ visitorId: string; sessionToken: string }>({
    visitorId: '',
    sessionToken: '',
  });
  const sessionInitializedRef = useRef(false);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    const ids = getOrCreateIds();
    idsRef.current = ids;

    if (!sessionInitializedRef.current && ids.sessionToken) {
      sessionInitializedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      apiFetch('/analytics/session', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: ids.visitorId,
          sessionToken: ids.sessionToken,
          referrer: document.referrer || '',
          landingPage: pathname + window.location.search,
          utmSource: params.get('utm_source') || '',
          utmMedium: params.get('utm_medium') || '',
          utmCampaign: params.get('utm_campaign') || '',
          utmTerm: params.get('utm_term') || '',
          utmContent: params.get('utm_content') || '',
        }),
      }).catch(() => undefined);
    }

    if (ids.sessionToken) {
      apiFetch('/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: ids.visitorId,
          sessionToken: ids.sessionToken,
          eventType: 'Page Viewed',
          pagePath: pathname,
        }),
      }).catch(() => undefined);
    }
  }, [pathname]);

  const trackEvent = useCallback(async (payload: TrackEventPayload) => {
    const ids = idsRef.current.sessionToken ? idsRef.current : getOrCreateIds();
    idsRef.current = ids;
    try {
      await apiFetch('/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: ids.visitorId,
          sessionToken: ids.sessionToken,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : '/',
          ...payload,
        }),
      });
    } catch {
      // Never block user interaction on analytics error
    }
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        visitorId: idsRef.current.visitorId,
        sessionToken: idsRef.current.sessionToken,
        trackEvent,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}

