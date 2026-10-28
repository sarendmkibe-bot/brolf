const STYLES = {
  pending: 'bg-yellow-500/15 text-yellow-300',
  confirmed: 'bg-blue-500/15 text-blue-300',
  shipped: 'bg-purple-500/15 text-purple-300',
  delivered: 'bg-green-500/15 text-green-300',
  cancelled: 'bg-red-500/15 text-red-300',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STYLES[status] || ''}`}>
      {status}
    </span>
  );
}