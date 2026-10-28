import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useCart } from '../CartContext.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
    api(`/products/${id}`)
      .then((d) => {
        setProduct(d.product);
        setQty(1);
        setError('');
      })
      .catch((e) => setError(e.status === 404 ? 'Product not found.' : e.message));
  }, [id]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!product) return <p className="text-muted">Loading...</p>;

  const canBuy = !user || user.role === 'customer';
  const outOfStock = product.stock === 0;

  function handleAdd() {
    add(product, qty);
    setAdded(true);
  }

  return (
    <div>
      <Link to="/" className="text-sm text-muted hover:text-fg">
        ← Back to shop
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-80 w-full rounded-2xl object-cover" />
        ) : (
          <div className="flex h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-panel2 to-ink text-7xl font-bold text-brand/40">
            {product.name.charAt(0)}
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {product.category_name || 'Uncategorized'}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">Sold by {product.seller_name}</p>
          <p className="mt-4 text-3xl font-bold text-brand">{product.price} ETB</p>
          <p className="mt-4 whitespace-pre-line text-muted">
            {product.description || 'No description yet.'}
          </p>
          <p className={`mt-4 text-sm ${outOfStock ? 'text-red-400' : 'text-muted'}`}>
            {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </p>

          {canBuy ? (
            !outOfStock && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center rounded-lg border border-line">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-panel">
                    −
                  </button>
                  <span className="w-10 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="px-3 py-2 hover:bg-panel"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-ink hover:bg-brand-dark"
                >
                  Add to cart
                </button>
              </div>
            )
          ) : (
            <p className="mt-6 text-sm text-muted">Log in with a customer account to buy products.</p>
          )}

          {added && (
            <p className="mt-4 text-sm text-brand">
              Added to your cart.{' '}
              <Link to="/cart" className="underline">
                View cart
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}