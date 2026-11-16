export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-BD')}`;
}

export function formatDateShort(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
    Confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
    Processing: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    Packed: 'bg-violet-50 text-violet-800 border-violet-200',
    Shipped: 'bg-blue-50 text-blue-800 border-blue-200',
    'Out for Delivery': 'bg-cyan-50 text-cyan-800 border-cyan-200',
    Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
    Returned: 'bg-orange-50 text-orange-800 border-orange-200',
    Refunded: 'bg-stone-100 text-stone-700 border-stone-300',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    failed: 'bg-rose-50 text-rose-800 border-rose-200',
    refunded: 'bg-stone-100 text-stone-700 border-stone-300',
    Assigned: 'bg-sky-50 text-sky-800 border-sky-200',
    'Picked Up': 'bg-indigo-50 text-indigo-800 border-indigo-200',
    'In Transit': 'bg-blue-50 text-blue-800 border-blue-200',
    Failed: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return map[status] || 'bg-stone-100 text-stone-700 border-stone-200';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

