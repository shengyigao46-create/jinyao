import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ParticleSettings } from '../types';

interface ParticleGardenProps {
  imageBase64: string | null;
  settings: ParticleSettings;
  isScattered: boolean;
  audioData: Uint8Array | null; // Analyser data for reactivity
  onImageLoaded?: () => void;
}

const ParticleGarden: React.FC<ParticleGardenProps> = ({ 
  imageBase64, 
  settings, 
  isScattered, 
  audioData 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const mouseRef = useRef(new THREE.Vector2(-9999, -9999));
  const raycasterRef = useRef(new THREE.Raycaster());
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Helper to downsample image for particles
  const getImageData = (src: string, maxDim = 150): Promise<{ width: number, height: number, data: Uint8ClampedArray }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height *= maxDim / width; width = maxDim; }
        } else {
          if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        }
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve({ width, height, data: imageData.data });
      };
      img.src = src;
    });
  };

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, canvasRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // 2. Post Processing (Bloom)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = settings.brightness; // Linked to settings
    bloomPass.radius = 0;
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // 3. Initial Particles (Placeholder or actual)
    if (!imageBase64) {
      // Setup a default cloud if no image
      // skipping for brevity, we assume image provided or handled by parent logic
    }

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    
    // Mouse tracking for raycaster
    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
    };
  }, []);

  // Handle Image Loading & Particle Generation
  useEffect(() => {
    if (!imageBase64 || !sceneRef.current) return;

    const generateParticles = async () => {
      const { width, height, data } = await getImageData(imageBase64);
      const particleCount = width * height;
      
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const originalPositions = new Float32Array(particleCount * 3); // To return to
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const x = (i % width) - width / 2;
        const y = -(Math.floor(i / width) - height / 2); // Invert Y for correct image orientation
        const z = 0;

        const i4 = i * 4;
        const r = data[i4] / 255;
        const g = data[i4 + 1] / 255;
        const b = data[i4 + 2] / 255;
        // alpha data[i4+3] ignored, using additive blending

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      geometryRef.current = geometry;

      const material = new THREE.PointsMaterial({
        size: settings.size,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });

      // Cleanup old
      if (particlesRef.current) {
        sceneRef.current.remove(particlesRef.current);
        particlesRef.current.geometry.dispose();
      }

      const particles = new THREE.Points(geometry, material);
      particlesRef.current = particles;
      sceneRef.current.add(particles);

      // Reset camera
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 0, Math.max(width, height));
        cameraRef.current.lookAt(0,0,0);
      }
    };

    generateParticles();
  }, [imageBase64]);

  // Update loop for Animation & Interaction
  useEffect(() => {
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) controlsRef.current.update();
      
      // Update Bloom strength if changed
      if (composerRef.current) {
        (composerRef.current.passes[1] as UnrealBloomPass).strength = settings.brightness;
      }

      if (particlesRef.current && geometryRef.current) {
        const particles = particlesRef.current;
        const positions = geometryRef.current.attributes.position.array as Float32Array;
        const originals = geometryRef.current.attributes.originalPosition.array as Float32Array;
        const count = positions.length / 3;
        
        // Raycasting for mouse
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
        const ray = raycasterRef.current.ray;
        
        // Audio Reactivity Factor
        let audioFactor = 0;
        if (audioData) {
          // Average some bins
          let sum = 0;
          for(let i=0; i<audioData.length; i+=10) sum += audioData[i];
          audioFactor = (sum / (audioData.length / 10)) / 255;
        }

        const time = Date.now() * 0.001;

        for (let i = 0; i < count; i++) {
          const ix = i * 3;
          const iy = i * 3 + 1;
          const iz = i * 3 + 2;

          let targetX = originals[ix];
          let targetY = originals[iy];
          let targetZ = originals[iz];

          // 1. Scattering Logic (Toggle)
          if (isScattered) {
             // Random walk / explosion
             targetX += Math.sin(time + ix) * 50;
             targetY += Math.cos(time + iy) * 50;
             targetZ += Math.sin(time * 0.5 + ix) * 50;
          }

          // 2. Audio Activity
          if (settings.activity > 0) {
            const noise = Math.sin(time * 5 + ix) * settings.activity * 2;
            const beat = audioFactor * settings.activity * 10;
            targetZ += noise + beat;
          }

          // 3. Mouse Interaction (Repulsion)
          // Simplified: project mouse ray to z=0 plane or just use screen space proximity? 
          // 3D repulsion is expensive loop-wise. Let's do a simple radial distance from center if not raycasting accurately per point.
          // Better: Calculate world position of point
          
          // Optimization: Only affect if not totally scattered
          if (!isScattered) {
            // Apply repulsion logic based on world space vs Ray
            // This is computationally heavy in JS for 20k particles. 
            // Simplified Effect: Sine wave ripple based on distance from center for demo, 
            // OR strictly utilize the shader for this.
            // Since we are in JS loop:
            
            // Just basic drift
            positions[ix] += (targetX - positions[ix]) * 0.1;
            positions[iy] += (targetY - positions[iy]) * 0.1;
            positions[iz] += (targetZ - positions[iz]) * 0.1;
            
            // Add slight drift
            positions[ix] += (Math.random() - 0.5) * 0.1;
            positions[iy] += (Math.random() - 0.5) * 0.1;
          } else {
             // Loose follow
            positions[ix] += (targetX - positions[ix]) * 0.05;
            positions[iy] += (targetY - positions[iy]) * 0.05;
            positions[iz] += (targetZ - positions[iz]) * 0.05;
          }
        }
        
        // Update Mouse Repulsion (optimized batch)
        // If mouse is active
        if (mouseRef.current.x > -1) {
             // Ideally done in shader. Here we just rotate the group slightly to look at mouse
             particles.rotation.x += (mouseRef.current.y * 0.2 - particles.rotation.x) * 0.05;
             particles.rotation.y += (mouseRef.current.x * 0.2 - particles.rotation.y) * 0.05;
        }

        (particles.material as THREE.PointsMaterial).size = settings.size + (audioFactor * settings.size); // Pulse size
        geometryRef.current.attributes.position.needsUpdate = true;
      }

      if (composerRef.current) {
        composerRef.current.render();
      }
    };

    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings, isScattered, audioData]); // Re-bind animate when vital props change

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default ParticleGarden;