import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import PriceTag, { discountPercent } from './PriceTag.jsx';

export default function ProductCard({ product, index = 0 }) {
  const outOfStock = product.stock === 0;
  const off = discountPercent(product.price, product.original_price);

  return (
    <Link
      to={`/products/${product.id}`}
      className="card-in group block overflow-hidden rounded-xl border border-line bg-panel transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/10"
      style={{ animationDelay: `${Math.min(index, 11) * 70}ms` }}
    >
      <div className="relative h-44 overflow-hidden">
        <ProductImage
          product={product}
          className="h-full w-full transition duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            -{off}%
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          {product.category_name || 'Uncategorized'}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold">{product.name}</h3>
        <p className="mt-1 text-xs text-muted">by {product.seller_name}</p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <PriceTag price={product.price} original={product.original_price} />
          <span className={`shrink-0 text-xs ${outOfStock ? 'text-red-400' : 'text-muted'}`}>
            {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
      </div>
    </Link>
  );
}