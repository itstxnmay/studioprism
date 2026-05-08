"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface ScrollToOptions {
  offset?: number;
  duration?: number;
  immediate?: boolean;
}

interface SmoothScrollContextType {
  /** The Lenis instance (null before initialization) */
  lenis: Lenis | null;
  /**
   * Ref holding the global scroll progress (0–1).
   * Read this in rAF / animation loops — it never triggers re-renders.
   */
  globalProgressRef: React.RefObject<number>;
  /**
   * Ref holding per-section normalized progress (0–1).
   * Keys are the `data-scroll-section` values on each section element.
   *
   * Progress definition:
   *   0 → section top has just entered the viewport bottom
   *   1 → section bottom has just left the viewport top
   *
   * Usage in an animation loop:
   * ```ts
   * const heroProgress = ctx.sectionProgressRef.current["hero"] ?? 0;
   * ```
   */
  sectionProgressRef: React.RefObject<Record<string, number>>;
  /** True while the user is actively scrolling */
  isScrolling: boolean;
  /** True when the scroll momentum has fully settled */
  isIdle: boolean;
  /** Programmatically scroll to a target element, CSS selector, or px offset */
  scrollTo: (
    target: string | number | HTMLElement,
    options?: ScrollToOptions
  ) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  globalProgressRef: { current: 0 },
  sectionProgressRef: { current: {} },
  isScrolling: false,
  isIdle: true,
  scrollTo: () => {},
});

/**
 * Hook to access the smooth-scroll system.
 *
 * ```tsx
 * const { sectionProgressRef, isIdle, scrollTo } = useSmoothScroll();
 * // Read progress in a rAF loop — no re-renders:
 * const p = sectionProgressRef.current["hero"];
 * ```
 */
export const useSmoothScroll = () => useContext(SmoothScrollContext);

/* ────────────────────────────────────────────────────────
   Provider
   ──────────────────────────────────────────────────────── */

interface ProviderProps {
  children: React.ReactNode;
  /**
   * Pass `false` to defer scroll initialization
   * (e.g. while a loading screen is visible).
   */
  enabled?: boolean;
}

export function SmoothScrollProvider({
  children,
  enabled = true,
}: ProviderProps) {
  /* ── Refs (read in animation loops, no re-renders) ── */
  const lenisRef = useRef<Lenis | null>(null);
  const globalProgressRef = useRef<number>(0);
  const sectionProgressRef = useRef<Record<string, number>>({});
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onTickRef = useRef<((time: number) => void) | null>(null);
  const sectionTriggersRef = useRef<ScrollTrigger[]>([]);

  /* ── State (minimal — only changes on start/stop transitions) ── */
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isIdle, setIsIdle] = useState(true);

  /* ── Core Effect: Lenis lifecycle ───────────────────── */
  useEffect(() => {
    if (!enabled) {
      document.body.style.overflow = "hidden";
      return;
    }

    // Allow native scroll so Lenis can take over
    document.body.style.overflow = "";

    /* ── 1. Create Lenis with virtual-scroll settings ── */
    const instance = new Lenis({
      lerp: 0.07, // Ultra-smooth interpolation — gliding on ice
      smoothWheel: true,
      wheelMultiplier: 0.7, // Slightly dampened for premium feel
      touchMultiplier: 1.8,
      infinite: false,
    });

    lenisRef.current = instance;
    setLenis(instance);

    // Page starts idle (user hasn't scrolled yet)
    document.body.classList.add("scroll-idle");

    /* ── 2. Sync with GSAP ScrollTrigger ─────────────── */
    instance.on("scroll", () => {
      ScrollTrigger.update();

      // Update global progress ref (no re-render)
      globalProgressRef.current = instance.progress ?? 0;

      // Toggle body classes for CSS-driven idle animations
      document.body.classList.remove("scroll-idle");
      document.body.classList.add("is-scrolling");

      setIsScrolling(true);
      setIsIdle(false);

      // Debounced idle detection — fires once momentum fully settles
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        document.body.classList.add("scroll-idle");
        document.body.classList.remove("is-scrolling");
        setIsScrolling(false);
        setIsIdle(true);
      }, 150);
    });

    /* ── 3. GSAP Ticker drives Lenis rAF ─────────────── */
    const onTick = (time: number) => instance.raf(time * 1000);
    onTickRef.current = onTick;
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    /* ── 4. Per-section progress tracking ─────────────── */
    // Deferred slightly so the DOM settles after React render
    const sectionSetup = setTimeout(() => {
      const sections =
        document.querySelectorAll<HTMLElement>("[data-scroll-section]");

      sections.forEach((section) => {
        const id = section.dataset.scrollSection!;
        if (!id) return;

        // Initialize
        sectionProgressRef.current[id] = 0;

        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top bottom", // progress 0 → section top reaches viewport bottom
          end: "bottom top", //   progress 1 → section bottom leaves viewport top
          onUpdate: (self) => {
            sectionProgressRef.current[id] = self.progress;
          },
        });

        sectionTriggersRef.current.push(trigger);
      });

      // Recalculate all trigger positions now that Lenis is active
      ScrollTrigger.refresh();
    }, 100);

    /* ── 5. Global anchor-link interception ────────────── */
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      e.preventDefault();

      if (href === "#") {
        // Scroll to top
        instance.scrollTo(0, { duration: 1.4 });
      } else {
        const target = document.querySelector(href);
        if (target) {
          instance.scrollTo(target as HTMLElement, {
            offset: 0,
            duration: 1.4,
          });
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    /* ── Cleanup ──────────────────────────────────────── */
    return () => {
      clearTimeout(sectionSetup);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      document.removeEventListener("click", handleAnchorClick);
      document.body.classList.remove("scroll-idle", "is-scrolling");

      // Kill section-progress ScrollTrigger instances
      sectionTriggersRef.current.forEach((t) => t.kill());
      sectionTriggersRef.current = [];

      // Detach from GSAP ticker
      if (onTickRef.current) gsap.ticker.remove(onTickRef.current);

      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [enabled]);

  /* ── Stable scrollTo helper ─────────────────────────── */
  const scrollTo = useCallback(
    (
      target: string | number | HTMLElement,
      options?: ScrollToOptions
    ) => {
      lenisRef.current?.scrollTo(target, options);
    },
    []
  );

  /* ── Context value ──────────────────────────────────── */
  const contextValue: SmoothScrollContextType = {
    lenis,
    globalProgressRef,
    sectionProgressRef,
    isScrolling,
    isIdle,
    scrollTo,
  };

  return (
    <SmoothScrollContext.Provider value={contextValue}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
