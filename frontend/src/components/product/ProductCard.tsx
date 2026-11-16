'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '@/lib/api';
import { formatBDT } from '@/lib/utils';
import { useDesign } from '@/context/DesignContext';
import { useCart } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { design, isWishlisted, toggleWishlist } = useDesign();
  const { addToCart } = useCart();
  const { trackEvent } = useAnalytics();
  const [addingSize, setAddingSize] = useState<string | null>(null);

  const wishlisted = isWishlisted(product.id);
  const hasDiscount = product.finalPrice < product.basePrice;
  const availableVariants = product.variants.filter((v) => v.availableStock > 0 && v.isActive);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    trackEvent({
      eventType: wishlisted ? 'Wishlist Removed' : 'Wishlist Added',
      productId: product.id,
      categoryId: product.categoryId,
    });
  };

  const handleQuickAddVariant = async (e: React.MouseEvent, variantId: number, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingSize(size);
    try {
      await addToCart(variantId, 1, true);
    } finally {
      setAddingSize(null);
    }
  };

  const cardShell = {
    '1': 'group bg-transparent',
    '2': 'group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300',
    '3': 'group bg-[#FFFDF8] border border-[#E6D9BE] p-3 hover:border-[#B89146] transition-all duration-300',
  }[design];

  const imageFrame = {
    '1': 'aspect-[3/4] bg-[#EFECE6] overflow-hidden relative',
    '2': 'aspect-[3/4] bg-slate-100 overflow-hidden relative',
    '3': 'aspect-[3/4] bg-[#F3ECE0] overflow-hidden relative rounded-t-[28px]',
  }[design];

  return (
    <article className={cardShell}>
      <div className={imageFrame}>
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={product.primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </Link>

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {!product.inStock && (
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest bg-neutral-900 text-white font-medium">
              Sold Out
            </span>
          )}
          {product.inStock && hasDiscount && (
            <span
              className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-medium ${design === '3'
                ? 'bg-[#5C1B24] text-[#FAF5EB]'
                : design === '2'
                  ? 'bg-emerald-600 text-white rounded'
                  : 'bg-[#111113] text-white'
                }`}
            >
              {product.discountType === 'percentage'
                ? `-${product.discountValue}%`
                : `Save ${formatBDT(product.discountAmountPerUnit)}`}
            </span>
          )}
          {product.inStock && !hasDiscount && product.isNewArrival && (
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest bg-white/90 text-neutral-900 backdrop-blur-sm font-medium">
              New
            </span>
          )}
        </div>

        {/* Wishlist & Quick View Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label="Toggle Wishlist"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-neutral-800 hover:bg-white shadow-sm transition-transform hover:scale-105"
          >
            <Heart
              className={`w-4 h-4 ${wishlisted ? 'fill-[#5C1B24] text-[#5C1B24]' : ''}`}
            />
          </button>
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              aria-label="Quick View"
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-neutral-800 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Size Add Hover Bar (Design 2 prominent / subtle on 1 & 3) */}
        {product.inStock && availableVariants.length > 0 && (
          <div className="absolute inset-x-3 bottom-3 bg-white/95 backdrop-blur-sm px-2.5 py-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-md">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5 flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> Quick Add Size
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(
                new Map(availableVariants.map((v) => [v.size, v])).values()
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={addingSize === v.size}
                  onClick={(e) => handleQuickAddVariant(e, v.id, v.size)}
                  className="px-2 py-0.5 text-[11px] font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
                >
                  {addingSize === v.size ? '…' : v.size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={design === '2' ? 'p-4 space-y-2' : 'pt-3.5 pb-1 space-y-1.5'}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] opacity-60 truncate">
            {product.categoryName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {product.colors.slice(0, 3).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="w-2.5 h-2.5 rounded-full border border-black/20"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className={`block leading-snug hover:underline line-clamp-1 ${design === '1'
            ? 'font-serif text-base text-[#111113]'
            : design === '3'
              ? 'font-serif text-base text-[#241715]'
              : 'font-sans font-semibold text-sm text-slate-900'
            }`}
        >
          {product.name}
        </Link>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{formatBDT(product.finalPrice)}</span>
            {hasDiscount && (
              <span className="text-xs line-through opacity-45">{formatBDT(product.basePrice)}</span>
            )}
          </div>
          <span className="text-[11px] opacity-65">
            {product.inStock ? `${product.sizes.join(' · ')}` : 'Out of Stock'}
          </span>
        </div>
      </div>
    </article>
  );
}

