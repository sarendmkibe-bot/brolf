import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const outOfStock = product.stock === 0;

  return (
    <Link
      to={`/products/${product.id}`}
      className="block overflow-hidden rounded-xl border border-line bg-panel transition hover:border-brand/50"
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-panel2 to-ink text-4xl font-bold text-brand/40">
          {product.name.charAt(0)}
        </div>
      )}

      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          {product.category_name || 'Uncategorized'}
        </p>
        <h3 className="mt-1 font-semibold">{product.name}</h3>
        <p className="mt-1 text-xs text-muted">by {product.seller_name}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-brand">{product.price} ETB</span>
          <span className={`text-xs ${outOfStock ? 'text-red-400' : 'text-muted'}`}>
            {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
      </div>
    </Link>
  );
}