import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 64; // px to pull before releasing triggers refresh
const MAX_PULL = 80;  // max visual pull distance

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current ?? document.documentElement;

    const onTouchStart = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 2) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) { setPullDistance(0); return; }
      // Prevent native scroll bounce competing with our pull
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 2) { pulling.current = false; setPullDistance(0); return; }
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(0);
        try { await onRefresh(); } finally { setRefreshing(false); }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pullDistance, refreshing]);

  return { pullDistance, refreshing, containerRef };
}
