import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useCart } from '../CartContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import PriceTag from '../components/PriceTag.jsx';
import RelatedProducts from '../components/RelatedProducts.jsx';

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
    window.scrollTo({ top: 0 });
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
        <ProductImage
          key={product.id}
          product={product}
          className="h-80 w-full rounded-2xl"
          iconClass="text-8xl"
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {product.category_name || 'Uncategorized'}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">Sold by {product.seller_name}</p>

          <div className="mt-4">
            <PriceTag
              price={product.price}
              original={product.original_price}
              size="text-3xl"
              showBadge
            />
          </div>

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

      <RelatedProducts product={product} />
    </div>
  );
}