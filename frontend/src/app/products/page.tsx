'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, ShoppingBag } from 'lucide-react';
import { Category, Product, fetchCategories, fetchProducts } from '@/lib/api';
import { useDesign } from '@/context/DesignContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/product/ProductCard';
import { formatBDT } from '@/lib/utils';

export default function ProductsListingPage() {
  const { design, wishlistIds } = useDesign();
  const { trackEvent } = useAnalytics();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [facets, setFacets] = useState<{ sizes: string[]; colors: Array<{ name: string; hex: string }> }>({
    sizes: [],
    colors: [],
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [category, setCategory] = useState('all');
  const [size, setSize] = useState('all');
  const [color, setColor] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('featured');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [wishlistedOnly, setWishlistedOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Quick view modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [qvVariantId, setQvVariantId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('category')) setCategory(sp.get('category')!);
      if (sp.get('sort')) setSort(sp.get('sort')!);
      if (sp.get('search')) {
        const q = sp.get('search')!;
        setSearch(q);
        setSearchInput(q);
      }
      if (sp.get('wishlisted') === 'true') setWishlistedOnly(true);
    }
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({
        category,
        size,
        color,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        inStock: inStock ? 'true' : undefined,
        sort,
        search: search || undefined,
        page,
        limit: 8,
      });

      const list = wishlistedOnly
        ? res.data.filter((p) => wishlistIds.includes(p.id))
        : res.data;

      setProducts(list);
      setPagination(res.pagination);
      setFacets(res.facets);

      if (search.trim()) {
        trackEvent({
          eventType: 'Product Search',
          searchQuery: search.trim(),
          searchResultsCount: res.pagination.total,
          pagePath: '/products',
        });
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, size, color, minPrice, maxPrice, inStock, sort, search, page, wishlistedOnly, wishlistIds, trackEvent]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    setPage(1);
    const catObj = categories.find((c) => c.slug === slug);
    if (catObj) {
      trackEvent({ eventType: 'Category Viewed', categoryId: catObj.id, pagePath: '/products' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setCategory('all');
    setSize('all');
    setColor('all');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSort('featured');
    setSearch('');
    setSearchInput('');
    setWishlistedOnly(false);
    setPage(1);
  };

  const pageBg =
    design === '3'
      ? 'bg-[#FAF5EB] text-[#241715]'
      : design === '2'
        ? 'bg-white text-slate-900'
        : 'bg-[#F8F6F1] text-[#111113]';

  const openQuickView = (p: Product) => {
    setQuickViewProduct(p);
    const firstAvailable = p.variants.find((v) => v.availableStock > 0) || p.variants[0];
    setQvVariantId(firstAvailable?.id || null);
    trackEvent({ eventType: 'Product Viewed', productId: p.id, categoryId: p.categoryId });
  };

  return (
    <div className={`${pageBg} min-h-screen py-10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pb-8 border-b border-current/15 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-60">QAYZ Catalog</p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-1">
              {wishlistedOnly
                ? 'Saved Wishlist'
                : category !== 'all'
                  ? categories.find((c) => c.slug === category)?.name || 'Punjabi Collection'
                  : 'All Punjabi Silhouettes'}
            </h1>
            <p className="text-sm opacity-70 mt-1">
              {pagination.total} piece{pagination.total === 1 ? '' : 's'} curated
              {search ? ` for “${search}”` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 opacity-50 absolute left-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search fabric, color, style..."
                className="pl-9 pr-3 py-2 text-sm border border-current/25 bg-white/80 focus:outline-none focus:border-current w-56 sm:w-64"
              />
            </form>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              aria-label="Sort products"
              className="py-2 px-3 text-sm border border-current/25 bg-white/80 focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="best_selling">Sort: Best Selling</option>
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-current/25 text-xs uppercase tracking-wider bg-white/80"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
          </div>
        </div>

        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`lg:col-span-3 space-y-7 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'
              }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-[0.2em] font-semibold">Refine</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs underline opacity-70 hover:opacity-100"
              >
                Reset All
              </button>
            </div>

            {/* Category */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70">Category</h3>
              <div className="space-y-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className={`block w-full text-left py-1 ${category === 'all' ? 'font-semibold underline underline-offset-4' : 'opacity-75 hover:opacity-100'
                    }`}
                >
                  All Collections
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.slug)}
                    className={`block w-full text-left py-1 ${category === c.slug
                      ? 'font-semibold underline underline-offset-4'
                      : 'opacity-75 hover:opacity-100'
                      }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70">Size</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSize('all');
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs border ${size === 'all'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-current/25 bg-white/60'
                    }`}
                >
                  All
                </button>
                {facets.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSize(s);
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs border ${size === s
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-current/25 bg-white/60'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70">Color</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setColor('all');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs border ${color === 'all'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-current/25 bg-white/60'
                    }`}
                >
                  All
                </button>
                {facets.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setColor(c.name);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border ${color === c.name
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-current/25 bg-white/60'
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70">
                Price (BDT)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ৳"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-current/25 bg-white/80"
                />
                <input
                  type="number"
                  placeholder="Max ৳"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-current/25 bg-white/80"
                />
              </div>
            </div>

            {/* Availability */}
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => {
                  setInStock(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 accent-neutral-900"
              />
              <span>In Stock Only</span>
            </label>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="animate-pulse space-y-3">
                    <div className="aspect-[3/4] bg-black/5" />
                    <div className="h-4 bg-black/5 w-3/4" />
                    <div className="h-4 bg-black/5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center border border-current/15 bg-white/50 space-y-4">
                <p className="font-serif text-2xl">No Panjabis matched your filters</p>
                <p className="text-sm opacity-70">
                  Try clearing filters or searching for silk, jamdani, cotton, or linen.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-widest"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} onQuickView={openQuickView} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 text-xs uppercase tracking-wider border border-current/25 disabled:opacity-35"
                    >
                      Previous
                    </button>
                    <span className="px-4 text-xs">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      className="px-4 py-2 text-xs uppercase tracking-wider border border-current/25 disabled:opacity-35"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white text-neutral-900 max-w-2xl w-full grid grid-cols-1 sm:grid-cols-2 overflow-hidden shadow-2xl relative">
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full hover:bg-neutral-100 z-10"
              aria-label="Close Quick View"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-[3/4] bg-neutral-100">
              <img
                src={quickViewProduct.primaryImage}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                  {quickViewProduct.categoryName}
                </p>
                <h3 className="font-serif text-2xl leading-snug">{quickViewProduct.name}</h3>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-lg font-semibold">
                    {formatBDT(quickViewProduct.finalPrice)}
                  </span>
                  {quickViewProduct.finalPrice < quickViewProduct.basePrice && (
                    <span className="text-sm line-through text-neutral-400">
                      {formatBDT(quickViewProduct.basePrice)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                  {quickViewProduct.description}
                </p>

                <div className="pt-2">
                  <p className="text-xs font-medium mb-2">Select Variant (Color · Size)</p>
                  <div className="flex flex-wrap gap-2">
                    {quickViewProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.availableStock <= 0}
                        onClick={() => setQvVariantId(v.id)}
                        className={`px-2.5 py-1.5 text-xs border transition-colors ${qvVariantId === v.id
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'border-neutral-300 hover:border-neutral-900'
                          } disabled:opacity-35 disabled:line-through`}
                      >
                        {v.color} / {v.size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={!qvVariantId}
                  onClick={async () => {
                    if (!qvVariantId) return;
                    await addToCart(qvVariantId, 1, true);
                    setQuickViewProduct(null);
                  }}
                  className="w-full py-3 bg-neutral-900 text-white text-xs uppercase tracking-widest font-medium hover:bg-neutral-800 inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Add To Bag
                </button>
                <Link
                  href={`/products/${quickViewProduct.slug}`}
                  className="block w-full py-2.5 text-center text-xs uppercase tracking-widest border border-neutral-300 hover:bg-neutral-50"
                >
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

