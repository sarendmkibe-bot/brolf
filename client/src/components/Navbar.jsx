import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-brand">
          MarketHub
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-muted hover:text-fg">
            Shop
          </Link>

          {user ? (
            <>
              <span className="hidden text-muted sm:inline">
                {user.name} · {user.role}
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-panel"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-muted hover:text-fg">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-ink hover:bg-brand-dark"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}