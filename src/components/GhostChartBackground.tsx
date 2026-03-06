"use client";

import { useEffect, useRef } from "react";

const GRID_OPACITY = 0.02;
const CANDLE_OPACITY = 0.04;
const LINE_OPACITY = 0.03;
const DRIFT_SPEED = 0.15; // px per frame, right-to-left
const CANDLE_WIDTH = 8;
const CANDLE_GAP = 4;
const GRID_SPACING = 48;
const DOT_SPACING = 4;

/** Ghost technical chart: dotted grid, candlesticks, S/R lines. Contained in parent. */
export function GhostChartBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let offsetX = 0;

    // Pre-generate a strip of candlesticks [open, high, low, close] normalized 0..1
    const candleStrip: { o: number; h: number; l: number; c: number }[] = [];
    let v = 0.5;
    for (let i = 0; i < 80; i++) {
      v = Math.max(0.1, Math.min(0.9, v + (Math.random() - 0.48) * 0.3));
      const o = v;
      const h = Math.min(0.95, o + Math.random() * 0.15);
      const l = Math.max(0.05, o - Math.random() * 0.15);
      const c = l + Math.random() * (h - l);
      candleStrip.push({ o, h, l, c });
    }

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = canvas.width;
      const h = canvas.height;
      const lw = w / dpr;
      const lh = h / dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dotted grid (vertical and horizontal) in logical pixels
      ctx.strokeStyle = `rgba(255, 255, 255, ${GRID_OPACITY})`;
      ctx.setLineDash([DOT_SPACING, DOT_SPACING]);
      ctx.lineWidth = 1;

      const startX = offsetX % GRID_SPACING;
      for (let x = startX - GRID_SPACING; x < lw + GRID_SPACING; x += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, lh);
        ctx.stroke();
      }
      for (let y = 0; y < lh + GRID_SPACING; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(lw + GRID_SPACING, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Horizontal dashed support/resistance lines (3 lines)
      ctx.strokeStyle = `rgba(255, 255, 255, ${LINE_OPACITY})`;
      ctx.setLineDash([8, 8]);
      const levels = [0.25, 0.5, 0.75];
      levels.forEach((pct) => {
        const y = pct * lh;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(lw + 200, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Candlesticks: draw strip that drifts left
      const candleTotalWidth = CANDLE_WIDTH + CANDLE_GAP;
      const baseX = (offsetX % candleTotalWidth) - candleTotalWidth * 2;
      const numVisible = Math.ceil((lw + 100) / candleTotalWidth) + 4;
      const range = 0.85;
      const base = 0.08;

      for (let i = 0; i < numVisible; i++) {
        const idx = Math.floor((offsetX / candleTotalWidth + i) % candleStrip.length);
        if (idx < 0) continue;
        const c = candleStrip[idx];
        const x = baseX + i * candleTotalWidth + CANDLE_GAP / 2;
        const isGreen = c.c >= c.o;

        const yOpen = lh * (1 - base - c.o * range);
        const yClose = lh * (1 - base - c.c * range);
        const yHigh = lh * (1 - base - c.h * range);
        const yLow = lh * (1 - base - c.l * range);

        const top = Math.min(yOpen, yClose);
        const bodyH = Math.max(2, Math.abs(yClose - yOpen));
        const bodyW = CANDLE_WIDTH;

        if (isGreen) {
          ctx.fillStyle = `rgba(16, 185, 129, ${CANDLE_OPACITY})`;
          ctx.strokeStyle = `rgba(16, 185, 129, ${CANDLE_OPACITY})`;
        } else {
          ctx.fillStyle = `rgba(244, 63, 94, ${CANDLE_OPACITY})`;
          ctx.strokeStyle = `rgba(244, 63, 94, ${CANDLE_OPACITY})`;
        }

        // Wick
        ctx.beginPath();
        ctx.moveTo(x + bodyW / 2, yHigh);
        ctx.lineTo(x + bodyW / 2, yLow);
        ctx.stroke();

        // Body
        ctx.fillRect(x, top, bodyW, bodyH);
        ctx.strokeRect(x, top, bodyW, bodyH);
      }

      offsetX += DRIFT_SPEED;
      animationId = requestAnimationFrame(draw);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[-10] pointer-events-none w-full h-full"
      aria-hidden
    />
  );
}
