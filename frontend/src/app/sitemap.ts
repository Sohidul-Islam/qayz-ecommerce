import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
  const backendUrl =
    process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/orders/track`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const res = await fetch(`${backendUrl}/api/products?limit=100`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const productRoutes: MetadataRoute.Sitemap = (json.data || []).map(
        (p: { slug: string; updatedAt?: string }) => ({
          url: `${baseUrl}/products/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        })
      );
      return [...staticRoutes, ...productRoutes];
    }
  } catch {
    // Fallback to static routes if backend unreachable at build time
  }

  return staticRoutes;
}
