'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, ShieldCheck, PackageSearch } from 'lucide-react';
import { DESIGN_META, DesignVariant, useDesign } from '@/context/DesignContext';

export function DesignSwitcherBar() {
  const { design, setDesign } = useDesign();
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <div className="bg-neutral-950 text-neutral-200 border-b border-neutral-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-neutral-400 uppercase tracking-widest text-[10px] font-medium mr-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Design Sample:
          </span>
          {(['1', '2', '3'] as DesignVariant[]).map((d) => {
            const active = design === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDesign(d)}
                className={`px-2.5 py-1 rounded-sm transition-all text-[11px] font-medium ${
                  active
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                }`}
              >
                {DESIGN_META[d].label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/orders/track"
            className="inline-flex items-center gap-1 text-neutral-300 hover:text-white transition-colors"
          >
            <PackageSearch className="w-3.5 h-3.5" />
            Track Order
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

