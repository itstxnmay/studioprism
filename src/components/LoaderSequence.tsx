"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LoaderSequenceProps {
  progress: number;
  loaded: boolean;
  onComplete: () => void;
}

/**
 * Premium Loading Sequence
 * ========================
 * Phase 1 (0–1.5s):  SVG diamond draws edge-by-edge (stroke animation)
 * Phase 2 (1.5–2.5s): "PRISM" fades in below the diamond
 * Phase 3 (2.8s+):   Once loaded, curtain splits apart
 * Phase 4:           Hero entrance triggers, then loader unmounts
 *
 * The minimum display time is 2.8s regardless of load speed,
 * ensuring the full animation always plays out.
 */
export default function LoaderSequence({ progress, loaded, onComplete }: LoaderSequenceProps) {
  const [phase, setPhase] = useState<"draw" | "brand" | "ready" | "exit" | "done">("draw");
  const hasCompleted = useRef(false);
  const minTimeReached = useRef(false);
  const assetsLoaded = useRef(false);

  /* ── Phase 1 → Phase 2: SVG draw completes at 1.5s ── */
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("brand"), 1500);
    // Minimum display: 2.8s before allowing exit
    const t2 = setTimeout(() => {
      minTimeReached.current = true;
      // If assets already loaded, proceed to exit immediately
      if (assetsLoaded.current) {
        setPhase("exit");
      } else {
        setPhase("ready");
      }
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* ── Track asset loading ── */
  useEffect(() => {
    if (loaded) {
      assetsLoaded.current = true;
      // If minimum time already passed, exit
      if (minTimeReached.current) {
        setPhase("exit");
      }
    }
  }, [loaded]);

  /* ── Phase exit: curtain opens, trigger hero, then unmount ── */
  useEffect(() => {
    if (phase === "exit" && !hasCompleted.current) {
      // Trigger hero entrance
      document.querySelector(".hero-section")?.classList.add("hero-entrance-active");
      window.dispatchEvent(new CustomEvent("hero-entrance-start"));

      const t = setTimeout(() => {
        hasCompleted.current = true;
        setPhase("done");
        onComplete();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div className={`loader-overlay ${phase === "exit" ? "loader-exit" : ""}`}>
      {/* Left curtain */}
      <div className="loader-curtain loader-curtain-left" />
      {/* Right curtain */}
      <div className="loader-curtain loader-curtain-right" />

      {/* Center branding */}
      <div className={`loader-center ${phase === "exit" ? "loader-center-hide" : ""}`}>
        {/* SVG Diamond */}
        <svg
          className="loader-diamond-svg"
          viewBox="0 0 100 100"
          width="80"
          height="80"
          fill="none"
        >
          <path className="ld-edge ld-e1" d="M50 5 L15 35" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e2" d="M50 5 L85 35" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e3" d="M15 35 L50 45" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e4" d="M85 35 L50 45" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e5" d="M15 35 L50 95" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e6" d="M85 35 L50 95" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e7" d="M15 35 L85 35" stroke="white" strokeWidth="2" strokeLinecap="round" pathLength="1" />
          <path className="ld-edge ld-e8" d="M50 45 L50 95" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" pathLength="1" />
        </svg>

        {/* Brand text */}
        <div className={`loader-brand-text ${phase !== "draw" ? "loader-brand-show" : ""}`}>
          PRISM
        </div>
      </div>

      {/* Progress bar */}
      <div className="loader-bar">
        <div className="loader-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  );
}
