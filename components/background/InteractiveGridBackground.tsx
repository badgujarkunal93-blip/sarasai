'use client';

import React, { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  maxRadius: number;
  duration: number;
}

export function InteractiveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check if fine pointer (mouse/trackpad) is supported
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;
    let isHovering = false;
    let lastMouseMoveTime = 0;

    const ripples: Ripple[] = [];
    const GRID_SPACING = 24;
    const INFLUENCE_RADIUS = 130;
    const MAX_DISPLACEMENT = 2.5;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      draw();
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      isHovering = true;
      lastMouseMoveTime = performance.now();
      requestTick();
    };

    const handleMouseLeave = () => {
      isHovering = false;
      targetMouseX = -1000;
      targetMouseY = -1000;
      lastMouseMoveTime = performance.now();
      requestTick();
    };

    // Trigger subtle ripple ONLY when clicking empty background areas
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if clicked element is an interactive control, form, link, button, or card
      const isInteractive = Boolean(
        target.closest(
          'button, a, input, select, textarea, [role="button"], form, aside, header, nav, dialog, [tabindex], [data-interactive]'
        ) ||
        target.closest('[class*="shadow-neo"], [class*="neo-"], [class*="badge-"]') ||
        target.closest('article, section > div, [class*="rounded-2xl"], [class*="rounded-3xl"]')
      );

      if (!isInteractive) {
        ripples.push({
          x: e.clientX,
          y: e.clientY,
          startTime: performance.now(),
          maxRadius: 120,
          duration: 550,
        });
        requestTick();
      }
    };

    let isRunning = false;
    const requestTick = () => {
      if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    };

    const renderLoop = (timestamp: number) => {
      // Smooth lerp mouse position
      if (mouseX === -1000 && targetMouseX !== -1000) {
        mouseX = targetMouseX;
        mouseY = targetMouseY;
      } else {
        mouseX += (targetMouseX - mouseX) * 0.18;
        mouseY += (targetMouseY - mouseY) * 0.18;
      }

      draw(timestamp);

      // Clean up finished ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const elapsed = timestamp - ripples[i].startTime;
        if (elapsed >= ripples[i].duration) {
          ripples.splice(i, 1);
        }
      }

      const isMouseActive = isHovering && (performance.now() - lastMouseMoveTime < 1200 || Math.abs(targetMouseX - mouseX) > 0.5);
      const hasActiveRipples = ripples.length > 0;

      if (isMouseActive || hasActiveRipples) {
        animationFrameId = requestAnimationFrame(renderLoop);
      } else {
        isRunning = false;
      }
    };

    const draw = (timestamp: number = performance.now()) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Subtle cursor spotlight on paper canvas
      if (isHovering && mouseX > -100) {
        const glowGradient = ctx.createRadialGradient(
          mouseX,
          mouseY,
          0,
          mouseX,
          mouseY,
          INFLUENCE_RADIUS + 30
        );
        // Extremely faint lime glow on warm paper
        glowGradient.addColorStop(0, 'rgba(184, 255, 61, 0.08)');
        glowGradient.addColorStop(0.5, 'rgba(184, 255, 61, 0.03)');
        glowGradient.addColorStop(1, 'rgba(184, 255, 61, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, INFLUENCE_RADIUS + 30, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render Ripple Waves
      for (const ripple of ripples) {
        const elapsed = timestamp - ripple.startTime;
        const progress = Math.min(1, elapsed / ripple.duration);
        const currentRadius = ripple.maxRadius * Math.sin((progress * Math.PI) / 2);
        const alpha = (1 - progress) * 0.18;

        ctx.strokeStyle = `rgba(184, 255, 61, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(17, 18, 24, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, Math.max(0, currentRadius - 8), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Render Dot Grid
      const cols = Math.ceil(width / GRID_SPACING) + 1;
      const rows = Math.ceil(height / GRID_SPACING) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * GRID_SPACING;
          const originY = r * GRID_SPACING;

          let posX = originX;
          let posY = originY;
          let dotRadius = 0.9;
          let alpha = 0.09; // Baseline subtle paper dot
          let color = '17, 18, 24'; // Baseline ink dark gray

          if (isFinePointer && isHovering && mouseX > -100) {
            const dx = mouseX - originX;
            const dy = mouseY - originY;
            const dist = Math.hypot(dx, dy);

            if (dist < INFLUENCE_RADIUS) {
              const factor = (1 - dist / INFLUENCE_RADIUS);
              const smoothFactor = factor * factor;

              // Subtle organic magnetic lean toward pointer (max 2.5px)
              posX = originX + (dx / (dist || 1)) * smoothFactor * MAX_DISPLACEMENT;
              posY = originY + (dy / (dist || 1)) * smoothFactor * MAX_DISPLACEMENT;

              // Increase dot prominence smoothly near cursor
              alpha = 0.09 + smoothFactor * 0.28;
              dotRadius = 0.9 + smoothFactor * 0.75;

              // Slight lime highlight for dots right under cursor
              if (smoothFactor > 0.45) {
                color = '20, 24, 15';
              }
            }
          }

          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    if (isFinePointer) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (isFinePointer) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('pointerdown', handlePointerDown);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 select-none transition-opacity duration-300"
      style={{
        width: '100vw',
        height: '100vh',
      }}
    />
  );
}
