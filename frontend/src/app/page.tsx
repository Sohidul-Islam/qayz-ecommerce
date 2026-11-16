'use client';

import React, { useEffect, useState } from 'react';
import { Category, Product, fetchCategories, fetchProducts } from '@/lib/api';
import { useDesign } from '@/context/DesignContext';
import { HomeDesign1 } from '@/components/home/HomeDesign1';
import { HomeDesign2 } from '@/components/home/HomeDesign2';
import { HomeDesign3 } from '@/components/home/HomeDesign3';

export default function HomePage() {
  const { design } = useDesign();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProducts({ limit: 12 }), fetchCategories()])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data);
        setCategories(catRes);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading && products.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F8F6F1] text-[#111113]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-lg tracking-wider">Opening QAYZ Atelier…</p>
        </div>
      </div>
    );
  }

  if (design === '2') {
    return <HomeDesign2 products={products} categories={categories} />;
  }
  if (design === '3') {
    return <HomeDesign3 products={products} categories={categories} />;
  }
  return <HomeDesign1 products={products} categories={categories} />;
}

