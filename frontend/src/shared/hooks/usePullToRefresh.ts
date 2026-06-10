import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 64;
const MAX_PULL = 80;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const pullDistRef = useRef(0);   // avoids stale closure in onTouchEnd
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const isAtTop = useCallback(() => {
    return (window.scrollY ?? document.documentElement.scrollTop ?? document.body.scrollTop) <= 4;
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (!isAtTop() || refreshingRef.current) return;
      touchStartY.current = e.touches[0].clientY;
      pullDistRef.current = 0;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      if (!isAtTop()) {
        pulling.current = false;
        pullDistRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) {
        pullDistRef.current = 0;
        setPullDistance(0);
        return;
      }
      const dist = Math.min(delta * 0.5, MAX_PULL);
      pullDistRef.current = dist;
      setPullDistance(dist);
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const dist = pullDistRef.current;
      pullDistRef.current = 0;
      setPullDistance(0);

      if (dist >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
        }
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
  }, [isAtTop]); // stable — no state in deps, no re-registration on every render

  return { pullDistance, refreshing };
}
