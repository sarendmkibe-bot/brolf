import { useEffect, useState } from 'react';
import { api, errorText } from '../../api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const ACTIONS = {
  pending: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  confirmed: [
    { status: 'shipped', label: 'Mark shipped' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  shipped: [{ status: 'delivered', label: 'Mark delivered' }],
  delivered: [],
  cancelled: [],
};

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    api('/orders/seller')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function changeStatus(id, status) {
    setError('');
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="text-muted">Loading...</p>}
      {!loading && orders.length === 0 && <p className="text-muted">No orders for your products yet.</p>}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  Order #{o.id} · {o.customer_name}
                </p>
                <p className="text-xs text-muted">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>

            <div className="mt-3 divide-y divide-line text-sm">
              {o.items.map((i) => (
                <div key={i.product_id} className="flex justify-between py-2">
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                  <span className="text-muted">{(i.unit_price * i.quantity).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-brand">{o.seller_total.toLocaleString()} ETB</span>
              <div className="flex gap-3 text-sm">
                {ACTIONS[o.status].map((a) => (
                  <button
                    key={a.status}
                    onClick={() => changeStatus(o.id, a.status)}
                    className={
                      a.danger
                        ? 'text-red-400 hover:underline'
                        : 'rounded-lg bg-brand px-4 py-1.5 font-semibold text-ink hover:bg-brand-dark'
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}