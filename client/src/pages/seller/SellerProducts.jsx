import { useEffect, useState } from 'react';
import { api, errorText } from '../../api.js';

const EMPTY = { name: '', description: '', price: '', stock: '', category_id: '', image_url: '' };
const input =
  'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-brand';

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api('/products/mine')
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    api('/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const body = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
    };
    if (form.category_id) body.category_id = Number(form.category_id);
    if (form.image_url.trim()) body.image_url = form.image_url.trim();

    try {
      if (editingId) {
        await api(`/products/${editingId}`, { method: 'PUT', body });
        setMessage('Product updated.');
      } else {
        await api('/products', { method: 'POST', body });
        setMessage('Product added.');
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setMessage('');
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock),
      category_id: p.category_id ? String(p.category_id) : '',
      image_url: p.image_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function toggleActive(p) {
    setError('');
    try {
      if (p.is_active) {
        await api(`/products/${p.id}`, { method: 'DELETE' });
      } else {
        await api(`/products/${p.id}`, { method: 'PUT', body: { is_active: true } });
      }
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-semibold">{editingId ? 'Edit product' : 'Add a product'}</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Product name" value={form.name} onChange={update('name')} className={input} />
          <select value={form.category_id} onChange={update('category_id')} className={input}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price (ETB)"
            value={form.price}
            onChange={update('price')}
            className={input}
          />
          <input
            required
            type="number"
            min="0"
            step="1"
            placeholder="Stock"
            value={form.stock}
            onChange={update('stock')}
            className={input}
          />
          <input
            type="url"
            placeholder="Image URL (optional)"
            value={form.image_url}
            onChange={update('image_url')}
            className={`${input} sm:col-span-2`}
          />
          <textarea
            rows="3"
            placeholder="Description"
            value={form.description}
            onChange={update('description')}
            className={`${input} sm:col-span-2`}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-3 text-sm text-brand">{message}</p>}

        <div className="mt-4 flex gap-3">
          <button
            disabled={busy}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-ink hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-line px-5 py-2 text-sm hover:bg-panel2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {products.length === 0 && <p className="text-muted">You have not added any products yet.</p>}

        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted">
                {p.category_name || 'Uncategorized'} · {p.price} ETB
              </p>
              <div className="mt-1 flex gap-2 text-xs">
                <span className={p.is_active ? 'text-brand' : 'text-red-400'}>
                  {p.is_active ? 'Visible in shop' : 'Hidden'}
                </span>
                {p.stock <= 5 && p.stock > 0 && (
                  <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-yellow-300">Low stock</span>
                )}
                {p.stock === 0 && (
                  <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-300">Out of stock</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted">{p.stock} in stock</span>
              <button onClick={() => startEdit(p)} className="text-brand hover:underline">
                Edit
              </button>
              <button onClick={() => toggleActive(p)} className="text-red-400 hover:underline">
                {p.is_active ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}