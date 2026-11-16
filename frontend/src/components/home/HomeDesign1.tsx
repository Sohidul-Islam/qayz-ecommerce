'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Truck, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { Category, Product } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';

interface HomeDesignProps {
  products: Product[];
  categories: Category[];
}

export function HomeDesign1({ products, categories }: HomeDesignProps) {
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  return (
    <div className="bg-[#F8F6F1] text-[#111113]">
      {/* 1. Editorial Luxury Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-14 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-7 order-2 lg:order-1">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B655E] font-medium">
              Dhaka Atelier · Edition 2026
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight">
              Quiet Dignity in Handwoven Punjabi.
            </h1>
            <p className="text-base text-[#4A4640] leading-relaxed max-w-md">
              Tailored from raw mulberry silk, breathable Dhaka Jamdani, and enzyme-washed
              Belgian linen. Designed for effortless presence without excess.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/products"
                className="px-8 py-4 bg-[#111113] text-[#F8F6F1] text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition-colors inline-flex items-center gap-2.5"
              >
                Explore Collection <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products?category=artisanal-muslin-silk"
                className="px-7 py-4 border border-[#111113]/30 text-xs uppercase tracking-[0.2em] font-medium hover:border-[#111113] transition-colors"
              >
                Jamdani & Silk
              </Link>
            </div>
            <div className="pt-6 border-t border-[#E5E0D8] grid grid-cols-3 gap-4 text-xs text-[#6B655E]">
              <div>
                <p className="font-serif text-lg text-[#111113]">24–48h</p>
                <p>Dhaka Express</p>
              </div>
              <div>
                <p className="font-serif text-lg text-[#111113]">100%</p>
                <p>Natural Fibers</p>
              </div>
              <div>
                <p className="font-serif text-lg text-[#111113]">7 Days</p>
                <p>Size Exchange</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] bg-[#EFECE6] overflow-hidden">
              <img
                src="/images/hero/hero-luxury-minimal.png"
                alt="QAYZ Luxury Minimal Obsidian Silk Panjabi"
                className="w-full h-full object-cover"
              />
              <div className="hidden sm:block absolute bottom-5 left-5 bg-[#F8F6F1]/90 backdrop-blur-sm px-5 py-3 border border-[#E5E0D8]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#6B655E]">Featured Piece</p>
                <p className="font-serif text-sm text-[#111113]">
                  Zafar Obsidian Zari-Collar Silk Panjabi
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Punjabi Collections */}
      <section className="border-y border-[#E5E0D8] bg-[#F3EFE7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B655E]">Curated Houses</p>
              <h2 className="font-serif text-3xl sm:text-4xl mt-1">The Punjabi Collections</h2>
            </div>
            <Link
              href="/products"
              className="text-xs uppercase tracking-[0.2em] underline underline-offset-8 hover:opacity-65"
            >
              View All Categories
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group block bg-[#F8F6F1] border border-[#E5E0D8] p-3 hover:border-[#111113] transition-colors"
              >
                <div className="aspect-[3/4] bg-[#EFECE6] overflow-hidden mb-3">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <h3 className="font-serif text-base leading-snug">{cat.name}</h3>
                <p className="text-[11px] text-[#6B655E] mt-1">{cat.productCount || 0} Pieces</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B655E]">Atelier Selection</p>
            <h2 className="font-serif text-3xl sm:text-4xl mt-1">Featured Panjabis</h2>
          </div>
          <Link
            href="/products?featured=true"
            className="text-xs uppercase tracking-[0.2em] underline underline-offset-8 hover:opacity-65"
          >
            Shop Featured
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 4. Editorial Promotional Section */}
      <section className="bg-[#111113] text-[#F8F6F1] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/90">
              Private Atelier Privilege
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl leading-tight">
              Complimentary Dhaka Delivery & 10% Off Your First Order.
            </h2>
            <p className="text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
              Present privilege code <span className="text-white font-semibold tracking-wider">ROYAL10</span> at
              checkout for 10% off orders above ৳3,000, or <span className="text-white font-semibold tracking-wider">EID500</span> for
              ৳500 off festive silhouettes.
            </p>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <Link
              href="/products"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#F8F6F1] text-[#111113] text-xs uppercase tracking-[0.22em] font-semibold hover:bg-neutral-200 transition-colors"
            >
              Claim Privilege <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B655E]">Just Tailored</p>
            <h2 className="font-serif text-3xl sm:text-4xl mt-1">New Arrivals</h2>
          </div>
          <Link
            href="/products?sort=newest"
            className="text-xs uppercase tracking-[0.2em] underline underline-offset-8 hover:opacity-65"
          >
            View Latest
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 6. Brand / Craft Story */}
      <section className="border-y border-[#E5E0D8] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img
              src="/images/products/punjabi-aarav-ivory.png"
              alt="Dhaka Jamdani Craft"
              className="w-full aspect-[3/4] object-cover bg-[#EFECE6]"
            />
            <img
              src="/images/products/punjabi-kabir-tussar.png"
              alt="Raw Tussar Silk Texture"
              className="w-full aspect-[3/4] object-cover bg-[#EFECE6] mt-8"
            />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#6B655E]">Our Philosophy</p>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
              Woven on Heritage Looms. Tailored for Contemporary Life.
            </h2>
            <p className="text-[#4A4640] leading-relaxed">
              A truly memorable Panjabi relies on discipline—not loud embellishments. We partner
              directly with master weavers in Narayanganj and Bogura to source genuine handloom
              Jamdani, raw Tussar silk, and extra-long-staple Supima cotton.
            </p>
            <p className="text-[#4A4640] leading-relaxed">
              Every collar stay is fused for crisp upright posture, every seam is finished with
              high-density French stitching, and each garment undergoes breathable finishing suited
              to South Asian warmth.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B655E]">Client Favorites</p>
            <h2 className="font-serif text-3xl sm:text-4xl mt-1">Best Sellers</h2>
          </div>
          <Link
            href="/products?sort=best_selling"
            className="text-xs uppercase tracking-[0.2em] underline underline-offset-8 hover:opacity-65"
          >
            Shop Best Sellers
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 8. Why Choose Us + Delivery Information */}
      <section className="border-t border-[#E5E0D8] bg-[#F3EFE7] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2.5">
            <Sparkles className="w-5 h-5 text-[#111113]" />
            <h3 className="font-serif text-lg">Authentic Loom Fabrics</h3>
            <p className="text-sm text-[#5A544D]">
              Verified Mulberry Silk, Dhaka Jamdani, Belgian Linen, and Supima cotton with zero synthetic stiffness.
            </p>
          </div>
          <div className="space-y-2.5">
            <Truck className="w-5 h-5 text-[#111113]" />
            <h3 className="font-serif text-lg">Rapid Nationwide Dispatch</h3>
            <p className="text-sm text-[#5A544D]">
              24–48 hour express delivery across Dhaka (৳80) and 3–5 day nationwide courier with real-time order tracking.
            </p>
          </div>
          <div className="space-y-2.5">
            <RefreshCw className="w-5 h-5 text-[#111113]" />
            <h3 className="font-serif text-lg">7-Day Easy Size Exchange</h3>
            <p className="text-sm text-[#5A544D]">
              Need a different fit? Our courier collects and exchanges unworn garments effortlessly within 7 days.
            </p>
          </div>
          <div className="space-y-2.5">
            <ShieldCheck className="w-5 h-5 text-[#111113]" />
            <h3 className="font-serif text-lg">Cash on Delivery & Online</h3>
            <p className="text-sm text-[#5A544D]">
              Inspect your Panjabi at the doorstep with Cash on Delivery or settle swiftly via bKash and cards.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Customer Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B655E] text-center">
          Verified Client Notes
        </p>
        <h2 className="font-serif text-3xl text-center mt-1 mb-10">Worn Across Milestones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote:
                'The Zafar Obsidian silk collar holds its structure all evening without feeling heavy. Easily the finest tailored Panjabi in my wardrobe.',
              author: 'Zahir Uddin · Banani, Dhaka',
              item: 'Zafar Obsidian Silk Panjabi',
            },
            {
              quote:
                'Ordered the Aarav Ivory Jamdani for my brother’s Nikah. Arrived within 26 hours in signature packaging and the fabric drape is extraordinary.',
              author: 'Rafiqul Islam · Dhanmondi, Dhaka',
              item: 'Aarav Ivory Jamdani Panjabi',
            },
            {
              quote:
                'Minimal, breathable, and zero loud flashiness. The Belgian linen Panjabi became my go-to for every Jummah and dinner.',
              author: 'Mehedi Hasan · Uttara, Dhaka',
              item: 'Rayan Belgian Linen Panjabi',
            },
          ].map((rev) => (
            <blockquote
              key={rev.author}
              className="bg-white border border-[#E5E0D8] p-7 space-y-4"
            >
              <div className="flex gap-1 text-[#111113]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <p className="font-serif text-base leading-relaxed text-[#2C2A27]">
                “{rev.quote}”
              </p>
              <footer className="text-xs text-[#6B655E] pt-2 border-t border-[#EFECE6]">
                <span className="font-medium text-[#111113] block">{rev.author}</span>
                <span>{rev.item}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
