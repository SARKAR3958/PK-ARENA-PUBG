import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  glow: number;
  // Specific properties for themes
  wobble?: number;
  wobbleSpeed?: number;
  angle?: number;
  pulseSpeed?: number;
  pulsePhase?: number;
  baseOpacity?: number;
  baseSize?: number;
  particleType?: 'circle' | 'star' | 'snow' | 'sparkle';
}

const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  if (!hex) return { r: 234, g: 179, b: 8 };
  
  // If already an rgb/rgba format
  if (hex.startsWith('rgb')) {
    const match = hex.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10)
      };
    }
  }

  const cleanHex = hex.trim().toLowerCase();
  if (cleanHex === 'white') return { r: 255, g: 255, b: 255 };
  if (cleanHex === 'red') return { r: 239, g: 68, b: 68 };
  if (cleanHex === 'blue') return { r: 59, g: 130, b: 246 };
  if (cleanHex === 'green') return { r: 34, g: 197, b: 94 };
  if (cleanHex === 'yellow') return { r: 234, g: 179, b: 8 };
  if (cleanHex === 'gold') return { r: 234, g: 179, b: 8 };

  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = cleanHex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 234, g: 179, b: 8 }; // default gold
};

export function GoldenParticlesBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { appSettings } = useApp();
  const enabled = appSettings?.backgroundParticlesEnabled ?? true; 
  const theme = appSettings?.backgroundTheme || 'gold_floating';
  const colorHex = appSettings?.backgroundParticleColor || '#eab308';
  const opacityMultiplier = ((appSettings?.backgroundParticleOpacity ?? 80) / 100) * 2.0;
  const particleType = appSettings?.backgroundParticleType || 'circle';
  
  if (!enabled) return null;

  const rgb = hexToRgb(colorHex);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<Particle> = [];

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || window.innerWidth;
      canvas.height = rect?.height || window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const numParticles = Math.min(10, Math.floor((canvas.width * canvas.height) / 40000));
      particles = [];

      for (let i = 0; i < numParticles; i++) {
        const baseScale = 1.1; // Make all particle types slightly smaller and completely uniform!
        const size = (Math.random() * 2 + 1) * baseScale;
        const baseOpacity = Math.random() * 0.5 + 0.15;
        
        if (theme === 'snow_fall') {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size,
            speedX: (Math.random() - 0.5) * 0.1, // very slow sway
            speedY: Math.random() * 0.6 + 0.3,   // falling down
            opacity: baseOpacity,
            glow: Math.random() * 3 + 1,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.02 + 0.01,
            particleType,
          });
        } else if (theme === 'shooting_stars') {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size,
            speedX: Math.random() * 0.6 + 0.4,   // fast sideways
            speedY: Math.random() * 0.6 + 0.4,   // fast downwards (diagonal)
            opacity: baseOpacity,
            glow: Math.random() * 5 + 2,
            particleType,
          });
        } else if (theme === 'breathing_stars') {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size,
            speedX: 0,
            speedY: 0,
            opacity: baseOpacity,
            glow: Math.random() * 4 + 1,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.02 + 0.005,
            baseOpacity,
            baseSize: size,
            particleType,
          });
        } else if (theme === 'swirling_chaos') {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size,
            speedX: (Math.random() - 0.5) * 0.2,
            speedY: -(Math.random() * 0.3 + 0.1),
            opacity: baseOpacity,
            glow: Math.random() * 3 + 1,
            angle: Math.random() * Math.PI * 2,
            particleType,
          });
        } else {
          // Default: gold_floating
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: -(Math.random() * 0.4 + 0.1),
            opacity: baseOpacity,
            glow: Math.random() * 3 + 1,
            particleType,
          });
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (theme === 'snow_fall') {
          p.y += p.speedY;
          if (p.wobble !== undefined && p.wobbleSpeed !== undefined) {
            p.wobble += p.wobbleSpeed;
            p.x += Math.sin(p.wobble) * 0.25 + p.speedX;
          }
          
          if (p.y > canvas.height) {
            p.y = 0;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;

        } else if (theme === 'shooting_stars') {
          p.x += p.speedX;
          p.y += p.speedY;

          if (p.y > canvas.height || p.x > canvas.width) {
            p.y = 0;
            p.x = Math.random() * canvas.width;
          }

        } else if (theme === 'breathing_stars') {
          if (p.pulsePhase !== undefined && p.pulseSpeed !== undefined && p.baseOpacity !== undefined && p.baseSize !== undefined) {
            p.pulsePhase += p.pulseSpeed;
            p.opacity = p.baseOpacity * (0.3 + 0.7 * Math.abs(Math.sin(p.pulsePhase)));
            p.size = p.baseSize * (0.8 + 0.4 * Math.sin(p.pulsePhase));
          }

        } else if (theme === 'swirling_chaos') {
          p.y += p.speedY;
          if (p.angle !== undefined) {
            p.angle += 0.015;
            p.x += Math.sin(p.angle) * 0.4 + p.speedX;
          }

          if (p.y < 0) {
            p.y = canvas.height;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;

        } else {
          // gold_floating
          p.x += p.speedX;
          p.y += p.speedY;

          if (p.y < 0) {
            p.y = canvas.height;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
        }

        // Draw particle
        ctx.beginPath();
        
        if (theme === 'shooting_stars') {
          // Star trail glow (thick, transparent)
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.speedX * 3, p.y - p.speedY * 3);
          ctx.lineWidth = p.size * 2.5;
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 0.15)})`;
          ctx.stroke();

          // Star trail core (thin)
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.speedX * 3, p.y - p.speedY * 3);
          ctx.lineWidth = p.size;
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier)})`;
          ctx.stroke();
        } else {
          if (p.particleType === 'star') {
            const spikes = 5;
            
            // Draw star glow (larger, faint)
            ctx.beginPath();
            const outerRadiusGlow = p.size * 3;
            const innerRadiusGlow = p.size * 1.5;
            let rotGlow = Math.PI / 2 * 3;
            let xGlow = p.x;
            let yGlow = p.y;
            let stepGlow = Math.PI / spikes;
            ctx.moveTo(p.x, p.y - outerRadiusGlow);
            for (let i = 0; i < spikes; i++) {
                xGlow = p.x + Math.cos(rotGlow) * outerRadiusGlow;
                yGlow = p.y + Math.sin(rotGlow) * outerRadiusGlow;
                ctx.lineTo(xGlow, yGlow);
                rotGlow += stepGlow;
                xGlow = p.x + Math.cos(rotGlow) * innerRadiusGlow;
                yGlow = p.y + Math.sin(rotGlow) * innerRadiusGlow;
                ctx.lineTo(xGlow, yGlow);
                rotGlow += stepGlow;
            }
            ctx.lineTo(p.x, p.y - outerRadiusGlow);
            ctx.closePath();
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 0.15)})`;
            ctx.fill();

            // Draw star core (actual size)
            ctx.beginPath();
            const outerRadius = p.size * 2;
            const innerRadius = p.size;
            let rot = Math.PI / 2 * 3;
            let x = p.x;
            let y = p.y;
            let step = Math.PI / spikes;
            ctx.moveTo(p.x, p.y - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = p.x + Math.cos(rot) * outerRadius;
                y = p.y + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;
                x = p.x + Math.cos(rot) * innerRadius;
                y = p.y + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(p.x, p.y - outerRadius);
            ctx.closePath();
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier)})`;
            ctx.fill();
} else if (p.particleType === 'snow') {
             // Draw snow glow (thicker, transparent line)
             const numBranches = 6;
             ctx.beginPath();
             for (let i = 0; i < numBranches; i++) {
                 const angle = (i * Math.PI * 2) / numBranches;
                 const endX = p.x + Math.cos(angle) * p.size;
                 const endY = p.y + Math.sin(angle) * p.size;
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(endX, endY);
                 
                 const forkDist = p.size * 0.6;
                 const forkX = p.x + Math.cos(angle) * forkDist;
                 const forkY = p.y + Math.sin(angle) * forkDist;
                 const forkAngle = Math.PI / 4;
                 const forkSize = p.size * 0.4;
                 
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle + forkAngle) * forkSize, forkY + Math.sin(angle + forkAngle) * forkSize);
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle - forkAngle) * forkSize, forkY + Math.sin(angle - forkAngle) * forkSize);
             }
             ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 0.3)})`;
             ctx.lineWidth = 4.0;
             ctx.stroke();

             // Draw snow core
             ctx.beginPath();
             for (let i = 0; i < numBranches; i++) {
                 const angle = (i * Math.PI * 2) / numBranches;
                 const endX = p.x + Math.cos(angle) * p.size;
                 const endY = p.y + Math.sin(angle) * p.size;
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(endX, endY);
                 
                 const forkDist = p.size * 0.6;
                 const forkX = p.x + Math.cos(angle) * forkDist;
                 const forkY = p.y + Math.sin(angle) * forkDist;
                 const forkAngle = Math.PI / 4;
                 const forkSize = p.size * 0.4;
                 
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle + forkAngle) * forkSize, forkY + Math.sin(angle + forkAngle) * forkSize);
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle - forkAngle) * forkSize, forkY + Math.sin(angle - forkAngle) * forkSize);
             }
             ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 2.0)})`;
             ctx.lineWidth = 1.8;
             ctx.stroke();
          } else if (p.particleType === 'sparkle') {
             // Draw sparkle glow (larger, faint)
             const drawSingleSparkle = (cx: number, cy: number, s: number) => {
                 ctx.moveTo(cx, cy - s);
                 ctx.quadraticCurveTo(cx, cy, cx + s, cy);
                 ctx.quadraticCurveTo(cx, cy, cx, cy + s);
                 ctx.quadraticCurveTo(cx, cy, cx - s, cy);
                 ctx.quadraticCurveTo(cx, cy, cx, cy - s);
             };
             ctx.beginPath();
             drawSingleSparkle(p.x, p.y, p.size * 2.2);
             drawSingleSparkle(p.x + p.size * 1.2, p.y - p.size * 1.2, p.size * 1.1);
             drawSingleSparkle(p.x - p.size * 1.0, p.y + p.size * 0.8, p.size * 0.8);
             ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 0.15)})`;
             ctx.fill();

             // Draw sparkle core
             ctx.beginPath();
             drawSingleSparkle(p.x, p.y, p.size * 1.5);
             drawSingleSparkle(p.x + p.size * 1.2, p.y - p.size * 1.2, p.size * 0.7);
             drawSingleSparkle(p.x - p.size * 1.0, p.y + p.size * 0.8, p.size * 0.5);
             ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 2.0)})`;
             ctx.fill();
          } else {
            // Draw circle glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier * 0.12)})`;
            ctx.fill();

            // Draw circle core
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, p.opacity * opacityMultiplier)})`;
            ctx.fill();
          }
        }

        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    handleResize();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [theme, colorHex, opacityMultiplier, particleType, enabled]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
