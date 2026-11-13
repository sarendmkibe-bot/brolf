import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorText } from '../api.js';
import { useCart } from '../CartContext.jsx';

const REGIONS = [
  'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela', 'Harari',
  'Oromia', 'Sidama', 'Somali', 'South Ethiopia', 'South West Ethiopia', 'Tigray',
];

// Display estimate only. The server recalculates the fee that is actually charged.
const shippingFee = (region, subtotal) =>
  !region || subtotal >= 2000 ? 0 : region === 'Addis Ababa' ? 80 : 150;
const etb = (n) => `${Math.round(n).toLocaleString()} ETB`;

function loadAddresses() {
  try {
    return JSON.parse(localStorage.getItem('mh_addresses') || '[]');
  } catch {
    return [];
  }
}

const inputCls =
  'w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm outline-none focus:border-brand';

function AddressModal({ onSave, onClose }) {
  const [f, setF] = useState({
    name: '', phone: '', street: '', unit: '', region: 'Sidama', city: '', zip: '', isDefault: true,
  });
  const [err, setErr] = useState({});
  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function submit() {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter the name of the person receiving the order.';
    if (!/^[79]\d{8}$/.test(f.phone.trim())) e.phone = 'Enter 9 digits, for example 912864228.';
    if (f.street.trim().length < 2) e.street = 'Enter a street, house or kebele.';
    if (f.city.trim().length < 2) e.city = 'Enter your city or town.';
    setErr(e);
    if (Object.keys(e).length === 0) onSave({ ...f, id: Date.now() });
  }

  const field = (k, label, extra = {}) => (
    <label className="block text-xs text-muted">
      {label}
      <input className={`${inputCls} mt-1`} value={f[k]} onChange={set(k)} {...extra} />
      {err[k] && <span className="mt-1 block text-red-400">{err[k]}</span>}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add new address"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl border border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add new address</h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl text-muted">
            ×
          </button>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold">Contact information</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('name', 'Contact name*')}
          {field('phone', 'Mobile number* (+251)', { inputMode: 'numeric', maxLength: 9 })}
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold">Address</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('street', 'Street, house or kebele*')}
          {field('unit', 'Apartment, landmark (optional)')}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-muted">
            Region*
            <select className={`${inputCls} mt-1`} value={f.region} onChange={set('region')}>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {field('city', 'City*')}
          {field('zip', 'Postal code (optional)')}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} />
          Set as default shipping address
        </label>

        <div className="mt-5 flex gap-3">
          <button
            onClick={submit}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-ink hover:bg-brand-dark"
          >
            Save address
          </button>
          <button onClick={onClose} className="rounded-lg border border-line px-5 py-2.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, total: subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('simulated');
  const [method, setMethod] = useState('online'); // 'online' | 'cod'
  const [addresses, setAddresses] = useState(loadAddresses);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api('/config')
      .then((d) => setMode(d.paymentMode))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) return;
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    if (def) setSelected(def.id);
  }, [addresses, selected]);

  const address = addresses.find((a) => a.id === selected);
  const fee = useMemo(() => shippingFee(address?.region, subtotal), [address, subtotal]);
  const total = subtotal + fee;

  function saveAddress(a) {
    const next = [...addresses.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a];
    setAddresses(next);
    setSelected(a.id);
    setShowModal(false);
    try {
      localStorage.setItem('mh_addresses', JSON.stringify(next));
    } catch {
      /* storage unavailable, the address still works for this visit */
    }
  }

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
    if (!address) {
      setError('Add a shipping address before placing your order.');
      return;
    }
    setBusy(true);
    setError('');
    let leaving = false;
    try {
      const data = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          payment_method: method,
          shipping: {
            name: address.name,
            phone: address.phone,
            street: address.street,
            unit: address.unit,
            region: address.region,
            city: address.city,
            zip: address.zip,
          },
        },
      });
      clear();

      if (data.payment?.checkout_url) {
        leaving = true;
        window.location.href = data.payment.checkout_url; // customer pays on Chapa's page
        return;
      }
      navigate('/orders', { state: { placed: true } });
    } catch (err) {
      setError(errorText(err));
    } finally {
      if (!leaving) setBusy(false);
    }
  }

  const onlineTitle = mode === 'chapa' ? 'Pay online with Chapa' : 'Online payment (demo)';
  const onlineText =
    mode === 'chapa'
      ? "Telebirr, CBE Birr, bank transfer or card. You finish paying on Chapa's secure page. Your items are held for 30 minutes."
      : 'Simulated payment. No money is taken and no card details are collected.';
  const buttonText = busy
    ? 'Please wait...'
    : method === 'online' && mode === 'chapa'
      ? 'Pay with Chapa'
      : 'Place order';

  const card = 'rounded-xl border border-line bg-panel p-5';

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className={card}>
            <h2 className="mb-3 font-semibold">Shipping address</h2>
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`mb-2 flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  selected === a.id ? 'border-brand bg-brand/10' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selected === a.id}
                  onChange={() => setSelected(a.id)}
                />
                <div>
                  <b>{a.name}</b> <span className="text-muted">+251 {a.phone}</span>
                  <p className="text-muted">
                    {[a.street, a.unit, a.city, a.region].filter(Boolean).join(', ')}
                  </p>
                </div>
              </label>
            ))}
            <button onClick={() => setShowModal(true)} className="text-sm text-brand">
              + Add new address
            </button>
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">Payment method</h2>
            {[
              { id: 'online', title: onlineTitle, text: onlineText },
              { id: 'cod', title: 'Cash on delivery', text: 'Pay in cash when your order arrives.' },
            ].map((m) => (
              <label
                key={m.id}
                className={`mb-2 flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  method === m.id ? 'border-brand bg-brand/10' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                />
                <div>
                  <b>{m.title}</b>
                  <p className="text-muted">{m.text}</p>
                </div>
              </label>
            ))}
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">Review items</h2>
            {items.map((i) => (
              <div
                key={i.product_id}
                className="flex items-center gap-3 border-b border-line py-3 text-sm last:border-0"
              >
                {i.image_url ? (
                  <img src={i.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-lg bg-panel2 font-bold text-brand">
                    {i.name?.[0]}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-muted">Quantity: {i.quantity}</p>
                </div>
                <span className="font-semibold text-brand">{etb(i.price * i.quantity)}</span>
              </div>
            ))}
          </section>
        </div>

        <aside className={`${card} h-fit`}>
          <h2 className="mb-3 font-semibold">Summary</h2>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted">Subtotal</span>
            <span>{etb(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted">Shipping fee</span>
            <span>{!address ? 'Add an address' : fee === 0 ? 'Free' : etb(fee)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-3 text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{etb(total)}</span>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={placeOrder}
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-brand py-3 font-semibold text-ink hover:bg-brand-dark disabled:opacity-60"
          >
            {buttonText}
          </button>
          <p className="mt-3 text-xs text-muted">
            MarketHub never sees or stores your card or mobile-money details.
          </p>
        </aside>
      </div>

      {showModal && <AddressModal onSave={saveAddress} onClose={() => setShowModal(false)} />}
    </div>
  );
}