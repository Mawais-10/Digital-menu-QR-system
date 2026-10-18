import { useEffect, useRef, useState } from 'react';
import { imgUrl, imgSrcSet, fallBackToOriginal } from '../lib/image.js';

// Fades + slides children in when they enter the viewport. `delay` staggers siblings.
export function Reveal({ children, delay = 0, className = '', ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -36px 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </div>
  );
}

// Lazy image with shimmer placeholder and blur-up fade-in once loaded.
// widths + sizes: load a resized Cloudinary copy that fits the slot (see lib/image.js).
// One width gives a single resized copy; several give a srcset the browser picks from.
export function SmartImage({ src, alt = '', className = '', imgClassName = '', eager = false, widths, sizes, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="shimmer absolute inset-0" />}
      <img
        src={widths ? imgUrl(src, widths[Math.floor(widths.length / 2)]) : src}
        srcSet={widths?.length > 1 ? imgSrcSet(src, widths) : undefined}
        sizes={widths?.length > 1 ? sizes : undefined}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => fallBackToOriginal(e.currentTarget, src)}
        className={`transition-[opacity,filter,transform] duration-700 ease-out ${
          loaded ? 'scale-100 opacity-100 blur-0' : 'scale-[1.03] opacity-0 blur-md'
        } ${imgClassName}`}
        {...rest}
      />
    </div>
  );
}
