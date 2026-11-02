import { useEffect, useState } from 'react';
import { api, errorText } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api('/admin/users')
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function toggle(u) {
    setError('');
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { is_active: !u.is_active } });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-muted">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <span className={u.is_active ? 'text-brand' : 'text-red-400'}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {u.id !== me.id && (
                    <button onClick={() => toggle(u)} className="text-red-400 hover:underline">
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}