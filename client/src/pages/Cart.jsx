import { Link } from 'react-router-dom';
import { useCart } from '../CartContext.jsx';

export default function Cart() {
  const { items, setQuantity, remove, total, count } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted">Find something you like in the shop.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-ink hover:bg-brand-dark"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Your cart</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((i) => (
            <div key={i.product_id} className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-panel2 text-2xl font-bold text-brand/40">
                {i.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${i.product_id}`} className="font-semibold hover:text-brand">
                  {i.name}
                </Link>
                <p className="text-sm text-muted">{i.price} ETB each</p>
              </div>
              <div className="flex items-center rounded-lg border border-line">
                <button onClick={() => setQuantity(i.product_id, i.quantity - 1)} className="px-3 py-1.5 hover:bg-panel2">
                  −
                </button>
                <span className="w-8 text-center text-sm">{i.quantity}</span>
                <button onClick={() => setQuantity(i.product_id, i.quantity + 1)} className="px-3 py-1.5 hover:bg-panel2">
                  +
                </button>
              </div>
              <p className="w-24 text-right font-semibold">{(i.price * i.quantity).toLocaleString()} ETB</p>
              <button onClick={() => remove(i.product_id)} className="text-sm text-red-400 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm text-muted">
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{total.toLocaleString()} ETB</span>
          </div>
          <Link
            to="/checkout"
            className="mt-5 block rounded-lg bg-brand py-2.5 text-center font-semibold text-ink hover:bg-brand-dark"
          >
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}