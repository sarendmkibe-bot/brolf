import { useState } from 'react';

const ICONS = {
  'Food & Coffee': '☕',
  'Clothing & Textiles': '🧵',
  Handicrafts: '🏺',
  Electronics: '🎧',
  'Home & Living': '🏠',
  'Beauty & Health': '🧴',
};

// The photo fills the whole tile; a category icon shows if there is no photo
export default function ProductImage({ product, className = '', iconClass = 'text-5xl' }) {
  // Remember which link failed, so a new link gets a fresh try
  const [failedUrl, setFailedUrl] = useState(null);
  const showPhoto = product.image_url && failedUrl !== product.image_url;

  if (showPhoto) {
    return (
      <div className={`overflow-hidden bg-panel2 ${className}`}>
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          onError={() => setFailedUrl(product.image_url)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-panel2 to-ink ${iconClass} ${className}`}
    >
      {ICONS[product.category_name] || '🛍️'}
    </div>
  );
}