import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ProductRow from './ProductRow.jsx';

// Other products from the same category first; other products fill the rest
export default function RelatedProducts({ product }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let related = [];
        if (product.category_id) {
          const d = await api(`/products?category=${product.category_id}&limit=12`);
          related = d.products.filter((p) => p.id !== product.id);
        }
        if (related.length < 4) {
          const d = await api('/products?limit=12');
          const seen = new Set(related.map((p) => p.id));
          seen.add(product.id);
          related = [...related, ...d.products.filter((p) => !seen.has(p.id))];
        }
        if (!cancelled) setItems(related.slice(0, 8));
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [product.id, product.category_id]);

  return <ProductRow title="Related products" products={items} />;
}