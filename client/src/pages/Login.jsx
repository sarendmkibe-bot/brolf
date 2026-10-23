import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorText } from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-line bg-panel p-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to your MarketHub account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-line bg-ink px-4 py-2.5 outline-none focus:border-brand"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-line bg-ink px-4 py-2.5 outline-none focus:border-brand"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-ink hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="text-brand">
          Create an account
        </Link>
      </p>
    </div>
  );
}