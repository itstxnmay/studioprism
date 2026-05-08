"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ScrollContent from "@/components/ScrollContent";
import CustomCursor from "@/components/CustomCursor";
import LoaderSequence from "@/components/LoaderSequence";
import { SectionSnapProvider, useSectionSnap } from "@/lib/SectionSnapContext";

// Dynamic import for Three.js (no SSR)
const DiamondScene = dynamic(() => import("@/components/DiamondScene"), {
  ssr: false,
});

interface DiamondSceneWrapperProps {
  onLoaded?: () => void;
  onProgress?: (progress: number) => void;
  entranceReady?: boolean;
}

/** Thin wrapper so DiamondScene can consume SectionSnapContext */
function DiamondSceneWrapper(props: DiamondSceneWrapperProps) {
  const { currentSection, transitionProgressRef } = useSectionSnap();
  return (
    <DiamondScene
      {...props}
      currentSection={currentSection}
      transitionProgressRef={transitionProgressRef}
    />
  );
}

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);

  const handleLoaderComplete = useCallback(() => {
    setLoaderDone(true);
  }, []);

  return (
    <SectionSnapProvider enabled={loaderDone}>
      {/* Custom Cursor */}
      <CustomCursor />

      {/* Premium Loading Sequence */}
      <LoaderSequence
        progress={progress}
        loaded={loaded}
        onComplete={handleLoaderComplete}
      />

      {/* Scroll Progress Bar */}
      <div className="scroll-progress"></div>

      {/* Navbar */}
      <Navbar />

      {/* 3D Diamond Canvas (fixed, behind content) */}
      <DiamondSceneWrapper
        onLoaded={() => setLoaded(true)}
        onProgress={(p) => setProgress(p)}
        entranceReady={loaderDone}
      />

      {/* Scroll Content */}
      <ScrollContent />

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <span className="scroll-indicator-text">Scroll</span>
        <div className="scroll-indicator-line"></div>
      </div>
    </SectionSnapProvider>
  );
}
