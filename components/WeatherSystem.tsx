import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { WeatherMode } from '../types';

interface WeatherSystemProps {
  mode: WeatherMode;
}

const WeatherSystem: React.FC<WeatherSystemProps> = ({ mode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  const snowSystemRef = useRef<THREE.Points | null>(null);
  const snowTextureRef = useRef<THREE.Texture | null>(null);

  const createSnowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Soft radial glow for snow
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  };

  useEffect(() => {
    snowTextureRef.current = createSnowTexture();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (containerRef.current) containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- SNOW SYSTEM ---
    const snowGeo = new THREE.BufferGeometry();
    const snowCount = 4000;
    const snowPos = new Float32Array(snowCount * 3);
    const snowRand = new Float32Array(snowCount);
    
    // Increased spread for better immersion
    for(let i=0; i<snowCount; i++) {
      snowPos[i*3] = (Math.random() - 0.5) * 600;     // X
      snowPos[i*3+1] = (Math.random() - 0.5) * 600;   // Y
      snowPos[i*3+2] = (Math.random() - 0.5) * 600;   // Z
      snowRand[i] = Math.random() * Math.PI * 2;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    snowGeo.setAttribute('random', new THREE.BufferAttribute(snowRand, 1));
    
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5, // Slightly larger
      map: snowTextureRef.current,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const snowSystem = new THREE.Points(snowGeo, snowMat);
    snowSystemRef.current = snowSystem;
    scene.add(snowSystem);

    // Resize
    const onResize = () => {
      if(!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // SNOW Logic
      if (snowSystemRef.current) {
        // Rotate the entire system slightly for cinematic effect
        snowSystemRef.current.rotation.y = time * 0.05; 

        const pos = snowSystemRef.current.geometry.attributes.position.array as Float32Array;
        const rand = snowSystemRef.current.geometry.attributes.random.array as Float32Array;
        
        for(let i=0; i<snowCount; i++) {
          // Increase fall speed (was 0.1, now 0.7 for clear visibility)
          pos[i*3+1] -= 0.7; 
          
          // Wind sway
          pos[i*3] += Math.sin(time + rand[i]) * 0.1; 
          
          // Reset loop
          if (pos[i*3+1] < -300) {
              pos[i*3+1] = 300;
          }
        }
        
        // Critical: Tell Three.js the positions have updated
        snowSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (containerRef.current && rendererRef.current) {
         // Check if child exists before removing to prevent errors in strict mode
         if (containerRef.current.contains(rendererRef.current.domElement)) {
            containerRef.current.removeChild(rendererRef.current.domElement);
         }
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default WeatherSystem;