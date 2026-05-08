"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────────────────────────────────────
   Cubic Bezier Easing Engine
   Implements: cubic-bezier(0.76, 0, 0.24, 1)
   ──────────────────────────────────────────────────────── */

function createCubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): (x: number) => number {
  const ax = 1 - 3 * p2x + 3 * p1x;
  const bx = 3 * p2x - 6 * p1x;
  const cx = 3 * p1x;
  const ay = 1 - 3 * p2y + 3 * p1y;
  const by = 3 * p2y - 6 * p1y;
  const cy = 3 * p1y;

  function sampleX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }
  function sampleDerivX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    // Newton-Raphson iteration
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    // Bisection fallback
    let lo = 0;
    let hi = 1;
    while (hi - lo > 1e-7) {
      const mid = (lo + hi) / 2;
      if (sampleX(mid) < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveCurveX(x));
  };
}

/** Premium snap easing: cubic-bezier(0.83, 0, 0.17, 1) — stronger ease-in-out for silky feel */
const snapEase = createCubicBezier(0.83, 0, 0.17, 1);

/* ────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────── */
const SNAP_DURATION_MS = typeof window !== "undefined" && window.innerWidth <= 768 ? 800 : 1000;
const COOLDOWN_MS = 200; // post-landing cooldown (total lockout = animation + cooldown = ~1200ms)
const TOTAL_SECTIONS = 5;
const SWIPE_THRESHOLD_PX = 50; // slightly higher threshold to avoid accidental swipes
const WHEEL_DELTA_THRESHOLD = 50; // minimum deltaY to trigger snap (prevents trackpad micro-scrolls)

/* ────────────────────────────────────────────────────────
   Context Types
   ──────────────────────────────────────────────────────── */

interface SectionSnapContextType {
  /** Current active section index (0–4). Updates when snap animation begins. */
  currentSection: number;
  /** Total number of snappable sections */
  totalSections: number;
  /**
   * Ref holding normalized transition progress (0–1) during snap animation.
   * 0 when idle, ramps to 1 during animation, resets to 0 on completion.
   * Read in rAF / animation loops — never triggers re-renders.
   */
  transitionProgressRef: React.RefObject<number>;
  /** True while a snap animation is in flight */
  isAnimating: boolean;
  /** Programmatically snap to a section by index (0-based) */
  scrollToSection: (index: number) => void;
}

const SectionSnapContext = createContext<SectionSnapContextType>({
  currentSection: 0,
  totalSections: TOTAL_SECTIONS,
  transitionProgressRef: { current: 0 },
  isAnimating: false,
  scrollToSection: () => {},
});

/**
 * Hook to access the section-snap scroll system.
 *
 * ```tsx
 * const { currentSection, transitionProgressRef, scrollToSection } = useSectionSnap();
 * ```
 */
export const useSectionSnap = () => useContext(SectionSnapContext);

/* ────────────────────────────────────────────────────────
   Provider
   ──────────────────────────────────────────────────────── */

interface ProviderProps {
  children: React.ReactNode;
  /** Pass false to defer initialization (e.g. loading screen visible) */
  enabled?: boolean;
}

