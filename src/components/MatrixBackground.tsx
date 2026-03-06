"use client";

import { useEffect, useRef } from "react";

/** Ghost Trading background: faint tickers, Buy/Sell, candlesticks. Very subtle. */
const TICKERS = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "Buy", "Sell", "↑", "↓"];
const FONT_SIZE = 12;
const DROP_SPEED = 0.6; // 50% slower than before
const TEXT_FILL = "rgba(0, 255, 65, 0.15)";
const FADE_FILL = "rgba(0, 0, 0, 0.1)";

function pickToken() {
  return TICKERS[Math.floor(Math.random() * TICKERS.length)];
}

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const columns: { y: number; tokens: string[] }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;

      const colWidth = 56;
      const numCols = Math.ceil(w / colWidth);
      while (columns.length < numCols) {
        columns.push({
          y: Math.random() * -h,
          tokens: Array.from({ length: 6 }, pickToken),
        });
      }
      while (columns.length > numCols) columns.pop();
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = FADE_FILL;
      ctx.fillRect(0, 0, w, h);

      const colWidth = 56;
      columns.forEach((col, i) => {
        const x = i * colWidth + 4;
        col.y += DROP_SPEED;
        if (col.y > h + FONT_SIZE * 3) col.y = -FONT_SIZE * 3;

        col.tokens.forEach((token, j) => {
          const y = col.y + j * (FONT_SIZE + 4);
          if (y < -FONT_SIZE || y > h + FONT_SIZE) return;
          const alpha = 0.15 * (1 - j * 0.08);
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.fillText(token, x, y);
        });
        if (Math.random() < 0.015) col.tokens[0] = pickToken();
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-10] pointer-events-none"
      aria-hidden
    />
  );
}
