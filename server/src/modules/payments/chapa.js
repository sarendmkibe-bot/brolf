import crypto from 'node:crypto';

const BASE = 'https://api.chapa.co/v1';

// "simulated" (default) or "chapa". Set PAYMENT_MODE in server/.env.
export const paymentMode = () => (process.env.PAYMENT_MODE === 'chapa' ? 'chapa' : 'simulated');

export const newTxRef = () => `mh-${crypto.randomBytes(8).toString('hex')}`;

async function chapaFetch(path, options = {}) {
  const key = process.env.CHAPA_SECRET_KEY;
  if (!key) throw new Error('CHAPA_SECRET_KEY is not set');

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status !== 'success') {
    const message =
      typeof data.message === 'string' ? data.message : JSON.stringify(data.message ?? res.status);
    const err = new Error(`Chapa: ${message}`);
    err.fromProvider = true; // Chapa answered, as opposed to a network failure
    throw err;
  }
  return data;
}

// Returns the page where the customer pays
export async function initializePayment({ txRef, amount, email, name, orderId }) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  const data = await chapaFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      amount: String(amount),
      currency: 'ETB',
      email,
      first_name: first,
      last_name: rest.join(' ') || first,
      tx_ref: txRef,
      return_url: `${clientUrl}/payment/return?tx_ref=${encodeURIComponent(txRef)}`,
      customization: { title: 'MarketHub', description: `Order ${orderId}` },
    }),
  });
  return data.data.checkout_url;
}

// Ask Chapa directly whether a transaction was paid. Never trust the browser for this.
export async function verifyPayment(txRef) {
  const data = await chapaFetch(`/transaction/verify/${encodeURIComponent(txRef)}`);
  return data.data;
}