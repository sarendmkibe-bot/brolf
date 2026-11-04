import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorText } from '../api.js';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  // Chapa may name the reference differently, so both spellings are accepted
  const txRef = params.get('tx_ref') || params.get('trx_ref');
  const [state, setState] = useState({ status: 'checking' });
  const [tries, setTries] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!txRef) return;
    let cancelled = false;
    api('/payments/verify', { method: 'POST', body: { tx_ref: txRef } })
      .then((d) => {
        if (!cancelled) {
          setState(d);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [txRef, tries]);

  // While the provider has not confirmed yet, ask again every 3 seconds (up to 5 times)
  useEffect(() => {
    if (state.status !== 'pending' || tries >= 5) return;
    const timer = setTimeout(() => setTries((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [state, tries]);

  const box = 'mx-auto max-w-md rounded-2xl border p-8 text-center';
  const ordersLink = (
    <Link
      to="/orders"
      className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-ink hover:bg-brand-dark"
    >
      Go to my orders
    </Link>
  );

  if (!txRef) {
    return (
      <div className={`${box} border-line bg-panel`}>
        <h1 className="text-xl font-bold">No payment reference</h1>
        <p className="mt-2 text-muted">We could not tell which payment you are coming back from.</p>
        {ordersLink}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${box} border-red-500/30 bg-red-500/10`}>
        <h1 className="text-xl font-bold text-red-300">Could not check your payment</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button
          onClick={() => setTries((n) => n + 1)}
          className="mt-4 rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel"
        >
          Try again
        </button>
        <div>{ordersLink}</div>
      </div>
    );
  }

  if (state.status === 'paid') {
    return (
      <div className={`${box} border-brand/40 bg-brand/10`}>
        <h1 className="text-xl font-bold text-brand">Payment received</h1>
        <p className="mt-2 text-muted">Thank you! Your order is now with the seller.</p>
        {ordersLink}
      </div>
    );
  }

  if (state.status === 'refund_due') {
    return (
      <div className={`${box} border-yellow-500/30 bg-yellow-500/10`}>
        <h1 className="text-xl font-bold text-yellow-200">Payment arrived too late</h1>
        <p className="mt-2 text-sm text-muted">
          Your order had already expired, so it was cancelled. The payment is marked for a refund.
        </p>
        {ordersLink}
      </div>
    );
  }

  if (state.status === 'failed') {
    return (
      <div className={`${box} border-red-500/30 bg-red-500/10`}>
        <h1 className="text-xl font-bold text-red-300">Payment failed</h1>
        <p className="mt-2 text-sm text-muted">
          No money was taken. You can try again from your orders page while the order is held.
        </p>
        {ordersLink}
      </div>
    );
  }

  return (
    <div className={`${box} border-line bg-panel`}>
      <h1 className="text-xl font-bold">
        {state.status === 'checking' || tries < 5 ? 'Confirming your payment...' : 'Still waiting'}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {tries >= 5
          ? 'The provider has not confirmed the payment yet. It can take a moment.'
          : 'Please do not close this page.'}
      </p>
      {tries >= 5 && (
        <button
          onClick={() => setTries(0)}
          className="mt-4 rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel2"
        >
          Check again
        </button>
      )}
      <div>{ordersLink}</div>
    </div>
  );
}