import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, errorText } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    api('/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function cancel(id) {
    setError('');
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">My orders</h1>

      {location.state?.placed && (
        <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 p-3 text-sm text-brand">
          Your order was placed. Thank you!
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="mt-4 text-muted">Loading...</p>}
      {!loading && orders.length === 0 && <p className="mt-4 text-muted">You have no orders yet.</p>}

      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Order #{o.id}</p>
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

            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-brand">{o.total.toLocaleString()} ETB</span>
              {o.status === 'pending' && (
                <button onClick={() => cancel(o.id)} className="text-sm text-red-400 hover:underline">
                  Cancel order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}