"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tween a number from its previous value to a new target over `duration` ms.
 * Returns the current displayed value. Uses requestAnimationFrame for smooth
 * 60fps updates and an ease-out cubic curve so the animation feels organic.
 *
 * Used by AnimatedStat to make dashboard KPIs pulse on real-time updates.
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(target);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === value) return;
    fromRef.current = value;
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
