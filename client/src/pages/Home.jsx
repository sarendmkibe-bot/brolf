import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

const LIMIT = 12;

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  // Reload products when the search, category or page changes (with a short delay while typing)
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);

      api(`/products?${params}`)
        .then((d) => {
          setProducts(d.products);
          setTotal(d.total);
          setError('');
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, category, page]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <section className="rounded-2xl border border-line bg-gradient-to-br from-panel2 to-panel p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Shop local, <span className="text-brand">buy better.</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Coffee, textiles, handicrafts and more from sellers across Ethiopia.
        </p>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products..."
          className="mt-5 w-full max-w-md rounded-lg border border-line bg-ink px-4 py-2.5 outline-none focus:border-brand"
        />
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ id: '', name: 'All' }, ...categories].map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              category === c.id
                ? 'border-brand bg-brand text-ink'
                : 'border-line text-muted hover:text-fg'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-muted">Loading...</p>}
      {!loading && !error && products.length === 0 && (
        <p className="mt-6 text-muted">No products found.</p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-line px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-line px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}