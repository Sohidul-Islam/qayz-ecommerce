'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDesign } from '@/context/DesignContext';

export function Footer() {
  const pathname = usePathname();
  const { design } = useDesign();

  if (pathname.startsWith('/admin')) return null;

  const wrapperClass = {
    '1': 'bg-[#111113] text-[#F8F6F1]',
    '2': 'bg-slate-950 text-slate-100',
    '3': 'bg-[#221215] text-[#FAF5EB] border-t-2 border-[#B89146]/40',
  }[design];

  return (
    <footer className={`${wrapperClass} mt-20`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="md:col-span-1 space-y-4">
            <h3 className="font-serif text-2xl tracking-[0.25em] uppercase">QAYZ</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Modern South Asian Punjabi craftsmanship tailored in Dhaka. Natural handloom silks,
              Jamdani muslin, and Belgian linen engineered for quiet dignity.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 font-semibold">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li>
                <Link href="/products?category=royal-heritage-embroidered" className="hover:text-white">
                  Royal Heritage Embroidered
                </Link>
              </li>
              <li>
                <Link href="/products?category=artisanal-muslin-silk" className="hover:text-white">
                  Artisanal Jamdani & Silk
                </Link>
              </li>
              <li>
                <Link href="/products?category=signature-minimalist-everyday" className="hover:text-white">
                  Minimalist Everyday
                </Link>
              </li>
              <li>
                <Link href="/products?category=wedding-nikah-atelier" className="hover:text-white">
                  Wedding & Nikah Atelier
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 font-semibold">
              Client Concierge
            </h4>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li>
                <Link href="/orders/track" className="hover:text-white">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy & Terms
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white">
                  Admin Operations Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4 font-semibold">
              Banani Flagship Atelier
            </h4>
            <p className="text-sm text-white/80">Road 11, Banani, Dhaka 1213</p>
            <p className="text-sm text-white/80">concierge@qayz.com</p>
            <p className="text-sm text-white/80">+880 1700-004500</p>
            <p className="text-xs text-white/50 pt-2">
              Inside Dhaka 24–48h Express · Nationwide 3–5 Days · 7-Day Easy Size Exchange
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} QAYZ Punjabi Atelier. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Cash on Delivery</span>
            <span>bKash & Card Ready</span>
            <span>Verified Craft Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

