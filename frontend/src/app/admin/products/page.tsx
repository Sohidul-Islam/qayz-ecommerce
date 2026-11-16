'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Archive,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';
import { Category, Product, apiFetch, fetchCategories, fetchProducts } from '@/lib/api';
import { formatBDT, slugify } from '@/lib/utils';

interface VariantFormRow {
  id?: number;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  initialStock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ImageFormRow {
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [basePrice, setBasePrice] = useState<number>(4500);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [fabric, setFabric] = useState('100% Pure Cotton');
  const [fit, setFit] = useState('Tailored Classic Fit');
  const [careInstructions, setCareInstructions] = useState('Dry clean or cold gentle wash');
  const [craftDetails, setCraftDetails] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [images, setImages] = useState<ImageFormRow[]>([]);
  const [variants, setVariants] = useState<VariantFormRow[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetchProducts({ limit: 100, includeArchived: 'true' }),
        fetchCategories(true),
      ]);
      setProducts(pRes.data);
      setCategories(cRes);
      if (cRes[0]) setCategoryId((prev) => prev || cRes[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setSubtitle('');
    setDescription('');
    setCategoryId(categories[0]?.id || 1);
    setBasePrice(4500);
    setDiscountType('none');
    setDiscountValue(0);
    setFabric('100% Mulberry Silk');
    setFit('Tailored Classic Fit');
    setCareInstructions('Dry clean recommended');
    setCraftDetails('');
    setTagsText('eid, silk, punjabi');
    setIsFeatured(false);
    setIsBestSeller(false);
    setIsNewArrival(true);
    setIsActive(true);
    setSeoTitle('');
    setSeoDescription('');
    setImages([
      {
        url: '/images/products/punjabi-zafar-obsidian.png',
        altText: 'QAYZ Panjabi Front View',
        displayOrder: 0,
        isPrimary: true,
      },
    ]);
    setVariants([
      {
        sku: `QYZ-NEW-${Math.floor(100 + Math.random() * 900)}-M`,
        color: 'Obsidian Black',
        colorHex: '#141416',
        size: 'M',
        initialStock: 15,
        lowStockThreshold: 5,
        isActive: true,
      },
      {
        sku: `QYZ-NEW-${Math.floor(100 + Math.random() * 900)}-L`,
        color: 'Obsidian Black',
        colorHex: '#141416',
        size: 'L',
        initialStock: 12,
        lowStockThreshold: 5,
        isActive: true,
      },
    ]);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSlug(p.slug);
    setSubtitle(p.subtitle);
    setDescription(p.description);
    setCategoryId(p.categoryId);
    setBasePrice(p.basePrice);
    setDiscountType(p.discountType);
    setDiscountValue(p.discountValue);
    setFabric(p.fabric);
    setFit(p.fit);
    setCareInstructions(p.careInstructions);
    setCraftDetails(p.craftDetails);
    setTagsText((p.tags || []).join(', '));
    setIsFeatured(p.isFeatured);
    setIsBestSeller(p.isBestSeller);
    setIsNewArrival(p.isNewArrival);
    setIsActive(p.isActive);
    setSeoTitle(p.seoTitle);
    setSeoDescription(p.seoDescription);
    setImages(
      p.images.map((im, idx) => ({
        url: im.url,
        altText: im.altText,
        displayOrder: idx,
        isPrimary: im.isPrimary,
      }))
    );
    setVariants(
      p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        initialStock: v.currentStock,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
      }))
    );
    setError('');
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiFetch<{ success: boolean; data: { url: string } }>('/admin/upload', {
        method: 'POST',
        isAdmin: true,
        body: formData,
      });
      setImages((prev) => [
        ...prev,
        {
          url: res.data.url,
          altText: name || 'Punjabi product image',
          displayOrder: prev.length,
          isPrimary: prev.length === 0,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    setImages(
      copy.map((img, i) => ({
        ...img,
        displayOrder: i,
        isPrimary: i === 0,
      }))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name,
      slug: slug || slugify(name),
      subtitle,
      description,
      categoryId: Number(categoryId),
      basePrice: Number(basePrice),
      discountType,
      discountValue: Number(discountValue) || 0,
      fabric,
      fit,
      careInstructions,
      craftDetails,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isFeatured,
      isBestSeller,
      isNewArrival,
      isActive,
      seoTitle,
      seoDescription,
      images: images.map((im, i) => ({ ...im, displayOrder: i, isPrimary: i === 0 })),
      variants,
    };

    try {
      if (editingId) {
        await apiFetch(`/products/${editingId}`, {
          method: 'PATCH',
          isAdmin: true,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/products', {
          method: 'POST',
          isAdmin: true,
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (p: Product) => {
    try {
      if (p.isArchived) {
        await apiFetch(`/products/${p.id}`, {
          method: 'PATCH',
          isAdmin: true,
          body: JSON.stringify({ isArchived: false, isActive: true }),
        });
      } else {
        await apiFetch(`/products/${p.id}`, {
          method: 'DELETE',
          isAdmin: true,
        });
      }
      await loadAll();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const visibleProducts = products.filter((p) => (showArchived ? p.isArchived : !p.isArchived));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product & Variant Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create Panjabis, manage gallery order, pricing/discounts, SKUs, and archive status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-neutral-900"
            />
            Show Archived
          </label>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add New Panjabi
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Variants & Stock</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    Loading catalog…
                  </td>
                </tr>
              ) : (
                visibleProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.primaryImage}
                          alt={p.name}
                          className="w-10 h-12 object-cover bg-neutral-100 rounded"
                        />
                        <div>
                          <p className="font-semibold text-neutral-900">{p.name}</p>
                          <p className="text-[11px] text-neutral-500 font-mono">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.categoryName}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{formatBDT(p.finalPrice)}</p>
                      {p.finalPrice < p.basePrice && (
                        <p className="text-[11px] text-emerald-700">
                          Base: {formatBDT(p.basePrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.variants.length} SKUs</p>
                      <p className="text-[11px] text-neutral-500">
                        {p.totalAvailableStock} total units
                      </p>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          p.isActive && !p.isArchived
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {p.isArchived ? 'Archived' : p.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {p.isFeatured && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800">
                          Featured
                        </span>
                      )}
                      {p.isBestSeller && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-800">
                          Best Seller
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-100 inline-flex items-center gap-1"
                        title="Edit Product"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveToggle(p)}
                        className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-100 inline-flex items-center gap-1 text-neutral-700"
                        title={p.isArchived ? 'Restore Product' : 'Archive Product'}
                      >
                        {p.isArchived ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="font-bold text-lg">
                {editingId ? 'Edit Panjabi Product' : 'Create New Panjabi Product'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 hover:bg-neutral-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Product Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingId) setSlug(slugify(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">URL Slug *</label>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Subtitle</label>
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                />
              </div>

              {/* Pricing & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded border border-neutral-200">
                <div>
                  <label className="block font-medium mb-1">Base Price (BDT) *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'none' | 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (BDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Discount Value</label>
                  <input
                    type="number"
                    min={0}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>
              </div>

              {/* Specs & Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1">Fabric</label>
                  <input
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Fit</label>
                  <input
                    value={fit}
                    onChange={(e) => setFit(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Tags (comma separated)</label>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-5 pt-1">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active (Visible)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                  Featured
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
                  Best Seller
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
                  New Arrival
                </label>
              </div>

              {/* Multi-Image Manager */}
              <div className="space-y-3 border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Product Images (First = Primary)</h3>
                  <label className="px-3 py-1.5 border border-neutral-300 rounded cursor-pointer hover:bg-neutral-50 inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading…' : 'Upload Image File'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or paste image URL (/images/products/...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-neutral-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrl.trim()) return;
                      setImages((prev) => [
                        ...prev,
                        { url: newImageUrl.trim(), altText: name, displayOrder: prev.length, isPrimary: prev.length === 0 },
                      ]);
                      setNewImageUrl('');
                    }}
                    className="px-3 py-1.5 bg-neutral-900 text-white rounded"
                  >
                    Add URL
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={`${img.url}-${idx}`} className="border border-neutral-200 rounded p-2 space-y-2">
                      <img src={img.url} alt={img.altText} className="w-full h-28 object-cover bg-neutral-100 rounded" />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveImage(idx, -1)} className="p-1 border rounded">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => moveImage(idx, 1)} className="p-1 border rounded">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-3 border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Product Variants (Color & Size)</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((prev) => [
                        ...prev,
                        {
                          sku: `QYZ-${Date.now().toString().slice(-4)}-${prev.length + 1}`,
                          color: 'Ivory',
                          colorHex: '#F3ECE0',
                          size: 'L',
                          initialStock: 10,
                          lowStockThreshold: 5,
                          isActive: true,
                        },
                      ])
                    }
                    className="px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-neutral-50 p-2.5 rounded border border-neutral-200">
                      <input
                        placeholder="SKU"
                        value={v.sku}
                        onChange={(e) => {
                          const next = [...variants];
                          next[idx].sku = e.target.value;
                          setVariants(next);
                        }}
                        className="px-2 py-1.5 border rounded bg-white font-mono"
                      />
                      <input
                        placeholder="Color"
                        value={v.color}
                        onChange={(e) => {
                          const next = [...variants];
                          next[idx].color = e.target.value;
                          setVariants(next);
                        }}
                        className="px-2 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="color"
                        value={v.colorHex}
                        onChange={(e) => {
                          const next = [...variants];
                          next[idx].colorHex = e.target.value;
                          setVariants(next);
                        }}
                        className="w-full h-8 border rounded bg-white"
                      />
                      <input
                        placeholder="Size (S/M/L/XL)"
                        value={v.size}
                        onChange={(e) => {
                          const next = [...variants];
                          next[idx].size = e.target.value;
                          setVariants(next);
                        }}
                        className="px-2 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        disabled={Boolean(v.id)}
                        title={v.id ? 'Adjust stock via Inventory page' : 'Initial Stock'}
                        value={v.initialStock}
                        onChange={(e) => {
                          const next = [...variants];
                          next[idx].initialStock = Number(e.target.value);
                          setVariants(next);
                        }}
                        className="px-2 py-1.5 border rounded bg-white disabled:bg-neutral-100"
                      />
                      <button
                        type="button"
                        disabled={variants.length <= 1 || Boolean(v.id)}
                        onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                        className="px-2 py-1.5 text-rose-600 border border-rose-200 rounded disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
                <div>
                  <label className="block font-medium mb-1">SEO Title</label>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">SEO Meta Description</label>
                  <input
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-neutral-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
