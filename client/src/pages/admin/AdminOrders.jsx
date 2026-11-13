
import { useEffect, useState } from 'react';
import { api, errorText } from '../../api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const ACTIONS = {
  pending: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  confirmed: [
    { status: 'shipped', label: 'Ship' },
    { status: 'cancelled', label: 'Cancel', danger: true },
  ],
  shipped: [{ status: 'delivered', label: 'Deliver' }],
  delivered: [],
  cancelled: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  function load() {
    api('/admin/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  // Search and filter orders
  const filteredOrders = orders.filter((order) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      String(order.id).includes(searchTerm) ||
      (order.customer_name || '').toLowerCase().includes(searchTerm) ||
      (order.customer_email || '').toLowerCase().includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function changeStatus(id, status) {
    setError('');

    try {
      await api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });

      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      {/* Search and Status Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by order ID, customer name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-line bg-panel p-3 text-sm text-fg outline-none focus:border-brand sm:flex-1"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-line bg-panel p-3 text-sm text-fg outline-none focus:border-brand"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={clearFilters}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:border-brand hover:text-brand"
        >
          Clear
        </button>
      </div>

      {/* Empty Orders */}
      {orders.length === 0 && !error && (
        <p className="text-muted">No orders yet.</p>
      )}

      {/* No Matching Orders */}
      {orders.length > 0 && filteredOrders.length === 0 && (
        <p className="text-muted">No matching orders found.</p>
      )}

      {/* Orders Table */}
      {filteredOrders.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>

          <div className="overflow-x-auto rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-line last:border-0 hover:bg-panel2/50"
                  >
                    <td className="p-3">#{o.id}</td>

                    <td className="p-3">
                      {o.customer_name}
                      <span className="block text-xs text-muted">
                        {o.customer_email}
                      </span>
                    </td>

                    <td className="p-3 text-muted">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-3 font-semibold text-brand">
                      {Number(o.total).toLocaleString()} ETB
                    </td>

                    <td className="p-3">
                      <StatusBadge status={o.status} />
                    </td>

                    <td className="space-x-3 p-3 text-right">
                      {ACTIONS[o.status]?.map((a) => (
                        <button
                          key={a.status}
                          onClick={() => changeStatus(o.id, a.status)}
                          className={
                            a.danger
                              ? 'text-red-400 hover:underline'
                              : 'text-brand hover:underline'
                          }
                        >
                          {a.label}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
