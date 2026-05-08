"use client";

import { useEffect, useRef, useCallback } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const orbitsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  // State tracked outside React for RAF performance
  const state = useRef({
    mouseX: 0,
    mouseY: 0,
    dotX: 0,
    dotY: 0,
    ringX: 0,
    ringY: 0,
    ringScale: 1,
    targetRingScale: 1,
    isHoveringClickable: false,
    isHoveringDiamond: false,
    magnetX: 0,
    magnetY: 0,
    hasMagnet: false,
    visible: false,
    orbitAngle: 0,
  });

  const lerp = useCallback((a: number, b: number, t: number) => a + (b - a) * t, []);

  useEffect(() => {
    // ---- Detect touch device: hide cursor entirely ----
    const isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouchDevice) {
      // Don't render anything, keep default cursor
      return;
    }

    // Hide default cursor
    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";

    const dot = dotRef.current;
    const ring = ringRef.current;
    const orbits = orbitsRef.current;
    if (!dot || !ring || !orbits) return;

    const s = state.current;
    const orbitDots = orbits.children;

    // ---- Mouse move handler ----
    const onMouseMove = (e: MouseEvent) => {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;

      if (!s.visible) {
        s.visible = true;
        s.dotX = e.clientX;
        s.dotY = e.clientY;
        s.ringX = e.clientX;
        s.ringY = e.clientY;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }

      // Detect diamond canvas under cursor (pointer-events: none, so use elementsFromPoint)
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const overCanvas = elements.some(
        (el) => el.closest(".canvas-container") || el.tagName === "CANVAS"
      );
      // Only trigger diamond mode when NOT hovering a clickable element
      if (overCanvas && !s.isHoveringClickable) {
        if (!s.isHoveringDiamond) {
          s.isHoveringDiamond = true;
          s.targetRingScale = 0;
        }
      } else {
        if (s.isHoveringDiamond) {
          s.isHoveringDiamond = false;
          if (!s.isHoveringClickable) {
            s.targetRingScale = 1;
          }
        }
      }
    };

    // ---- Hover detection via mouseover/mouseout (clickable elements only) ----
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check for clickable elements
      const clickable = target.closest(
        "a, button, [role='button'], input[type='submit'], .btn-primary, .btn-secondary, .navbar-logo, .navbar-links a"
      );
      if (clickable) {
        s.isHoveringClickable = true;
        s.targetRingScale = 1.5;
        // Calculate magnetic snap target (center of element)
        const rect = clickable.getBoundingClientRect();
        s.magnetX = rect.left + rect.width / 2;
        s.magnetY = rect.top + rect.height / 2;
        s.hasMagnet = true;
        ring.style.mixBlendMode = "difference";
        ring.style.borderColor = "rgba(255, 255, 255, 0.9)";
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const clickable = target.closest(
        "a, button, [role='button'], input[type='submit'], .btn-primary, .btn-secondary, .navbar-logo, .navbar-links a"
      );
      if (clickable) {
        s.isHoveringClickable = false;
        s.targetRingScale = 1;
        s.hasMagnet = false;
        ring.style.mixBlendMode = "normal";
        ring.style.borderColor = "rgba(255, 255, 255, 0.5)";
      }
    };

    // ---- Hide on mouse leave window ----
    const onMouseLeave = () => {
      s.visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      orbits.style.opacity = "0";
    };

    const onMouseEnter = () => {
      s.visible = true;
      dot.style.opacity = "1";
    };

    // ---- Animation loop (RAF) ----
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (!s.visible) return;

      // Dot follows mouse instantly
      s.dotX = s.mouseX;
      s.dotY = s.mouseY;

      // Ring follows with lerp delay
      const ringTargetX = s.hasMagnet
        ? lerp(s.mouseX, s.magnetX, 0.6)
        : s.mouseX;
      const ringTargetY = s.hasMagnet
        ? lerp(s.mouseY, s.magnetY, 0.6)
        : s.mouseY;

      s.ringX = lerp(s.ringX, ringTargetX, 0.15);
      s.ringY = lerp(s.ringY, ringTargetY, 0.15);

      // Smooth scale interpolation
      s.ringScale = lerp(s.ringScale, s.targetRingScale, 0.15);

      // Apply dot position
      dot.style.transform = `translate(${s.dotX - 4}px, ${s.dotY - 4}px)`;

      // Diamond hover: scatter into orbiting dots
      if (s.isHoveringDiamond) {
        ring.style.opacity = "0";
        orbits.style.opacity = "1";

        s.orbitAngle += 0.03;

        for (let i = 0; i < orbitDots.length; i++) {
          const angle = s.orbitAngle + (i * Math.PI * 2) / 6;
          const radius = 24 + Math.sin(s.orbitAngle * 2 + i) * 6;
          const ox = s.dotX + Math.cos(angle) * radius;
          const oy = s.dotY + Math.sin(angle) * radius;
          (orbitDots[i] as HTMLElement).style.transform =
            `translate(${ox - 3}px, ${oy - 3}px)`;
        }
      } else {
        orbits.style.opacity = "0";
        ring.style.opacity = s.ringScale > 0.05 ? "1" : "0";

        // Apply ring position & scale
        const ringSize = 40 * s.ringScale;
        ring.style.width = `${ringSize}px`;
        ring.style.height = `${ringSize}px`;
        ring.style.transform = `translate(${s.ringX - ringSize / 2}px, ${s.ringY - ringSize / 2}px)`;
      }
    };

    // ---- Ensure cursor: none on all clickable elements ----
    const style = document.createElement("style");
    style.id = "custom-cursor-overrides";
    style.textContent = `
      *, *::before, *::after {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    // ---- Bind events ----
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    // Start animation loop
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
      const styleEl = document.getElementById("custom-cursor-overrides");
      if (styleEl) styleEl.remove();
    };
  }, [lerp]);

  return (
    <>
      {/* Center dot */}
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{ opacity: 0 }}
      />

      {/* Trailing ring */}
      <div
        ref={ringRef}
        className="custom-cursor-ring"
        style={{ opacity: 0 }}
      />

      {/* Orbit dots (6 particles for diamond scatter) */}
      <div
        ref={orbitsRef}
        className="custom-cursor-orbits"
        style={{ opacity: 0 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="orbit-dot" />
        ))}
      </div>
    </>
  );
}
