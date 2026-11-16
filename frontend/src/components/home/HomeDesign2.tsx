'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Star, Truck, Shield, Zap } from 'lucide-react';
import { Category, Product } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';

interface HomeDesignProps {
  products: Product[];
  categories: Category[];
}

export function HomeDesign2({ products, categories }: HomeDesignProps) {
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);

  return (
    <div className="bg-white text-slate-900">
      {/* 1. Modern High-Contrast Hero */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-medium tracking-wide">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              2026 Modern Punjabi Edit · Express Shipping
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.06]">
              Precision Tailored Panjabis for Modern South Asia.
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Engineered collars, breathable pure silk & Supima cotton fabrics, and effortless 1-step
              checkout. Built to look crisp from morning prayers to midnight receptions.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/products"
                className="px-7 py-3.5 rounded-lg bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
              >
                Shop All Panjabis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products?sort=best_selling"
                className="px-7 py-3.5 rounded-lg bg-slate-900 text-white border border-slate-700 font-semibold text-sm hover:bg-slate-800 transition-colors"
              >
                Best Sellers
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 shadow-2xl">
              <img
                src="/images/hero/hero-modern-premium.png"
                alt="QAYZ Modern Premium Supima Cotton Panjabi"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Quick Category Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Shop by Collection</h2>
          <Link href="/products" className="text-sm font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1">
            All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
            >
              <img
                src={cat.imageUrl}
                alt={cat.name}
                className="w-14 h-16 rounded-lg object-cover shrink-0 bg-slate-200"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">{cat.name}</h3>
                <p className="text-xs opacity-65 mt-0.5">{cat.productCount || 0} styles</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Best Sellers Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Best Sellers</h2>
            <p className="text-sm text-slate-500 mt-1">Hover any piece to add your size straight to bag.</p>
          </div>
          <Link
            href="/products?sort=best_selling"
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 4. Dark/Light Contrast Promotional Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Limited Season Privilege
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Unlock 10% Off with Code ROYAL10
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Complimentary shipping on orders over ৳6,500 inside Dhaka. Fast Cash on Delivery &
              instant bKash checkout available.
            </p>
          </div>
          <Link
            href="/products"
            className="px-7 py-3.5 rounded-lg bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 shrink-0 inline-flex items-center gap-2"
          >
            Shop Collection <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Featured Silhouettes</h2>
          <Link href="/products?featured=true" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
            Explore Featured →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 6. New Arrivals */}
      <section className="bg-slate-50 border-y border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">New Arrivals</h2>
            <Link href="/products?sort=newest" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
              See What’s New →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Story + Why Choose Us + Delivery Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Why QAYZ
          </span>
          <h2 className="text-3xl font-bold tracking-tight">
            Designed Around Fit, Breathability & Speed.
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Most Panjabis sacrifice structure for thin cloth or overheat under synthetic blends. We
            calibrate fabric GSM specifically for Bangladesh’s climate and tailor every sleeve,
            shoulder, and collar placket with precision grading from S to XXL.
          </p>
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: CheckCircle2,
              title: 'Zero Shrinkage Pre-Washed',
              desc: 'Every cotton and linen batch is pre-treated so your fit stays exact wash after wash.',
            },
            {
              icon: Truck,
              title: '24–48h Dhaka Express',
              desc: '৳80 flat inside Dhaka, ৳150 nationwide with live tracking IDs and courier updates.',
            },
            {
              icon: Shield,
              title: '7-Day Hassle-Free Exchange',
              desc: 'Wrong size? Request an instant doorstep size swap within 7 days of delivery.',
            },
            {
              icon: Star,
              title: '4.9/5 Verified Customer Rating',
              desc: 'Trusted by thousands of repeat buyers across Dhaka, Chattogram, and Sylhet.',
            },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-xl border border-slate-200 bg-white space-y-2">
              <item.icon className="w-5 h-5 text-slate-900" />
              <h3 className="font-semibold text-base">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
