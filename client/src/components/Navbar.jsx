
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useCart } from '../CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const isBuyer = !user || user.role === 'customer';

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-brand">
          MarketHub
        </Link>

        <nav className="flex items-center gap-4 text-sm">

          {/* Shop */}
          <Link to="/" className="text-muted hover:text-sky-300">
            Shop
          </Link>

          {/* Cart */}
          {isBuyer && (
            <Link to="/cart" className="text-muted hover:text-sky-300">
              Cart
              {count > 0 && (
                <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink">
                  {count}
                </span>
              )}
            </Link>
          )}

          {/* Account Dropdown */}
          <div className="relative">

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-muted hover:text-sky-300 hover:bg-panel/80"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-panel shadow-xl">

                {user ? (
                  <>
                    <div className="border-b border-line px-4 py-3">
                      <p className="font-semibold text-fg">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted">
                        {user.role}
                      </p>
                    </div>

                    {user.role === 'customer' && (
                      <Link
                        to="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-3 text-muted hover:bg-ink hover:text-green-300"
                      >
                        My orders
                      </Link>
                    )}

                    {user.role === 'seller' && (
                      <Link
                        to="/seller"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-3 text-muted hover:bg-ink hover:text-sky-300"
                      >
                        Seller dashboard
                      </Link>
                    )}

                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-3 text-muted hover:bg-ink hover:text-sky-300"
                      >
                        Admin dashboard
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full border-t border-line px-4 py-3 text-left text-red-400 hover:bg-ink"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-muted hover:bg-ink hover:text-green-300"
                    >
                      Sign in
                    </Link>

                    <Link
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="block border-t border-line px-4 py-3 text-muted hover:bg-ink hover:text-green-300"
                    >
                      Sign up
                    </Link>
                  </>
                )}

              </div>
            )}
          </div>

        </nav>
      </div>
    </header>
  );
}
