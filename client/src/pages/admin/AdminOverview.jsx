import { useEffect, useState } from 'react';
import { api } from '../../api.js';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand">{value}</p>
    </div>
  );
}

function Bar({ label, value, max, suffix = '' }) {
  const width = value > 0 && max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="text-muted">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-panel2">
        <div className="h-2.5 rounded-full bg-brand" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [report, setReport] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/admin/reports/sales'), api('/admin/users')])
      .then(([r, u]) => {
        setReport(r);
        setUserCount(u.users.length);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!report) return <p className="text-muted">Loading...</p>;

  const maxStatus = Math.max(0, ...report.orders_by_status.map((s) => s.count));
  const maxUnits = Math.max(0, ...report.top_products.map((p) => p.units_sold));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders (not cancelled)" value={report.totals.orders} />
        <Stat label="Revenue" value={`${report.totals.revenue.toLocaleString()} ETB`} />
        <Stat label="Users" value={userCount} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 font-semibold">Orders by status</h2>
          {report.orders_by_status.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
          {report.orders_by_status.map((s) => (
            <Bar key={s.status} label={s.status} value={s.count} max={maxStatus} />
          ))}
        </div>

        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 font-semibold">Top products (units sold)</h2>
          {report.top_products.length === 0 && <p className="text-sm text-muted">No sales yet.</p>}
          {report.top_products.map((p) => (
            <Bar key={p.id} label={p.name} value={p.units_sold} max={maxUnits} suffix=" sold" />
          ))}
        </div>
      </div>
    </div>
  );
}