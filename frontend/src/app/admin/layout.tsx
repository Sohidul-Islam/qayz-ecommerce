'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Shield,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { AdminUser, apiFetch } from '@/lib/api';

const AdminContext = createContext<{ admin: AdminUser | null; reloadAdmin: () => void }>({
  admin: null,
  reloadAdmin: () => undefined,
});

export function useAdminAuth() {
  return useContext(AdminContext);
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, perm: 'orders.view' },
  { href: '/admin/products', label: 'Products', icon: Package, perm: 'products.view' },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree, perm: 'products.view' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, perm: 'inventory.view' },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck, perm: 'orders.view' },
  { href: '/admin/analytics', label: 'Analytics & Funnel', icon: BarChart3, perm: 'analytics.view' },
  { href: '/admin/customers', label: 'Customers & Carts', icon: Users, perm: 'orders.view' },
  { href: '/admin/users', label: 'Admin Roles', icon: Shield, perm: 'users.manage' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, perm: 'audit.view' },
  { href: '/admin/settings', label: 'Settings & Coupons', icon: Settings, perm: 'settings.manage' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  const loadMe = () => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<{ success: boolean; data: { admin: AdminUser } }>('/admin/auth/me', {
      isAdmin: true,
    })
      .then((res) => {
        setAdmin(res.data.admin);
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('qayz_admin_token');
        }
        router.replace('/admin/login');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Verifying Admin Session…
          </p>
        </div>
      </div>
    );
  }

  const hasPerm = (perm: string) =>
    admin.roleSlug === 'super_admin' || admin.permissions.includes(perm);

  const handleLogout = async () => {
    await apiFetch('/admin/auth/logout', { method: 'POST', isAdmin: true }).catch(() => undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qayz_admin_token');
    }
    router.push('/admin/login');
  };

  const visibleNav = NAV_ITEMS.filter((item) => hasPerm(item.perm));

  return (
    <AdminContext.Provider value={{ admin, reloadAdmin: loadMe }}>
      <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden bg-[#111113] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 hover:bg-white/10 rounded"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-serif tracking-[0.2em] uppercase text-sm">QAYZ ADMIN</span>
          </div>
          <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
            {admin.roleName}
          </span>
        </div>

        {/* Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:flex lg:w-64 lg:flex-col lg:shrink-0 bg-[#111113] text-neutral-200 border-r border-neutral-800`}
        >
          <div className="p-5 border-b border-neutral-800 hidden lg:block">
            <Link href="/admin" className="font-serif text-xl tracking-[0.25em] uppercase text-white block">
              QAYZ
            </Link>
            <p className="text-[11px] text-neutral-400 mt-1">Punjabi Atelier Operations</p>
          </div>

          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
            <p className="text-xs font-semibold text-white truncate">{admin.name}</p>
            <p className="text-[11px] text-neutral-400 truncate">{admin.email}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30">
              {admin.roleName}
            </span>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded transition-colors ${
                    active
                      ? 'bg-white text-neutral-950'
                      : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-neutral-800 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded"
            >
              <ExternalLink className="w-4 h-4" /> View Storefront
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/50 rounded"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}

