import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, errorText } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const PAYMENT_LABELS = {
  paid: 'Paid',
  simulated: 'Demo payment',
  pending: 'Unpaid',
  refund_due: 'Refund due',
  expired: 'Payment expired',
  failed: 'Payment failed',
  cancelled: 'Cancelled',
};

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api('/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function cancel(id) {
    setError('');
    setMessage('');
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function checkPayment(txRef) {
    setError('');
    setMessage('');
    try {
      const d = await api('/payments/verify', { method: 'POST', body: { tx_ref: txRef } });
      setMessage(
        d.status === 'paid'
          ? 'Payment confirmed. Thank you!'
          : 'The payment has not been confirmed yet.'
      );
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  // Customers can cancel unpaid orders; with demo payments they can also cancel pending ones
  const canCancel = (o) =>
    o.status === 'awaiting_payment' || (o.status === 'pending' && o.payment?.method !== 'chapa');

  return (
    <div>
      <h1 className="text-2xl font-bold">My orders</h1>

      {location.state?.placed && (
        <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 p-3 text-sm text-brand">
          Your order was placed. Thank you!
        </p>
      )}
      {message && <p className="mt-4 text-sm text-brand">{message}</p>}
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
              <div className="flex items-center gap-2">
                {o.payment && (
                  <span className="text-xs text-muted">
                    {PAYMENT_LABELS[o.payment.status] || o.payment.status}
                  </span>
                )}
                <StatusBadge status={o.status} />
              </div>
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

            {o.status === 'awaiting_payment' && o.payment?.method === 'chapa' && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm">
                <span className="text-orange-200">Waiting for payment.</span>
                {o.payment.checkout_url && (
                  <a
                    href={o.payment.checkout_url}
                    className="rounded-lg bg-brand px-4 py-1.5 font-semibold text-ink hover:bg-brand-dark"
                  >
                    Pay now
                  </a>
                )}
                <button
                  onClick={() => checkPayment(o.payment.tx_ref)}
                  className="rounded-lg border border-line px-4 py-1.5 hover:bg-panel2"
                >
                  Check payment
                </button>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-brand">{o.total.toLocaleString()} ETB</span>
              {canCancel(o) && (
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