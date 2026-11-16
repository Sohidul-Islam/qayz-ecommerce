'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Heart, Menu, X } from 'lucide-react';
import { useDesign } from '@/context/DesignContext';
import { useCart } from '@/context/CartContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { design, wishlistIds } = useDesign();
  const { cart, openDrawer } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (pathname.startsWith('/admin')) return null;

  const itemCount = cart?.itemCount || 0;

  const themeClasses = {
    '1': 'bg-[#F8F6F1]/95 text-[#111113] border-b border-[#E5E0D8]',
    '2': 'bg-white/95 text-slate-900 border-b border-slate-200 shadow-sm',
    '3': 'bg-[#FAF5EB]/95 text-[#241715] border-b border-[#D8C5A0]',
  }[design];

  const brandFont = design === '2' ? 'font-sans font-bold tracking-[0.22em]' : 'font-serif tracking-[0.26em] font-semibold';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setMobileOpen(false);
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Collection' },
    { href: '/products?category=royal-heritage-embroidered', label: 'Heritage' },
    { href: '/products?category=artisanal-muslin-silk', label: 'Jamdani & Silk' },
    { href: '/products?category=signature-minimalist-everyday', label: 'Minimalist' },
    { href: '/orders/track', label: 'Track Order' },
  ];

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md transition-colors ${themeClasses}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 -ml-2 hover:opacity-70"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Logo */}
          <Link href="/" className={`text-xl sm:text-2xl uppercase ${brandFont}`}>
            QAYZ
            {design === '3' && (
              <span className="ml-2 text-[10px] tracking-[0.25em] text-[#8B2635] font-sans font-medium align-middle hidden sm:inline">
                ATELIER
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-xs uppercase tracking-[0.16em] transition-opacity hover:opacity-65 ${
                  pathname === l.href ? 'font-semibold underline underline-offset-8' : 'font-medium'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:opacity-70 transition-opacity"
              aria-label="Search Products"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <Link
              href="/products?wishlisted=true"
              className="relative p-2 hover:opacity-70 transition-opacity hidden sm:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute top-1 right-0.5 w-4 h-4 rounded-full bg-[#5C1B24] text-white text-[10px] flex items-center justify-center font-medium">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex items-center gap-2 py-2 px-2.5 hover:opacity-75 transition-opacity"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs font-medium tracking-wider hidden sm:inline">
                BAG ({itemCount})
              </span>
              <span className="sm:hidden absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center">
                {itemCount}
              </span>
            </button>
          </div>
        </div>

        {/* Inline Search Drawer */}
        {searchOpen && (
          <div className="py-3 border-t border-current/10">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 max-w-2xl mx-auto">
              <Search className="w-4 h-4 opacity-50 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search silk panjabi, jamdani, linen, ivory, black..."
                className="w-full bg-transparent text-sm py-2 focus:outline-none placeholder:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-1.5 text-xs uppercase tracking-widest bg-neutral-900 text-white hover:bg-neutral-800 shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-current/10 px-4 py-5 space-y-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm uppercase tracking-widest py-1.5"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

