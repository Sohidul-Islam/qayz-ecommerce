export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  priceOverride: number | null;
  isActive: boolean;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  soldQuantity: number;
  lowStockThreshold: number;
  unitPrice: number;
  finalPrice: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  basePrice: number;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  finalPrice: number;
  discountAmountPerUnit: number;
  fabric: string;
  fit: string;
  careInstructions: string;
  craftDetails: string;
  tags: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  isArchived: boolean;
  seoTitle: string;
  seoDescription: string;
  primaryImage: string;
  images: ProductImage[];
  variants: ProductVariant[];
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  totalAvailableStock: number;
  inStock: boolean;
  totalSold: number;
  createdAt: string;
  relatedProducts?: Product[];
  recommendedProducts?: Product[];
}

export interface CartItem {
  id: number;
  productId: number;
  variantId: number;
  productName: string;
  productSlug: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  imageUrl: string;
  unitPrice: number;
  discountPerUnit: number;
  finalUnitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
}

export interface CartData {
  cartId: number;
  sessionToken: string;
  couponCode: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  total: number;
}

export interface DeliveryZone {
  id: number;
  name: string;
  slug: string;
  charge: number;
  freeShippingThreshold: number | null;
  estimatedDays: string;
  isActive: boolean;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  city: string;
  area: string;
  postalCode: string;
  deliveryInstructions: string;
  deliveryZoneId: number | null;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  deliveryStatus: string;
  internalNotes?: string;
  trafficSource: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    productId: number;
    variantId: number;
    productName: string;
    productSlug: string | null;
    variantSku: string;
    variantColor: string;
    variantSize: string;
    unitPrice: number;
    discountPerUnit: number;
    finalUnitPrice: number;
    quantity: number;
    lineTotal: number;
    imageUrl: string | null;
  }>;
  history: Array<{
    id: number;
    previousStatus: string | null;
    newStatus: string;
    statusType: string;
    note: string;
    changedByName: string;
    createdAt: string;
  }>;
  delivery: {
    id: number;
    courierPartner: string;
    trackingNumber: string;
    deliveryCharge: number;
    deliveryStatus: string;
    estimatedDeliveryDate: string;
    actualDeliveryDate: string;
    deliveryNotes: string;
  } | null;
  payment: {
    id: number;
    provider: string;
    method: string;
    amount: number;
    status: string;
    transactionRef: string | null;
  } | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleSlug: string;
  roleName: string;
  permissions: string[];
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return `${process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'}/api`;
}

export function getStoredCartToken(): string {
  if (typeof window === 'undefined') return '';
  let tok = localStorage.getItem('qayz_cart_token') || '';
  if (!tok) {
    tok = `cart_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem('qayz_cart_token', tok);
  }
  return tok;
}

export function getStoredAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('qayz_admin_token') || '';
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { isAdmin?: boolean } = {}
): Promise<T> {
  const { isAdmin, headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders || {});

  if (!(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined') {
    headers.set('X-Cart-Token', getStoredCartToken());
    if (isAdmin) {
      const token = getStoredAdminToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const message = payload?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = payload?.error?.code;
    throw err;
  }

  return payload.data !== undefined ? payload : payload;
}

export async function fetchProducts(params: Record<string, string | number | boolean | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') {
      search.set(k, String(v));
    }
  });
  const qs = search.toString();
  return apiFetch<{
    success: boolean;
    data: Product[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    facets: { sizes: string[]; colors: Array<{ name: string; hex: string }> };
  }>(`/products${qs ? `?${qs}` : ''}`);
}

export async function fetchProductDetail(idOrSlug: string) {
  const res = await apiFetch<{ success: boolean; data: Product }>(`/products/${idOrSlug}`);
  return res.data;
}

export async function fetchCategories(includeInactive = false) {
  const res = await apiFetch<{ success: boolean; data: Category[] }>(
    `/categories${includeInactive ? '?includeInactive=true' : ''}`
  );
  return res.data;
}

export async function fetchDeliveryZones() {
  const res = await apiFetch<{ success: boolean; data: DeliveryZone[] }>('/delivery-zones');
  return res.data;
}
