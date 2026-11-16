'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Truck, ShieldCheck, Award, RefreshCw } from 'lucide-react';
import { Category, Product } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';

interface HomeDesignProps {
  products: Product[];
  categories: Category[];
}

export function HomeDesign3({ products, categories }: HomeDesignProps) {
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  return (
    <div className="bg-[#FAF5EB] text-[#241715]">
      {/* 1. Traditional + Modern Editorial Hero */}
      <section className="relative overflow-hidden border-b border-[#D8C5A0] pattern-jaali">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-18 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.26em] text-[#5C1B24] font-semibold">
              <span className="w-8 h-[1px] bg-[#B89146]" />
              Heritage Artisanal House · Est. Dhaka
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] leading-[1.08] text-[#241715]">
              South Asian Craft, Tailored for Today’s Gentleman.
            </h1>
            <p className="text-base text-[#54403B] leading-relaxed max-w-lg">
              Celebrating the timeless grace of Dhaka Jamdani, Lucknowi Chikankari, and hand-guided
              Zari embroidery—reimagined in crisp, breathable silhouettes.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/products"
                className="px-8 py-4 bg-[#5C1B24] text-[#FAF5EB] text-xs uppercase tracking-[0.22em] font-semibold hover:bg-[#47141B] transition-colors inline-flex items-center gap-2.5 shadow-sm"
              >
                Explore Heritage Edit <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products?category=wedding-nikah-atelier"
                className="px-7 py-4 border border-[#B89146] bg-[#FFFDF8] text-[#241715] text-xs uppercase tracking-[0.22em] font-semibold hover:bg-[#F3ECE0] transition-colors"
              >
                Wedding & Nikah
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            {/* Subtle Mughal Arch Frame */}
            <div className="relative w-full max-w-lg">
              <div className="aspect-[4/4.2] rounded-t-[160px] rounded-b-lg overflow-hidden border-2 border-[#B89146]/50 p-2 bg-[#FFFDF8] shadow-xl">
                <img
                  src="/images/hero/hero-traditional-heritage.png"
                  alt="QAYZ Heritage Jamdani Zari Panjabi"
                  className="w-full h-full object-cover rounded-t-[150px] rounded-b"
                />
              </div>
              <div className="hidden sm:block absolute -bottom-4 -left-4 bg-[#5C1B24] text-[#FAF5EB] px-5 py-3 border border-[#B89146]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#E6C98C]">
                  Artisan Certified
                </p>
                <p className="font-serif text-sm">Handwoven Jamdani & Zari</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Royal Collections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#8B2635] font-semibold">
            Curated Chapters
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl">The Signature Collections</h2>
          <div className="w-20 h-[1px] bg-[#B89146] mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group bg-[#FFFDF8] border border-[#E2D4B7] p-3 text-center hover:border-[#B89146] transition-all"
            >
              <div className="aspect-[3/4] rounded-t-[48px] overflow-hidden bg-[#EFE6D5] mb-3.5">
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="font-serif text-base text-[#241715]">{cat.name}</h3>
              <p className="text-[11px] text-[#7A655D] mt-1">{cat.productCount || 0} Creations</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Heritage Pieces */}
      <section className="bg-[#F4ECDC] border-y border-[#DFD1B4] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#8B2635] font-semibold">
                House Highlights
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl mt-1">Featured Creations</h2>
            </div>
            <Link
              href="/products?featured=true"
              className="text-xs uppercase tracking-[0.2em] text-[#5C1B24] font-semibold underline underline-offset-8"
            >
              Explore All Featured
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Festive Promotional Band */}
      <section className="bg-[#5C1B24] text-[#FAF5EB] py-14 border-y border-[#B89146]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#E6C98C]">
              Festive Celebration Offer
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl">
              Save ৳500 on Festive Orders with Code <span className="text-[#E6C98C]">EID500</span>
            </h2>
            <p className="text-sm text-[#FAF5EB]/80">
              Valid on all orders above ৳5,000 · Or use WELCOME15 for 15% off your first purchase.
            </p>
          </div>
          <Link
            href="/products?category=festive-eid-collection"
            className="px-8 py-4 bg-[#FAF5EB] text-[#5C1B24] text-xs uppercase tracking-[0.22em] font-semibold hover:bg-white shrink-0 transition-colors"
          >
            Shop Festive Edit
          </Link>
        </div>
      </section>

      {/* 5. New Arrivals & Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-20">
        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#8B2635] font-semibold">
                Seasonal Looms
              </p>
              <h2 className="font-serif text-3xl mt-1">New Arrivals</h2>
            </div>
            <Link href="/products?sort=newest" className="text-xs uppercase tracking-widest underline underline-offset-8">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#8B2635] font-semibold">
                Most Cherished
              </p>
              <h2 className="font-serif text-3xl mt-1">Best Sellers</h2>
            </div>
            <Link href="/products?sort=best_selling" className="text-xs uppercase tracking-widest underline underline-offset-8">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Heritage Craft Story + Why Choose Us + Reviews */}
      <section className="bg-[#FFFDF8] border-t border-[#E2D4B7] py-16 sm:py-20 pattern-jaali">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                icon: Award,
                title: 'Direct Weaver Partnerships',
                desc: 'Authentic Jamdani, Tussar & Matka weaves sourced directly from master artisans.',
              },
              {
                icon: Truck,
                title: 'Royal Dispatch Delivery',
                desc: 'Express 24–48h in Dhaka (৳80) and nationwide tracked courier in 3–5 days.',
              },
              {
                icon: RefreshCw,
                title: '7-Day Exchange Assurance',
                desc: 'Complimentary size exchange if the fit isn’t effortless out of the box.',
              },
              {
                icon: ShieldCheck,
                title: 'Trusted Doorstep COD',
                desc: 'Pay in cash upon delivery or seamlessly online via bKash and cards.',
              },
            ].map((pillar) => (
              <div key={pillar.title} className="bg-[#FAF5EB] border border-[#E2D4B7] p-6 space-y-2.5">
                <pillar.icon className="w-5 h-5 text-[#5C1B24]" />
                <h3 className="font-serif text-lg">{pillar.title}</h3>
                <p className="text-sm text-[#54403B]">{pillar.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'The Nawab Emerald Panjabi felt like true heirloom couture during our family wedding reception.',
                author: 'Tahmid Hossain · Chattogram',
              },
              {
                quote:
                  'Subtle zari work without looking gaudy. My father and I both ordered matching ivory Jamdani pieces.',
                author: 'Saifullah Khan · Gulshan 2',
              },
              {
                quote:
                  'Quick order tracking and immaculate finishing inside the collar placket.',
                author: 'Shafiqul Alam · Mohakhali DOHS',
              },
            ].map((r) => (
              <div key={r.author} className="bg-white border border-[#E2D4B7] p-6 space-y-3">
                <div className="flex gap-1 text-[#B89146]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="font-serif text-base text-[#241715]">“{r.quote}”</p>
                <p className="text-xs text-[#7A655D] font-medium">— {r.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

