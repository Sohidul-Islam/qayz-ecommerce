'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit3, X } from 'lucide-react';
import { Category, apiFetch, fetchCategories } from '@/lib/api';
import { slugify } from '@/lib/utils';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/products/punjabi-zafar-obsidian.png');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  const load = () => fetchCategories(true).then(setCategories).catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  const openModal = (cat?: Category) => {
    setError('');
    if (cat) {
      setEditing(cat);
      setName(cat.name);
      setSlug(cat.slug);
      setDescription(cat.description);
      setImageUrl(cat.imageUrl);
      setDisplayOrder(cat.displayOrder);
      setIsActive(cat.isActive);
    } else {
      setEditing(null);
      setName('');
      setSlug('');
      setDescription('');
      setImageUrl('/images/products/punjabi-zafar-obsidian.png');
      setDisplayOrder(categories.length + 1);
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name,
        slug: slug || slugify(name),
        description,
        imageUrl,
        displayOrder: Number(displayOrder),
        isActive,
      };
      if (editing) {
        await apiFetch(`/categories/${editing.id}`, {
          method: 'PATCH',
          isAdmin: true,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/categories', {
          method: 'POST',
          isAdmin: true,
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Organize Punjabi collections and homepage navigation hierarchies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-neutral-200 rounded-lg p-4 flex gap-4 items-center">
            <img
              src={cat.imageUrl || '/images/products/punjabi-zafar-obsidian.png'}
              alt={cat.name}
              className="w-16 h-20 object-cover rounded bg-neutral-100 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm truncate">{cat.name}</h3>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {cat.isActive ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-500">/{cat.slug}</p>
              <p className="text-xs text-neutral-600 line-clamp-2">{cat.description}</p>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-500">{cat.productCount || 0} products</span>
                <button
                  type="button"
                  onClick={() => openModal(cat)}
                  className="inline-flex items-center gap-1 text-neutral-800 hover:underline font-medium"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editing ? 'Edit Category' : 'Create Category'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded">{error}</p>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing) setSlug(slugify(e.target.value));
                  }}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Slug *</label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full px-3 py-2 border rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Image URL</label>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 pt-1">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active in storefront navigation
              </label>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-neutral-900 text-white rounded font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
