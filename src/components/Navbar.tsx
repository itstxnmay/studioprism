"use client";

import { useEffect, useRef, useState, useContext } from "react";
import { useSectionSnap } from "@/lib/SectionSnapContext";

/**
 * Section-to-nav mapping:
 *   0 = Hero (no nav highlight)
 *   1 = Features
 *   2 = Showcase
 *   3 = About
 *   4 = Contact
 */
const NAV_ITEMS = [
  { label: "Features", href: "#features", section: 1 },
  { label: "Showcase", href: "#showcase", section: 2 },
  { label: "About",    href: "#about",    section: 3 },
  { label: "Contact",  href: "#contact",  section: 4 },
];

const SCROLL_HIDE_THRESHOLD = 50;

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const { currentSection, scrollToSection } = useSectionSnap();

  const [hidden, setHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0–1, used for backdrop blur

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  /* ── Scroll listener: backdrop blur + show/hide ── */
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const sy = window.scrollY;
        const heroHeight = window.innerHeight;

        // Backdrop blur progress (0 at top, 1 after hero)
        const blurProgress = Math.min(sy / heroHeight, 1);
        setScrollProgress(blurProgress);

        // Show / hide based on scroll direction (with threshold)
        const delta = sy - lastScrollY.current;
        if (delta > SCROLL_HIDE_THRESHOLD && sy > heroHeight * 0.5) {
          setHidden(true);
        } else if (delta < -SCROLL_HIDE_THRESHOLD) {
          setHidden(false);
        }

        lastScrollY.current = sy;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Move the active dot indicator to the active nav link ── */
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex((item) => item.section === currentSection);
    const dot = dotRef.current;
    if (!dot) return;

    if (activeIndex === -1) {
      // Hero section — hide dot
      dot.style.opacity = "0";
      dot.style.transform = "translateX(-50%) scale(0)";
      return;
    }

    const link = linkRefs.current[activeIndex];
    if (!link) return;

    const linkRect = link.getBoundingClientRect();
    const navRect = navRef.current?.getBoundingClientRect();
    if (!navRect) return;

    const centerX = linkRect.left - navRect.left + linkRect.width / 2;

    dot.style.opacity = "1";
    dot.style.transform = `translateX(-50%) scale(1)`;
    dot.style.left = `${centerX}px`;
  }, [currentSection]);

  /* ── Compute inline backdrop styles ── */
  const blurValue = scrollProgress * 20;
  const bgAlpha = scrollProgress * 0.8;

  return (
    <nav
      ref={navRef}
      className={`navbar ${hidden ? "navbar-hidden" : ""}`}
      style={{
        backdropFilter: `blur(${blurValue}px)`,
        WebkitBackdropFilter: `blur(${blurValue}px)`,
        background: `rgba(0, 0, 0, ${bgAlpha})`,
        borderBottom: scrollProgress > 0.05
          ? `1px solid rgba(255, 255, 255, ${0.06 * scrollProgress})`
          : "1px solid transparent",
      }}
    >
      <a href="#" className="navbar-logo" onClick={(e) => { e.preventDefault(); scrollToSection(0); }}>
        <div className="logo-icon">
          <span>◆</span>
        </div>
        Prism
      </a>

      <ul className="navbar-links">
        {/* Active section dot */}
        <div ref={dotRef} className="nav-active-dot" />

        {NAV_ITEMS.map((item, i) => (
          <li key={item.href}>
            <a
              ref={(el) => { linkRefs.current[i] = el; }}
              href={item.href}
              className={currentSection === item.section ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.section);
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
