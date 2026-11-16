/* Shared data layer for the rentals storefront (index.html) and the admin (admin.html).
   Today it saves to this browser's localStorage. When your API is ready, replace the bodies of
   list / add / update / remove with fetch() calls (e.g. GET/POST/PATCH/DELETE /api/inventory).
   Keep the same return shapes and nothing else on either page needs to change. */
const CURRENCY = '₦';

const Store = (() => {
  const KEY = 'tg_inventory_v1';
  const seed = [
    { id: 's1', name: 'Ivory Rose Bundle', sku: 'FL-001', category: 'Florals', price: 8000, total: 120, out: 40, pending: 10, image: '' },
    { id: 's2', name: 'Blush Peony Arrangement', sku: 'FL-002', category: 'Florals', price: 15000, total: 60, out: 22, pending: 8, image: '' },
    { id: 's3', name: 'Pampas Grass Stand', sku: 'FL-003', category: 'Florals', price: 12000, total: 45, out: 20, pending: 5, image: '' },
    { id: 's4', name: 'Floral Arch Backdrop', sku: 'BD-001', category: 'Backdrops', price: 120000, total: 6, out: 3, pending: 1, image: '' },
    { id: 's5', name: 'Gold Round Stand', sku: 'ST-001', category: 'Stands', price: 6000, total: 30, out: 12, pending: 0, image: '' },
    { id: 's6', name: 'Velvet Chiavari Chair', sku: 'SE-001', category: 'Seating', price: 1500, total: 200, out: 120, pending: 30, image: '' },
    { id: 's7', name: 'Gold Charger Plate', sku: 'TW-001', category: 'Tableware', price: 500, total: 300, out: 180, pending: 40, image: '' },
    { id: 's8', name: 'Pillar Candle Set', sku: 'LT-001', category: 'Lighting', price: 4000, total: 24, out: 18, pending: 4, image: '' }
  ];
  const write = a => localStorage.setItem(KEY, JSON.stringify(a));
  const read = () => {
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(r)) return r; } catch (e) {}
    write(seed); return seed.map(x => ({ ...x }));
  };
return {
  list: async () => {
    const response = await fetch(
      "https://topguest-events-api.onrender.com/api/inventory"
    );

    if (!response.ok) throw new Error("Unable to load rental inventory.");

    return await response.json();
  },

  add: async it => {
    const response = await fetch(
      "https://topguest-events-api.onrender.com/api/inventory",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(it)
      }
    );

    if (!response.ok) throw new Error("Unable to add rental item.");

    return await response.json();
  },

  update: async (id, patch) => {
    const response = await fetch(
      `https://topguest-events-api.onrender.com/api/inventory/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }
    );

    if (!response.ok) throw new Error("Unable to update rental item.");

    return await response.json();
  },

  remove: async id => {
    const response = await fetch(
      `https://topguest-events-api.onrender.com/api/inventory/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    if (!response.ok) throw new Error("Unable to delete rental item.");

    return true;
  }
};
})();

const avail = i => Math.max(0, i.total - i.out - i.pending);
const money = n => CURRENCY + Number(n).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Item picture: the uploaded photo, or a brand-matched flower when none exists. */
const PAL = [['#D97A8C', '#E9A6B0', '#F4CDD0', '#F6E3E4'], ['#B9475E', '#D87B8D', '#F1DDC3', '#F6EBDD'], ['#E2C29C', '#F1DDC3', '#FCF2E4', '#F3E7D8']];
function thumb(i) {
  if (i.image) return `<img src="${esc(i.image)}" alt="${esc(i.name)}" loading="lazy">`;
  const h = [...i.category].reduce((s, c) => s + c.charCodeAt(0), 0) % 3, [a, b, c, bg] = PAL[h];
  const petals = [[8, 0, 1, a], [6, 22, .72, b], [5, 0, .46, c]].map(([n, r, s, f]) =>
    [...Array(n)].map((_, k) => `<ellipse cy="-27" rx="15" ry="27" transform="rotate(${k * 360 / n + r}) scale(${s})" fill="${f}"/>`).join('')).join('');
  return `<svg viewBox="-60 -60 120 120" style="background:${bg}" role="img" aria-label="${esc(i.name)}">${petals}<circle r="5" fill="#C9A24B"/></svg>`;
}
