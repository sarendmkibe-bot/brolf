import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorText } from '../api.js';
import { useCart } from '../CartContext.jsx';

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    return (
      <p className="text-muted">
        Your cart is empty.{' '}
        <Link to="/" className="text-brand">
          Go shopping
        </Link>
      </p>
    );
  }

  async function placeOrder() {
    setBusy(true);
    setError('');
    try {
      await api('/orders', {
        method: 'POST',
        body: { items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) },
      });
      clear();
      navigate('/orders', { state: { placed: true } });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="mt-6 rounded-xl border border-line bg-panel p-5">
        {items.map((i) => (
          <div key={i.product_id} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{(i.price * i.quantity).toLocaleString()} ETB</span>
          </div>
        ))}
        <div className="mt-4 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-brand">{total.toLocaleString()} ETB</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        Demo payment: this order is recorded with a simulated payment. No money is taken and no
        card details are collected.
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        onClick={placeOrder}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-brand py-3 font-semibold text-ink hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? 'Placing order...' : 'Place order'}
      </button>
    </div>
  );
}