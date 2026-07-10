"use client";

import { useEffect, useRef } from "react";

type ParticleType = "dust" | "leaf" | "wisp";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  color: string;
  wobble?: number;
  wobbleSpeed?: number;
}

export function TreeCanvasOverlay({ level }: { level: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    
    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    const createDust = () => {
      particles.push({
        type: "dust",
        x: random(0, canvas.width),
        y: random(canvas.height * 0.4, canvas.height),
        vx: random(-0.2, 0.2),
        vy: random(-0.8, -0.2),
        size: random(1, 2.5),
        life: 0,
        maxLife: random(100, 300),
        color: Math.random() > 0.5 ? "#fef08a" : "#67e8f9",
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(0.02, 0.08),
      });
    };

    const createLeaf = () => {
      const colors = ["#f472b6", "#a78bfa", "#34d399", "#fbbf24"]; 
      particles.push({
        type: "leaf",
        x: random(canvas.width * 0.2, canvas.width * 0.8),
        y: random(0, canvas.height * 0.5),
        vx: random(-0.5, 0.5),
        vy: random(0.3, 1.2),
        size: random(2, 4),
        life: 0,
        maxLife: random(200, 400),
        color: colors[Math.floor(random(0, colors.length))],
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(0.01, 0.05),
      });
    };

    const createWisp = () => {
      particles.push({
        type: "wisp",
        x: random(canvas.width * 0.3, canvas.width * 0.7),
        y: random(canvas.height * 0.6, canvas.height),
        vx: random(-0.1, 0.1),
        vy: random(-1.5, -0.5),
        size: random(4, 8),
        life: 0,
        maxLife: random(150, 250),
        color: "rgba(255, 255, 255, 0.8)",
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.05 * level) createDust();
      if (level >= 2 && Math.random() < 0.02 * (level - 1)) createLeaf();
      if (level >= 3 && Math.random() < 0.03 * (level - 2)) createWisp();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        if (p.type === "dust") {
          p.wobble! += p.wobbleSpeed!;
          p.x += p.vx + Math.sin(p.wobble!) * 0.5;
          p.y += p.vy;
          ctx.globalAlpha = Math.abs(Math.sin(p.life * 0.05)) * (1 - (p.life / p.maxLife));
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else if (p.type === "leaf") {
          p.wobble! += p.wobbleSpeed!;
          p.x += p.vx + Math.sin(p.wobble!) * 1.5;
          p.y += p.vy;
          ctx.globalAlpha = 1 - (p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
        } else if (p.type === "wisp") {
          p.x += p.vx;
          p.y += p.vy;
          p.size += 0.01;
          ctx.globalAlpha = (1 - (p.life / p.maxLife)) * 0.2; 
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.life >= p.maxLife || p.y > canvas.height || p.y < -10) {
          particles.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none mix-blend-screen"
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
