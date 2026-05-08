"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface DiamondSceneProps {
  onLoaded?: () => void;
  onProgress?: (progress: number) => void;
  /** When true, triggers the diamond entrance animation */
  entranceReady?: boolean;
}

/** Detect mobile / low-power devices */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
}

export default function DiamondScene({ onLoaded, onProgress, entranceReady }: DiamondSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entranceReadyRef = useRef(false);

  // Bridge React prop into the Three.js animation loop via ref
  useEffect(() => {
    entranceReadyRef.current = !!entranceReady;
  }, [entranceReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // ---- Scene Setup ----
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 6);

    const mobile = isMobileDevice();

    const renderer = new THREE.WebGLRenderer({
      antialias: !mobile, // disable AA on mobile for perf
      alpha: true,
      powerPreference: mobile ? "default" : "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ---- Environment Map for reflections ----
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(mobile ? 128 : 256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);

    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        colorTop: { value: new THREE.Color(mobile ? 0x555555 : 0x222222) },
        colorBottom: { value: new THREE.Color(mobile ? 0x111111 : 0x000000) },
        colorHighlight: { value: new THREE.Color(mobile ? 0x888888 : 0x444444) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        uniform vec3 colorHighlight;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color = mix(colorBottom, colorTop, h * 0.5 + 0.5);
          float spot1 = smoothstep(0.7, 1.0, dot(normalize(vWorldPosition), normalize(vec3(1.0, 1.0, 0.5))));
          float spot2 = smoothstep(0.8, 1.0, dot(normalize(vWorldPosition), normalize(vec3(-0.5, 0.8, -1.0))));
          float spot3 = smoothstep(0.75, 1.0, dot(normalize(vWorldPosition), normalize(vec3(0.0, -0.3, 1.0))));
          color += colorHighlight * (spot1 * 2.0 + spot2 * 1.5 + spot3 * 1.0);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envScene.add(envMesh);
    cubeCamera.position.set(0, 0, 0);
    cubeCamera.update(renderer, envScene);

    // ---- Lighting ----
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcccccc, 0.8);
    fillLight.position.set(-6, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, -2, -6);
    scene.add(rimLight);

    const topSpot = new THREE.SpotLight(0xffffff, 3.0, 20, Math.PI / 6, 0.5);
    topSpot.position.set(0, 10, 2);
    topSpot.target.position.set(0, 0, 0);
    scene.add(topSpot);
    scene.add(topSpot.target);

    // ---- Particles (fewer on mobile for perf) ----
    const particleCount = mobile ? 100 : 300;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleBasePositions = new Float32Array(particleCount * 3);
    const particleScatteredPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 3 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particleBasePositions[i * 3] = x;
      particleBasePositions[i * 3 + 1] = y;
      particleBasePositions[i * 3 + 2] = z;

      // Scattered = 4x further out
      particleScatteredPositions[i * 3] = x * 4;
      particleScatteredPositions[i * 3 + 1] = y * 4;
      particleScatteredPositions[i * 3 + 2] = z * 4;

      // Start scattered
      particlePositions[i * 3] = x * 4;
      particlePositions[i * 3 + 1] = y * 4;
      particlePositions[i * 3 + 2] = z * 4;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: mobile ? 0.025 : 0.018,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ---- State ----
    let diamond: THREE.Group | null = null;
    let frameId = 0;

    // Entrance animation state
    const entrance = {
      active: false,
      startTime: 0,
      duration: 2.0,
      particleDur: 1.0,
    };

    const scrollState = {
      progress: 0,
      targetRotation: { x: 0, y: 0, z: 0 },
      targetPosition: { x: 0, y: 0, z: 0 },
      targetScale: 1,
      currentRotation: { x: 0, y: 0, z: 0 },
      currentPosition: { x: 0, y: 0, z: 0 },
      currentScale: 1,
    };


    // ---- Load Diamond GLTF ----
    const loader = new GLTFLoader();
    loader.load(
      "/diamond/scene.gltf",
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(mobile ? 0xb0c4de : 0x999999),
              metalness: 1.0,
              roughness: 0.0,
              reflectivity: 1.0,
              clearcoat: 1.0,
              clearcoatRoughness: 0.0,
              envMap: cubeRenderTarget.texture,
              envMapIntensity: mobile ? 4.0 : 3.0,
              transparent: true,
              opacity: mobile ? 0.95 : 0.9,
              side: THREE.DoubleSide,
              ior: 2.42,
              thickness: 2.0,
              transmission: mobile ? 0.05 : 0.3,
              sheen: 0.5,
              sheenColor: new THREE.Color(mobile ? 0xaaccff : 0xffffff),
              specularIntensity: 1.0,
              specularColor: new THREE.Color(0xffffff),
            });
            child.material = mat;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const baseScale = (mobile ? 2.2 : 2.8) / maxDim;
        model.scale.setScalar(baseScale);

        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(baseScale));

        scene.add(model);
        diamond = model;

        onProgress?.(100);
        setTimeout(() => onLoaded?.(), 400);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const progress = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress?.(progress);
        }
      },
      (error) => {
        console.error("Error loading diamond model:", error);
        onLoaded?.();
      }
    );

    // No event listener needed — entrance is driven by entranceReadyRef

    // ---- Scroll Handler ----
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      scrollState.progress = progress;

      // Different keyframes for mobile: diamond stays more centered, smaller scale
      const keyframes = mobile ? [
        { pos: { x: 0, y: 0.3, z: 0 }, scale: 1.0, rot: { x: 0, y: 0, z: 0 } },
        { pos: { x: 0, y: -0.3, z: -0.5 }, scale: 0.85, rot: { x: 1.7, y: 2.6, z: 0.35 } },
        { pos: { x: 0, y: 0, z: -2.0 }, scale: 1.8, rot: { x: 2.9, y: 4.4, z: 0.55 } },
        { pos: { x: 0, y: -0.3, z: -0.5 }, scale: 0.85, rot: { x: 3.9, y: 5.8, z: 0.4 } },
        { pos: { x: 0, y: -0.4, z: -1.5 }, scale: 1.4, rot: { x: 4.5, y: 6.6, z: 0.5 } }
      ] : [
        { pos: { x: 0, y: 0.2, z: 0 }, scale: 1.0, rot: { x: 0, y: 0, z: 0 } },
        { pos: { x: 1.8, y: 0.1, z: -0.5 }, scale: 1.15, rot: { x: 1.7, y: 2.6, z: 0.35 } },
        { pos: { x: 0, y: 0.4, z: -3.7 }, scale: 2.15, rot: { x: 2.9, y: 4.4, z: 0.55 } },
        { pos: { x: -1.8, y: 0.1, z: -0.7 }, scale: 1.15, rot: { x: 3.9, y: 5.8, z: 0.4 } },
        { pos: { x: 0.5, y: -0.8, z: -3.2 }, scale: 1.65, rot: { x: 4.5, y: 6.6, z: 0.5 } }
      ];

      let index = Math.floor(progress * 4);
      let t = (progress * 4) - index;
      if (index >= 4) { index = 3; t = 1; }

      const k1 = keyframes[index];
      const k2 = keyframes[index + 1];

      scrollState.targetPosition.x = k1.pos.x + (k2.pos.x - k1.pos.x) * t;
      scrollState.targetPosition.y = k1.pos.y + (k2.pos.y - k1.pos.y) * t;
      scrollState.targetPosition.z = k1.pos.z + (k2.pos.z - k1.pos.z) * t;
      scrollState.targetScale = k1.scale + (k2.scale - k1.scale) * t;
      scrollState.targetRotation.x = k1.rot.x + (k2.rot.x - k1.rot.x) * t;
      scrollState.targetRotation.y = k1.rot.y + (k2.rot.y - k1.rot.y) * t;
      scrollState.targetRotation.z = k1.rot.z + (k2.rot.z - k1.rot.z) * t;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    setTimeout(() => {
      const { ScrollTrigger } = require("gsap/ScrollTrigger");
      ScrollTrigger.refresh();
    }, 50);

    // ---- Animation Loop ----
    const clock = new THREE.Clock();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const SMOOTH_SPEED = mobile ? 5.5 : 4.0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const smoothing = 1 - Math.exp(-SMOOTH_SPEED * delta);

      // ── Entrance: particle compression ──
      if (entrance.active) {
        const eT = elapsed - entrance.startTime;
        const pT = Math.min(eT / entrance.particleDur, 1);
        const easedP = easeOutCubic(pT);

        const positions = particleGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const ix = i * 3;
          positions[ix]     = lerp(particleScatteredPositions[ix],     particleBasePositions[ix],     easedP);
          positions[ix + 1] = lerp(particleScatteredPositions[ix + 1], particleBasePositions[ix + 1], easedP);
          positions[ix + 2] = lerp(particleScatteredPositions[ix + 2], particleBasePositions[ix + 2], easedP);

          // After compression, add subtle float
          if (pT >= 1) {
            positions[ix]     += Math.sin(elapsed * 0.5 + i * 0.1) * 0.02;
            positions[ix + 1] += Math.sin(elapsed * 0.3 + i * 0.2) * 0.03;
            positions[ix + 2] += Math.cos(elapsed * 0.4 + i * 0.15) * 0.02;
          }
        }
        particleGeometry.attributes.position.needsUpdate = true;
      } else {
        // Before entrance: keep idle float on scattered particles
        const positions = particleGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const ix = i * 3;
          positions[ix]     = particleScatteredPositions[ix]     + Math.sin(elapsed * 0.2 + i * 0.1) * 0.05;
          positions[ix + 1] = particleScatteredPositions[ix + 1] + Math.sin(elapsed * 0.15 + i * 0.2) * 0.05;
          positions[ix + 2] = particleScatteredPositions[ix + 2] + Math.cos(elapsed * 0.18 + i * 0.15) * 0.05;
        }
        particleGeometry.attributes.position.needsUpdate = true;
      }

      if (diamond) {
        // ── Trigger entrance when prop flips and diamond is loaded ──
        if (entranceReadyRef.current && !entrance.active) {
          entrance.active = true;
          entrance.startTime = elapsed;
        }

        const idleRotX = Math.sin(elapsed * 0.25) * 0.06;
        const idleRotY = elapsed * 0.08;
        const idleRotZ = Math.cos(elapsed * 0.18) * 0.03;

        scrollState.currentRotation.x = lerp(scrollState.currentRotation.x, scrollState.targetRotation.x + idleRotX, smoothing);
        scrollState.currentRotation.y = lerp(scrollState.currentRotation.y, scrollState.targetRotation.y + idleRotY, smoothing);
        scrollState.currentRotation.z = lerp(scrollState.currentRotation.z, scrollState.targetRotation.z + idleRotZ, smoothing);

        scrollState.currentPosition.x = lerp(scrollState.currentPosition.x, scrollState.targetPosition.x, smoothing);
        scrollState.currentPosition.y = lerp(scrollState.currentPosition.y, scrollState.targetPosition.y, smoothing);
        scrollState.currentPosition.z = lerp(scrollState.currentPosition.z, scrollState.targetPosition.z, smoothing);

        scrollState.currentScale = lerp(scrollState.currentScale, scrollState.targetScale, smoothing);

        diamond.rotation.set(
          scrollState.currentRotation.x,
          scrollState.currentRotation.y,
          scrollState.currentRotation.z
        );
        diamond.position.set(
          scrollState.currentPosition.x,
          scrollState.currentPosition.y,
          scrollState.currentPosition.z
        );

        // Scale: hidden (0) until entrance, then smoothly 0 → 1
        if (entrance.active) {
          const eT = elapsed - entrance.startTime;
          const dT = Math.min(eT / entrance.duration, 1);
          const easedD = easeOutCubic(dT);
          const entranceScale = lerp(0.0, 1.0, easedD);
          diamond.scale.setScalar(scrollState.currentScale * entranceScale);
        } else {
          diamond.scale.setScalar(0);
        }

        rimLight.position.x = scrollState.currentPosition.x * 0.3 + Math.sin(elapsed * 0.3) * 2;
        rimLight.position.y = scrollState.currentPosition.y * 0.5 - 2;
      }

      // Rotate particles slowly
      particles.rotation.y = elapsed * 0.015;
      particles.rotation.x = Math.sin(elapsed * 0.008) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // ---- Resize ----
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // ---- Cleanup ----
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onLoaded, onProgress]);

  return <div ref={containerRef} className="canvas-container" />;
}
