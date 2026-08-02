"use client";
/* ═══════════ لوحُ الرسم — بإصبعٍ أو قلمٍ أو فأرة ═══════════
   يرسم في شبكةٍ ٠..١٠٠٠ لا ببكسلات الشاشة، فالرسمةُ تُعاد بأي مقاسٍ بلا تشويش
   وتُخزَّن أرقاماً صحيحةً صغيرة. الحساب كلُّه في `journal.ts`؛ هذا عرضٌ ولمس. */
import { useEffect, useRef, useState } from "react";
import { GRID, finishStroke, undoStroke, type Stroke } from "@/lib/journal/journal";

const PALETTE = ["var(--text)", "#60A5FA", "#F59E0B", "#EF4444", "#10B981"];
const WIDTHS = [3, 6, 12];

/** يرسم خطوطاً على canvas بمقاسه الحاليّ — تُستعمل في اللوح وفي المعاينة. */
export function paintStrokes(cv: HTMLCanvasElement, strokes: Stroke[]): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const sx = w / GRID, sy = h / GRID;
  const scale = Math.min(sx, sy);
  for (const s of strokes) {
    if (s.pts.length < 2) continue;
    ctx.strokeStyle = s.color.startsWith("var(")
      ? getComputedStyle(cv).color   // ألوانُ الثيم تُحلّ من العنصر نفسه
      : s.color;
    ctx.lineWidth = Math.max(1, s.width * scale);
    ctx.beginPath();
    ctx.moveTo(s.pts[0] * sx, s.pts[1] * sy);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * sx, s.pts[i + 1] * sy);
    if (s.pts.length === 2) ctx.lineTo(s.pts[0] * sx + 0.1, s.pts[1] * sy + 0.1); // نقطةٌ مفردة
    ctx.stroke();
  }
}

/** معاينةٌ صغيرة للرسمة داخل بطاقة الورقة. */
export function StrokesPreview({ strokes, height = 120 }: { strokes: Stroke[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    paintStrokes(cv, strokes);
    const ro = new ResizeObserver(() => paintStrokes(cv, strokes));
    ro.observe(cv);
    return () => ro.disconnect();
  }, [strokes]);
  return <canvas ref={ref} className="w-full rounded-xl" style={{ height, color: "var(--text)" }} aria-label="رسمة" />;
}

export default function DrawPad({
  value, onChange, height = 300,
}: { value: Stroke[]; onChange: (s: Stroke[]) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[1]);

  const repaint = () => {
    const cv = ref.current;
    if (!cv) return;
    paintStrokes(cv, live.current ? [...value, live.current] : value);
  };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    repaint();
    const ro = new ResizeObserver(repaint);
    ro.observe(cv);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * GRID, ((e.clientY - r.top) / r.height) * GRID];
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toGrid(e);
    live.current = { color, width, pts: [x, y] };
    repaint();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!live.current) return;
    const [x, y] = toGrid(e);
    live.current.pts.push(x, y);
    repaint();
  };
  const up = () => {
    if (!live.current) return;
    const done = finishStroke(live.current);
    live.current = null;
    onChange([...value, done]);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <canvas
        ref={ref}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        className="w-full rounded-2xl"
        style={{ height, touchAction: "none", background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)", cursor: "crosshair" }}
        aria-label="لوح الرسم"
      />
      {/* صفّان لا صفّ: تسعةُ أزرارٍ في سطرٍ واحد تلتفّ على شاشة ٣٩٠ فيهبط زرٌّ وحده */}
      <div className="flex items-center gap-2">
        {PALETTE.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={`لون ${c}`} aria-pressed={color === c}
            className="w-8 h-8 rounded-full transition active:scale-90"
            style={{ background: c, border: `2.5px solid ${color === c ? "var(--accent-light)" : "var(--border)"}` }} />
        ))}
        <span className="w-px h-6 mx-1" style={{ background: "var(--border)" }} />
        {WIDTHS.map((w) => (
          <button key={w} type="button" onClick={() => setWidth(w)} aria-label={`سماكة ${w}`} aria-pressed={width === w}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-90"
            style={{ background: width === w ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--surface2)", border: `1.5px solid ${width === w ? "var(--accent)" : "var(--border)"}` }}>
            <span className="rounded-full" style={{ width: w, height: w, background: "var(--text)" }} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(undoStroke(value))} disabled={value.length === 0}
          className="flex-1 t-caption font-black py-2.5 rounded-xl disabled:opacity-40"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          ↩︎ تراجع
        </button>
        <button type="button" onClick={() => onChange([])} disabled={value.length === 0}
          className="flex-1 t-caption font-black py-2.5 rounded-xl disabled:opacity-40"
          style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
          امسح الكل
        </button>
      </div>
    </div>
  );
}
