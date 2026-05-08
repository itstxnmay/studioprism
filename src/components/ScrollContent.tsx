"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MagneticButton from "@/components/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollContent() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const feature1Ref = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const feature2Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance is now handled by LoaderSequence + CSS animations
      // (hero-entrance-active class triggers scale/blur/stagger)

      // ---- Feature 1 ----
      if (feature1Ref.current) {
        gsap.to(feature1Ref.current.querySelector(".feature-text"), {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: feature1Ref.current,
            start: "top 80%",
            end: "top 40%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ---- Showcase ----
      if (showcaseRef.current) {
        gsap.to(showcaseRef.current.querySelector(".showcase-content"), {
          opacity: 1,
          y: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: {
            trigger: showcaseRef.current,
            start: "top 65%",
            end: "top 25%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ---- Feature 2 ----
      if (feature2Ref.current) {
        gsap.to(feature2Ref.current.querySelector(".feature-text"), {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: feature2Ref.current,
            start: "top 80%",
            end: "top 40%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ---- CTA ----
      if (ctaRef.current) {
        gsap.to(ctaRef.current.querySelector(".cta-content"), {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ---- Scroll indicator hide ----
      ScrollTrigger.create({
        trigger: feature1Ref.current,
        start: "top 90%",
        onEnter: () => {
          document
            .querySelector(".scroll-indicator")
            ?.classList.add("hidden");
        },
        onLeaveBack: () => {
          document
            .querySelector(".scroll-indicator")
            ?.classList.remove("hidden");
        },
      });

      // ---- Scroll progress bar ----
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const bar = document.querySelector(
            ".scroll-progress"
          ) as HTMLElement;
          if (bar) {
            bar.style.width = `${self.progress * 100}%`;
          }
        },
      });
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapperRef} className="scroll-wrapper">
      {/* === HERO === */}
      <section ref={heroRef} id="hero" data-scroll-section="hero" className="scroll-section hero-section">
        <div className="hero-content">
          <div
            className="hero-badge"
            style={{ opacity: 0, transform: "translateY(20px)" }}
          >
            <span className="dot"></span>
            Now Available
          </div>

          <h1 className="hero-title">
            {["Precision", "Carved in", "Light"].map((word, lineIdx) => (
              <span className="line" key={lineIdx}>
                <span className="line-inner">
                  {word.split("").map((char, charIdx) => {
                    // Calculate global character index for stagger
                    const prevChars = ["Precision", "Carved in", "Light"]
                      .slice(0, lineIdx)
                      .reduce((sum, w) => sum + w.length, 0);
                    const globalIdx = prevChars + charIdx;
                    return (
                      <span
                        key={charIdx}
                        className="hero-char"
                        style={{ animationDelay: `${globalIdx * 20}ms` }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    );
                  })}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="hero-subtitle hero-typewriter"
            style={{ opacity: 0, transform: "translateY(30px)" }}
          >
            Where mathematical perfection meets digital artistry.
            Every facet engineered to capture and refract the
            essence of luxury.
          </p>

          <div
            className="hero-buttons"
            style={{ opacity: 0, transform: "translateY(20px)" }}
          >
            <MagneticButton variant="primary">Explore Collection</MagneticButton>
            <MagneticButton variant="secondary">Learn More</MagneticButton>
          </div>
        </div>

        {/* Fog / mist layer at bottom of hero */}
        <div className="hero-fog" />
      </section>

      {/* === FEATURE 1 === */}
      <section
        ref={feature1Ref}
        id="features"
        data-scroll-section="features"
        className="scroll-section feature-section"
      >
        <div className="feature-inner">
          <div className="feature-text">
            <span className="feature-label">Craftsmanship</span>
            <h2 className="feature-heading">
              Engineered
              <br />
              Beyond Measure
            </h2>
            <p className="feature-description">
              Each surface is algorithmically refined to achieve
              optical perfection. 57 facets precisely angled to
              maximize brilliance and fire — a testament to
              computational design at its finest.
            </p>
            <div className="feature-stats">
              <div className="stat-item">
                <div className="stat-value">57</div>
                <div className="stat-label">Facets</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">∞</div>
                <div className="stat-label">Reflections</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">4K</div>
                <div className="stat-label">Resolution</div>
              </div>
            </div>
          </div>
          <div className="feature-spacer"></div>
        </div>
      </section>

      {/* === SHOWCASE === */}
      <section
        ref={showcaseRef}
        id="showcase"
        data-scroll-section="showcase"
        className="scroll-section showcase-section"
      >
        <div className="showcase-content" style={{ transform: "translateY(40px)" }}>
          <p className="showcase-quote">
            &ldquo;The intersection of technology and artistry
            isn&apos;t just about what you see — it&apos;s about
            what you feel when light bends exactly as intended.&rdquo;
          </p>
          <p className="showcase-author">— Studio Prism, 2026</p>
        </div>
      </section>

      {/* === FEATURE 2 === */}
      <section
        ref={feature2Ref}
        id="about"
        data-scroll-section="about"
        className="scroll-section feature-section reverse"
      >
        <div className="feature-inner">
          <div className="feature-text">
            <span className="feature-label">Innovation</span>
            <h2 className="feature-heading">
              Digital Matter,
              <br />
              Eternal Form
            </h2>
            <p className="feature-description">
              Born from the convergence of mathematics and aesthetics.
              Our rendering pipeline processes over 2 million light
              calculations per frame, ensuring every rotation reveals
              a new dimension of beauty.
            </p>
            <div className="feature-stats">
              <div className="stat-item">
                <div className="stat-value">2M+</div>
                <div className="stat-label">Light rays</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">60</div>
                <div className="stat-label">FPS</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0ms</div>
                <div className="stat-label">Latency</div>
              </div>
            </div>
          </div>
          <div className="feature-spacer"></div>
        </div>
      </section>

      {/* === CTA === */}
      <section ref={ctaRef} id="contact" data-scroll-section="contact" className="scroll-section cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            Experience the
            <br />
            Extraordinary
          </h2>
          <p className="cta-description">
            Step into a world where digital craftsmanship knows no
            bounds. Every pixel, every polygon, every photon — 
            meticulously orchestrated for your senses.
          </p>
          <div className="hero-buttons">
            <MagneticButton variant="primary">Get Started</MagneticButton>
            <MagneticButton variant="secondary">View Gallery</MagneticButton>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="footer">
        <div className="footer-left">
          © 2026 Prism Studio. All rights reserved.
        </div>
        <div className="footer-right">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
