'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
  Truck,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Product, fetchProductDetail } from '@/lib/api';
import { formatBDT } from '@/lib/utils';
import { useDesign } from '@/context/DesignContext';
import { useCart } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { ProductCard } from '@/components/product/ProductCard';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = String(params.slug);
  const router = useRouter();
  const { design, isWishlisted, toggleWishlist } = useDesign();
  const { addToCart } = useCart();
  const { trackEvent } = useAnalytics();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const viewStartRef = useRef<number>(Date.now());
  const trackedRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchProductDetail(slug)
      .then((data) => {
        setProduct(data);
        setActiveImage(0);
        const firstInStock = data.variants.find((v) => v.availableStock > 0) || data.variants[0];
        if (firstInStock) {
          setSelectedColor(firstInStock.color);
          setSelectedSize(firstInStock.size);
        }
        viewStartRef.current = Date.now();
        if (trackedRef.current !== data.id) {
          trackedRef.current = data.id;
          trackEvent({
            eventType: 'Product Viewed',
            productId: data.id,
            categoryId: data.categoryId,
            pagePath: `/products/${data.slug}`,
          });
        }
      })
      .catch((err) => setError((err as Error).message || 'Product not found'))
      .finally(() => setLoading(false));
  }, [slug, trackEvent]);

  // Track time spent on product upon unmount / slug change
  useEffect(() => {
    return () => {
      if (trackedRef.current) {
        const dwell = Math.max(1, Math.round((Date.now() - viewStartRef.current) / 1000));
        trackEvent({
          eventType: 'Product Viewed',
          productId: trackedRef.current,
          dwellTimeSeconds: dwell,
          pagePath: `/products/${slug}`,
          metadata: { type: 'dwell_exit' },
        });
      }
    };
  }, [slug, trackEvent]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl">Punjabi Not Found</h1>
        <p className="text-neutral-600">{error || 'This item may have been archived.'}</p>
        <Link
          href="/products"
          className="inline-block px-7 py-3 bg-neutral-900 text-white text-xs uppercase tracking-widest"
        >
          Return to Collection
        </Link>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.color === selectedColor && v.size === selectedSize) ||
    product.variants.find((v) => v.color === selectedColor) ||
    product.variants[0];

  const availableStock = activeVariant?.availableStock ?? 0;
  const displayPrice = activeVariant?.finalPrice ?? product.finalPrice;
  const originalPrice = activeVariant?.unitPrice ?? product.basePrice;
  const hasDiscount = displayPrice < originalPrice;
  const wishlisted = isWishlisted(product.id);

  const sizesForColor = product.variants.filter((v) => v.color === selectedColor);

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    const matching = product.variants.filter((v) => v.color === colorName);
    const preferredSize =
      matching.find((v) => v.size === selectedSize && v.availableStock > 0) ||
      matching.find((v) => v.availableStock > 0) ||
      matching[0];
    if (preferredSize) setSelectedSize(preferredSize.size);
    setQuantity(1);
    trackEvent({
      eventType: 'Color Selected',
      productId: product.id,
      variantId: preferredSize?.id,
      selectedColor: colorName,
      selectedSize: preferredSize?.size,
    });
  };

  const handleSizeSelect = (sizeLabel: string) => {
    setSelectedSize(sizeLabel);
    setQuantity(1);
    const v = product.variants.find((x) => x.color === selectedColor && x.size === sizeLabel);
    trackEvent({
      eventType: 'Size Selected',
      productId: product.id,
      variantId: v?.id,
      selectedColor,
      selectedSize: sizeLabel,
    });
  };

  const handleAddToCart = async () => {
    if (!activeVariant || availableStock < 1) return;
    setActionLoading(true);
    setFeedback('');
    try {
      await addToCart(activeVariant.id, quantity, true);
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!activeVariant || availableStock < 1) return;
    setActionLoading(true);
    setFeedback('');
    try {
      await addToCart(activeVariant.id, quantity, false);
      trackEvent({
        eventType: 'Checkout Started',
        productId: product.id,
        variantId: activeVariant.id,
        selectedColor,
        selectedSize,
      });
      router.push('/checkout');
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-white text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  const primaryBtn =
    design === '3'
      ? 'bg-[#5C1B24] hover:bg-[#47141B] text-white'
      : design === '2'
        ? 'bg-slate-900 hover:bg-slate-800 text-white rounded-lg'
        : 'bg-[#111113] hover:bg-neutral-800 text-white';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: activeVariant?.sku,
    brand: { '@type': 'Brand', name: 'QAYZ' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: displayPrice,
      availability:
        availableStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className={`${pageBg} min-h-screen py-8 sm:py-12`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs opacity-65 mb-8 flex-wrap">
          <Link href="/" className="hover:underline">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/products" className="hover:underline">Collection</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/products?category=${product.categorySlug}`} className="hover:underline">
            {product.categoryName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-medium opacity-100">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[3/4] bg-[#EFECE6] overflow-hidden border border-current/10">
              <img
                src={product.images[activeImage]?.url || product.primaryImage}
                alt={product.images[activeImage]?.altText || product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`aspect-[3/4] overflow-hidden border-2 transition-all ${
                      activeImage === idx ? 'border-neutral-900' : 'border-transparent opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Purchase Panel & Specs */}
          <div className="lg:col-span-5 space-y-7">
            <div className="space-y-3 border-b border-current/15 pb-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.22em] opacity-65">
                  {product.categoryName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toggleWishlist(product.id);
                    trackEvent({
                      eventType: wishlisted ? 'Wishlist Removed' : 'Wishlist Added',
                      productId: product.id,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs hover:opacity-70"
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#5C1B24] text-[#5C1B24]' : ''}`} />
                  {wishlisted ? 'Saved' : 'Save'}
                </button>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl leading-tight">{product.name}</h1>
              {product.subtitle && <p className="text-sm opacity-75">{product.subtitle}</p>}

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl font-semibold">{formatBDT(displayPrice)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-base line-through opacity-45">
                      {formatBDT(originalPrice)}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] uppercase tracking-wider bg-emerald-700 text-white font-medium">
                      Save {formatBDT(originalPrice - displayPrice)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="uppercase tracking-widest font-semibold opacity-75">Color</span>
                <span className="font-medium">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => {
                  const selected = c.name === selectedColor;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleColorSelect(c.name)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs border transition-all ${
                        selected
                          ? 'border-neutral-900 bg-white font-semibold shadow-xs'
                          : 'border-current/25 bg-white/60 hover:border-current'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/25"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="uppercase tracking-widest font-semibold opacity-75">Size</span>
                <span
                  className={`font-medium ${
                    availableStock <= 0
                      ? 'text-rose-600'
                      : availableStock <= (activeVariant?.lowStockThreshold ?? 5)
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {availableStock <= 0
                    ? 'Out of Stock'
                    : availableStock <= 5
                      ? `Only ${availableStock} left in stock`
                      : `In Stock (${availableStock} available)`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {sizesForColor.map((v) => {
                  const selected = v.size === selectedSize;
                  const out = v.availableStock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => handleSizeSelect(v.size)}
                      className={`py-2.5 text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'border-current/25 bg-white/75 hover:border-neutral-900'
                      } disabled:opacity-35 disabled:line-through`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Action CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-current/25 bg-white">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-3 hover:bg-neutral-100 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= availableStock}
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    className="px-3.5 py-3 hover:bg-neutral-100 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={availableStock <= 0 || actionLoading}
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 text-xs uppercase tracking-[0.2em] font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 ${primaryBtn}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {availableStock <= 0 ? 'Sold Out' : actionLoading ? 'Adding…' : 'Add To Bag'}
                </button>
              </div>

              <button
                type="button"
                disabled={availableStock <= 0 || actionLoading}
                onClick={handleBuyNow}
                className="w-full py-3.5 border border-current text-xs uppercase tracking-[0.2em] font-semibold hover:bg-black/5 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Zap className="w-4 h-4" /> Buy Now · Express Checkout
              </button>

              {feedback && <p className="text-xs text-rose-600">{feedback}</p>}
            </div>

            {/* Description & Specifications */}
            <div className="space-y-5 pt-4 border-t border-current/15 text-sm">
              <div>
                <h2 className="text-xs uppercase tracking-[0.2em] font-semibold mb-2">
                  Atelier Notes
                </h2>
                <p className="leading-relaxed opacity-85">{product.description}</p>
              </div>

              <div className="bg-white/75 border border-current/15 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-current/10">
                  <span className="opacity-65">SKU</span>
                  <span className="font-mono font-medium">{activeVariant?.sku}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-current/10">
                  <span className="opacity-65">Fabric</span>
                  <span className="font-medium text-right">{product.fabric}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-current/10">
                  <span className="opacity-65">Silhouette / Fit</span>
                  <span className="font-medium text-right">{product.fit}</span>
                </div>
                {product.craftDetails && (
                  <div className="flex justify-between py-1 border-b border-current/10 gap-4">
                    <span className="opacity-65 shrink-0">Craftsmanship</span>
                    <span className="font-medium text-right">{product.craftDetails}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 gap-4">
                  <span className="opacity-65 shrink-0">Care</span>
                  <span className="font-medium text-right">{product.careInstructions}</span>
                </div>
              </div>

              {/* Delivery & Return Trust Box */}
              <div className="space-y-2.5 text-xs opacity-85">
                <p className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Inside Dhaka Express (৳80, 24–48h) · Nationwide (৳150, 3–5 days).</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Complimentary 7-day doorstep size exchange on unworn Panjabis.</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Cash on Delivery, bKash, and Card payments supported.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <section className="mt-20 pt-14 border-t border-current/15">
            <h2 className="font-serif text-2xl sm:text-3xl mb-8">Related in {product.categoryName}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.relatedProducts.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}

        {/* Recommended Products */}
        {product.recommendedProducts && product.recommendedProducts.length > 0 && (
          <section className="mt-16 pt-14 border-t border-current/15">
            <h2 className="font-serif text-2xl sm:text-3xl mb-8">Recommended From the Atelier</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.recommendedProducts.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
