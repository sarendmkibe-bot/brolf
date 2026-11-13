
import { useEffect, useState } from 'react';
import { api } from '../../api.js';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#22c55e', '#38bdf8', '#a78bfa', '#f59e0b'];

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateRange(period) {
  const today = new Date();
  const endDate = getLocalDate(today);
  const start = new Date(today);

  if (period === 'today') {
    return { startDate: endDate, endDate };
  }

  if (period === '7days') {
    start.setDate(today.getDate() - 6);
  }

  if (period === 'month') {
    start.setDate(1);
  }

  if (period === 'year') {
    start.setMonth(0, 1);
  }

  return {
    startDate: getLocalDate(start),
    endDate,
  };
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-panel/80 backdrop-blur-sm p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand">{value}</p>
    </div>
  );
}

function Bar({ label, value, max, suffix = '' }) {
  const width =
    value > 0 && max > 0
      ? Math.max(4, Math.round((value / max) * 100))
      : 0;

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="text-muted">
          {Number(value).toLocaleString()}
          {suffix}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-panel2/80">
        <div
          className="h-2.5 rounded-full bg-brand"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminOverview({ onViewAllOrders }) {
  const [report, setReport] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
   // Store the 5 most recent orders
  const [recentOrders, setRecentOrders] = useState([]);

  const [period, setPeriod] = useState('7days');
  const [customStart, setCustomStart] = useState(getLocalDate());
  const [customEnd, setCustomEnd] = useState(getLocalDate());

  const [appliedRange, setAppliedRange] = useState(
    getDateRange('7days')
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          startDate: appliedRange.startDate,
          endDate: appliedRange.endDate,
        });

       const [r, u, o] = await Promise.all([
  api(`/admin/reports/sales?${params.toString()}`),
  api('/admin/users'),
  api('/admin/orders'),
]);

       if (!cancelled) {
  setReport(r);
  setUserCount(u.users.length);
  setRecentOrders(o.orders.slice(0, 5));
}
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [appliedRange]);

  function handlePeriodChange(value) {
    setPeriod(value);

    if (value !== 'custom') {
      setAppliedRange(getDateRange(value));
    }
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) {
      setError('Please select both dates.');
      return;
    }

    if (customStart > customEnd) {
      setError('Start date cannot be after end date.');
      return;
    }

    setAppliedRange({
      startDate: customStart,
      endDate: customEnd,
    });
  }

  if (error && !report) {
    return <p className="text-red-400">{error}</p>;
  }

  const maxStatus = Math.max(
    0,
    ...(report?.orders_by_status || []).map((s) => s.count)
  );

  const maxUnits = Math.max(
    0,
    ...(report?.top_products || []).map((p) => p.units_sold)
  );

  const revenueData = (report?.revenue_by_day || []).map((item) => ({
    date: new Date(`${item.day}T12:00:00`).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    }),
    revenue: Number(item.revenue || 0),
  }));

  const paymentData = (report?.payments_by_method || []).map((item) => ({
    name: item.method,
    value: Number(item.amount || 0),
  }));

  return (
    <div>
      {/* Date filters */}
      <div className="mb-6 rounded-xl border border-line bg-panel/80 backdrop-blur-sm p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-lg">Sales Overview</h2>
          <p className="text-sm text-muted">
            Filter dashboard data by date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Today', value: 'today' },
            { label: 'Last 7 days', value: '7days' },
            { label: 'This month', value: 'month' },
            { label: 'This year', value: 'year' },
            { label: 'Custom range', value: 'custom' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                period === option.value
                  ? 'border-brand bg-brand text-ink font-semibold'
                  : 'border-line bg-panel2 text-fg hover:border-brand'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted">
                Start date
              </label>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-line bg-panel2 p-2 text-fg"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted">
                End date
              </label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={getLocalDate()}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-line bg-panel2 p-2 text-fg"
              />
            </div>

            <button
              onClick={applyCustomRange}
              className="rounded-lg bg-brand px-5 py-2 font-semibold text-ink hover:bg-brand-dark"
            >
              Apply dates
            </button>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          Showing {appliedRange.startDate} to {appliedRange.endDate}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      {loading && (
        <p className="mb-4 text-sm text-muted">Updating dashboard...</p>
      )}

      {report && (
        <>
          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Orders (not cancelled)"
              value={report.totals.orders}
            />

            <Stat
              label="Revenue"
              value={`${Number(report.totals.revenue).toLocaleString()} ETB`}
            />

            <Stat label="Users (all time)" value={userCount} />
          </div>

          {/* Charts */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel/80 backdrop-blur-sm p-5">
              <h2 className="mb-5 font-semibold">Revenue Overview</h2>

              {revenueData.length === 0 ? (
                <p className="text-sm text-muted">No revenue data available.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid stroke="#243630" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#8aa399" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#8aa399" tick={{ fontSize: 12 }} />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121c18',
                          border: '1px solid #243630',
                          borderRadius: '8px',
                          color: '#e8f1ec',
                        }}
                        formatter={(value) => [
                          `${Number(value).toLocaleString()} ETB`,
                          'Revenue',
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 4 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-panel/80 backdrop-blur-sm p-5">
              <h2 className="mb-5 font-semibold">Payments by Method</h2>

              {paymentData.length === 0 ? (
                <p className="text-sm text-muted">No payment data available.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121c18',
                          border: '1px solid #243630',
                          borderRadius: '8px',
                          color: '#e8f1ec',
                        }}
                        formatter={(value) => [
                          `${Number(value).toLocaleString()} ETB`,
                          'Amount',
                        ]}
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          {/* Recent Orders */}
          <div className="mt-6 rounded-xl border border-line bg-panel/80 backdrop-blur-sm p-5">
      <div className="mb-4 flex items-center justify-between">
  <h2 className="font-semibold">Recent Orders</h2>

  <button
    onClick={onViewAllOrders}
    className="text-sm font-semibold text-brand hover:text-green-400 transition"
  >
    View All Orders →
  </button>
</div>

            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-line">
                        <td className="p-3">#{order.id}</td>
                        <td className="p-3">{order.customer_name}</td>
                        <td className="p-3">
                          {Number(order.total).toLocaleString()} ETB
                        </td>
                        <td className="p-3 text-muted">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                       <td className="p-3">
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
      order.status === 'completed'
        ? 'bg-green-500/15 text-green-400'
        : order.status === 'pending'
        ? 'bg-yellow-500/15 text-yellow-400'
        : order.status === 'cancelled'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-slate-500/15 text-slate-400'
    }`}
  >
    {order.status}
  </span>
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