export function SectionSnapProvider({
  children,
  enabled = true,
}: ProviderProps) {
  /* ── Reactive state (only updates on start/end of transitions) ── */
  const [currentSection, setCurrentSection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  /* ── Refs (mutation without re-renders) ── */
  const transitionProgressRef = useRef<number>(0);
  const currentSectionRef = useRef(0);
  const animatingRef = useRef(false);
  const coolingRef = useRef(false);
  const rafRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchIsVerticalRef = useRef(false);

  /** Get the scroll-Y target for a given section index */
  const getSectionY = useCallback((index: number): number => {
    const sections =
      document.querySelectorAll<HTMLElement>("[data-scroll-section]");
    if (sections[index]) {
      return sections[index].offsetTop;
    }
    return index * window.innerHeight;
  }, []);

  /** Core: animate scroll to a target section with premium easing */
  const animateToSection = useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_SECTIONS - 1, targetIndex));

      // Block if already animating or target is current
      if (animatingRef.current) return;
      if (clamped === currentSectionRef.current) return;

      // ── Begin animation ──
      animatingRef.current = true;
      setIsAnimating(true);
      document.body.classList.remove("scroll-idle");

      // Update current section at START so consumers know the destination
      currentSectionRef.current = clamped;
      setCurrentSection(clamped);

      const startY = window.scrollY;
      const targetY = getSectionY(clamped);
      const distance = targetY - startY;
      const startTime = performance.now();
      transitionProgressRef.current = 0;

      function step(now: number) {
        const elapsed = now - startTime;
        const rawProgress = Math.min(elapsed / SNAP_DURATION_MS, 1);
        const easedProgress = snapEase(rawProgress);

        // Update progress ref (readable by external animation loops)
        transitionProgressRef.current = rawProgress;

        // Apply scroll position
        window.scrollTo(0, startY + distance * easedProgress);

        // Ensure ScrollTrigger animations stay in sync
        ScrollTrigger.update();

        if (rawProgress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // ── Animation complete ──
          window.scrollTo(0, targetY); // Exact final position
          ScrollTrigger.update();

          transitionProgressRef.current = 0;
          animatingRef.current = false;
          setIsAnimating(false);
          document.body.classList.add("scroll-idle");

          // Post-landing cooldown prevents accidental double-scrolls
          coolingRef.current = true;
          setTimeout(() => {
            coolingRef.current = false;
          }, COOLDOWN_MS);
        }
      }

      rafRef.current = requestAnimationFrame(step);
    },
    [getSectionY]
  );

  /** Public API: snap to section */
  const scrollToSection = useCallback(
    (index: number) => {
      animateToSection(index);
    },
    [animateToSection]
  );

  /* ── Main Effect: lifecycle & event binding ──────────── */
  useEffect(() => {
    if (!enabled) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";
    document.body.classList.add("scroll-idle");

    // ── Snap to nearest section on init (handles page refresh mid-scroll) ──
    const initTimer = setTimeout(() => {
      const nearest = Math.round(window.scrollY / window.innerHeight);
      const initial = Math.max(0, Math.min(TOTAL_SECTIONS - 1, nearest));
      window.scrollTo(0, getSectionY(initial));
      currentSectionRef.current = initial;
      setCurrentSection(initial);
      ScrollTrigger.refresh();
    }, 50);

    /* ── Wheel: one tick = one section (with delta threshold) ── */
    let accumulatedDelta = 0;
    let deltaResetTimer: ReturnType<typeof setTimeout> | undefined;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (animatingRef.current || coolingRef.current) return;

      // Accumulate delta to handle trackpad micro-scrolls
      accumulatedDelta += e.deltaY;

      // Reset accumulator if no scroll input for 200ms (new gesture)
      if (deltaResetTimer) clearTimeout(deltaResetTimer);
      deltaResetTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 200);

      // Only trigger snap when accumulated delta exceeds threshold
      if (Math.abs(accumulatedDelta) < WHEEL_DELTA_THRESHOLD) return;

      const dir = accumulatedDelta > 0 ? 1 : -1;
      accumulatedDelta = 0; // Reset after triggering

      const next = currentSectionRef.current + dir;
      if (next < 0 || next >= TOTAL_SECTIONS) return;
      animateToSection(next);
    };

    /* ── Touch: swipe detection with vertical-only lock ── */
    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
      touchIsVerticalRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Determine swipe direction on first significant move
      if (!touchIsVerticalRef.current) {
        const dx = Math.abs(e.touches[0].clientX - touchStartXRef.current);
        const dy = Math.abs(e.touches[0].clientY - touchStartYRef.current);
        if (dy > dx && dy > 10) {
          touchIsVerticalRef.current = true;
        } else if (dx > dy && dx > 10) {
          // Horizontal swipe — don't prevent default, let it pass through
          return;
        }
      }
      // Only prevent default for vertical swipes (our section snap)
      if (touchIsVerticalRef.current) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (animatingRef.current || coolingRef.current) return;
      if (!touchIsVerticalRef.current) return; // ignore horizontal swipes

      const dy = touchStartYRef.current - e.changedTouches[0].clientY;
      if (Math.abs(dy) < SWIPE_THRESHOLD_PX) return;

      const dir = dy > 0 ? 1 : -1;
      const next = currentSectionRef.current + dir;
      if (next < 0 || next >= TOTAL_SECTIONS) return;
      animateToSection(next);
    };

    /* ── Keyboard: arrows, page up/down, home/end ── */
    const onKeyDown = (e: KeyboardEvent) => {
      if (animatingRef.current || coolingRef.current) return;

      let dir = 0;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          dir = 1;
          e.preventDefault();
          break;
        case "ArrowUp":
        case "PageUp":
          dir = -1;
          e.preventDefault();
          break;
        case "Home":
          e.preventDefault();
          animateToSection(0);
          return;
        case "End":
          e.preventDefault();
          animateToSection(TOTAL_SECTIONS - 1);
          return;
      }
      if (dir === 0) return;

      const next = currentSectionRef.current + dir;
      if (next < 0 || next >= TOTAL_SECTIONS) return;
      animateToSection(next);
    };

    /* ── Anchor link interception ── */
    const sectionMap: Record<string, number> = {
      "#hero": 0,
      "#features": 1,
      "#showcase": 2,
      "#about": 3,
      "#contact": 4,
    };

    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      e.preventDefault();
      const idx = href === "#" ? 0 : sectionMap[href];
      if (idx !== undefined) animateToSection(idx);
    };

    /* ── Resize: re-snap to stay pixel-aligned ── */
    const onResize = () => {
      if (!animatingRef.current) {
        window.scrollTo(0, getSectionY(currentSectionRef.current));
        ScrollTrigger.update();
      }
    };

    /* ── Bind all listeners ── */
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onAnchorClick);

    /* ── Cleanup ── */
    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onAnchorClick);
      document.body.classList.remove("scroll-idle", "is-scrolling");
    };
  }, [enabled, animateToSection, getSectionY]);

  /* ── Context value ── */
  const contextValue: SectionSnapContextType = {
    currentSection,
    totalSections: TOTAL_SECTIONS,
    transitionProgressRef,
    isAnimating,
    scrollToSection,
  };

  return (
    <SectionSnapContext.Provider value={contextValue}>
      {children}
    </SectionSnapContext.Provider>
  );
}
