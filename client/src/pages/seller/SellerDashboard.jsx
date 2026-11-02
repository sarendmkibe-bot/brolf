import { useState } from 'react';
import SellerProducts from './SellerProducts.jsx';
import SellerOrders from './SellerOrders.jsx';

export default function SellerDashboard() {
  const [tab, setTab] = useState('products');

  const tabClass = (name) =>
    `rounded-lg px-4 py-2 text-sm font-semibold ${
      tab === name ? 'bg-brand text-ink' : 'border border-line text-muted hover:text-fg'
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Seller dashboard</h1>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab('products')} className={tabClass('products')}>
          My products
        </button>
        <button onClick={() => setTab('orders')} className={tabClass('orders')}>
          Orders
        </button>
      </div>

      <div className="mt-6">{tab === 'products' ? <SellerProducts /> : <SellerOrders />}</div>
    </div>
  );
}