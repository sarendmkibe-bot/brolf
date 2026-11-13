export function discountPercent(price, original) {
  if (!original || original <= price) return 0;
  return Math.round((1 - price / original) * 100);
}

export default function PriceTag({ price, original, size = 'text-lg', showBadge = false }) {
  const off = discountPercent(price, original);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`${size} font-bold text-brand`}>{price.toLocaleString()} ETB</span>
      {off > 0 && (
        <span className="text-sm text-muted line-through">{original.toLocaleString()} ETB</span>
      )}
      {showBadge && off > 0 && (
        <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>
      )}
    </div>
  );
}