import { useEffect, useState } from 'react';

// Returns a ref for a sentinel element; calls onReach when it scrolls within 600px of view.
export function useInfiniteScroll(onReach, enabled) {
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!node || !enabled || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) onReach(); },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, enabled, onReach]);
  return setNode;
}
