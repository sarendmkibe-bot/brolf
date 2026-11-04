import { useEffect, useState } from 'react';
import { api, errorText } from '../../api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const ACTIONS = {
  awaiting_payment: [
    { status: 'cancelled', label: 'Cancel', danger: true }],
  pending: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  confirmed: [
    { status: 'shipped', label: 'Ship' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  shipped: [{ status: 'delivered', label: 'Deliver' }],
  delivered: [],
  cancelled: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api('/admin/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
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
      {orders.length === 0 && !error && <p className="text-muted">No orders yet.</p>}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3">#{o.id}</td>
                  <td className="p-3">
                    {o.customer_name}
                    <span className="block text-xs text-muted">{o.customer_email}</span>
                  </td>
                  <td className="p-3 text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold text-brand">{o.total.toLocaleString()} ETB</td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="space-x-3 p-3 text-right">
                    {ACTIONS[o.status].map((a) => (
                      <button
                        key={a.status}
                        onClick={() => changeStatus(o.id, a.status)}
                        className={a.danger ? 'text-red-400 hover:underline' : 'text-brand hover:underline'}
                      >
                        {a.label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}