import { useCallback, useEffect, useRef } from "react";
import "./App.css";

const fillBackground = (ctx: CanvasRenderingContext2D, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export default function DrawingTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const _handleInitAfterLoadCanvas = useCallback(() => {
    if (!canvasRef) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    canvasCtxRef.current = ctx;

    return true;
  }, []);

  useEffect(() => {
    _handleInitAfterLoadCanvas();
  }, [canvasRef]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvasCtxRef.current;
        if (ctx) {
          const dpr = 1;

          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.scale(dpr, dpr);
          fillBackground(ctx, "#1e1e1e");

          ctx.fillStyle = "#333";
          ctx.rect(0, 0, 100, 100);
          ctx.fill();

          ctx.fillStyle = "#333";
          ctx.rect(150, 0, 100, 100);
          ctx.fill();
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvasCtxRef.current;
        if (ctx) {
          const x = e.clientX - canvas.offsetLeft;
          const y = e.clientY - canvas.offsetTop;

          if (x > 0 && x < 100 && y > 0 && y < 100) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 100 + 2, 100 + 2);
          }

          if (x > 0 && x < 150 && y > 0 && y < 100) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 150 + 2, 100 + 2);
          }
        }
      }
    };

    handleResize();

    window.addEventListener("click", handleClick);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div
      style={{
        height: "100vh",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
