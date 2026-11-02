import { useState } from 'react';
import AdminOverview from './AdminOverview.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminOrders from './AdminOrders.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'orders', label: 'Orders' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin dashboard</h1>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === t.id ? 'bg-brand text-ink' : 'border border-line text-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <AdminOverview />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'orders' && <AdminOrders />}
      </div>
    </div>
  );
}