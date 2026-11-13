import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard.jsx';

export default function ProductRow({ title, products }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);

  // Slides on its own every few seconds; pauses while the mouse is over it
  useEffect(() => {
    if (paused || products.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: 240, behavior: 'smooth' });
    }, 3500);
    return () => clearInterval(timer);
  }, [paused, products.length]);

  if (products.length === 0) return null;

  function slide(direction) {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  const arrow =
    'absolute top-1/3 z-10 flex h-12 w-10 items-center justify-center bg-black/50 text-2xl text-white hover:bg-black/70';

  return (
    <section
      className="mt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <div className="relative">
        <button aria-label="Previous products" onClick={() => slide(-1)} className={`${arrow} left-0 rounded-r-lg`}>
          ‹
        </button>

        <div
          ref={ref}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <div key={p.id} className="w-56 shrink-0 snap-start">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>

        <button aria-label="Next products" onClick={() => slide(1)} className={`${arrow} right-0 rounded-l-lg`}>
          ›
        </button>
      </div>
    </section>
  );
}