"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface MagneticButtonProps {
  children: React.ReactNode;
  variant: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}

/**
 * Premium Button with:
 * - Magnetic pull (2–3px toward cursor within 100px radius)
 * - Ripple from cursor entry point (primary only)
 * - Diagonal shimmer sweep (secondary only)
 */
export default function MagneticButton({
  children,
  variant,
  className = "",
  onClick,
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });

  /* ── Magnetic pull: shift button 2-3px toward cursor ── */
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const PULL_RADIUS = 100;
    const MAX_SHIFT = 3;

    const onMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PULL_RADIUS) {
        const strength = 1 - dist / PULL_RADIUS;
        const shiftX = dx * strength * (MAX_SHIFT / PULL_RADIUS) * 2;
        const shiftY = dy * strength * (MAX_SHIFT / PULL_RADIUS) * 2;
        setMagneticOffset({ x: shiftX, y: shiftY });
      } else {
        setMagneticOffset({ x: 0, y: 0 });
      }
    };

    const onMouseLeave = () => {
      setMagneticOffset({ x: 0, y: 0 });
    };

    // Listen on window for the proximity detection
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    btn.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      btn.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  /* ── Primary: Ripple from cursor entry point ── */
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant !== "primary") return;
      const btn = btnRef.current;
      const ripple = rippleRef.current;
      if (!btn || !ripple) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Position the ripple at cursor entry point
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.transform = "translate(-50%, -50%) scale(0)";

      // Force reflow then animate
      void ripple.offsetWidth;
      ripple.style.transform = "translate(-50%, -50%) scale(1)";
    },
    [variant]
  );

  const handleMouseLeave = useCallback(() => {
    if (variant !== "primary") return;
    const ripple = rippleRef.current;
    if (!ripple) return;
    ripple.style.transform = "translate(-50%, -50%) scale(0)";
  }, [variant]);

  return (
    <button
      ref={btnRef}
      className={`btn-${variant} magnetic-btn ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${magneticOffset.x}px, ${magneticOffset.y}px)`,
      }}
    >
      {/* Ripple layer — primary buttons only */}
      {variant === "primary" && (
        <span ref={rippleRef} className="btn-ripple" />
      )}

      {/* Shimmer layer — secondary buttons only */}
      {variant === "secondary" && (
        <span className="btn-shimmer" />
      )}

      <span className="btn-label">{children}</span>
    </button>
  );
}
