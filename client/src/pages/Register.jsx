import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorText } from '../api.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-lg border border-line bg-ink px-4 py-2.5 outline-none focus:border-brand';

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-line bg-panel p-6">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Shop as a customer or sell as a seller.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input required value={form.name} onChange={update('name')} placeholder="Full name" className={input} />
        <input type="email" required value={form.email} onChange={update('email')} placeholder="Email" className={input} />
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          placeholder="Password (8+ characters)"
          className={input}
        />
        <select value={form.role} onChange={update('role')} className={input}>
          <option value="customer">I want to buy</option>
          <option value="seller">I want to sell</option>
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-ink hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Creating...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-brand">
          Log in
        </Link>
      </p>
    </div>
  );
}