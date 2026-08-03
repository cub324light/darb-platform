"use client";
/* ═══════════ لوحُ الرسم — بإصبعٍ أو قلمٍ أو فأرة ═══════════
   يرسم في شبكةٍ ٠..١٠٠٠ لا ببكسلات الشاشة، فالرسمةُ تُعاد بأي مقاسٍ بلا تشويش
   وتُخزَّن أرقاماً صحيحةً صغيرة. الحساب كلُّه في `journal.ts`؛ هذا عرضٌ ولمس.

   الأدوات: قلمٌ حرّ · خطّ · مستطيل · دائرة · سهم · ممحاة. والأشكالُ تُخزَّن
   بنقطتين لا بمئات النقاط — أصغرُ حجماً وأدقُّ رسماً. */
import { useEffect, useRef, useState } from "react";
import { GRID, finishStroke, undoStroke, makeShape, eraseAt, type Stroke, type StrokeShape } from "@/lib/journal/journal";

const PALETTE = ["var(--text)", "#60A5FA", "#F59E0B", "#EF4444", "#10B981"];
const WIDTHS = [3, 6, 12];

type Tool = StrokeShape | "erase";
const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "free",    icon: "✏️", label: "قلم" },
  { id: "line",    icon: "／", label: "خطّ" },
  { id: "rect",    icon: "▭", label: "مستطيل" },
  { id: "ellipse", icon: "◯", label: "دائرة" },
  { id: "arrow",   icon: "→", label: "سهم" },
  { id: "erase",   icon: "🩹", label: "ممحاة" },
];

const ERASE_RADIUS = 26;   // في وحدات الشبكة

function strokeColor(cv: HTMLCanvasElement, c: string): string {
  return c.startsWith("var(") ? getComputedStyle(cv).color : c;
}

/** يرسم خطّاً واحداً — حرّاً كان أو شكلاً. */
function drawOne(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, s: Stroke, sx: number, sy: number, scale: number) {
  if (s.pts.length < 2) return;
  ctx.strokeStyle = strokeColor(cv, s.color);
  ctx.lineWidth = Math.max(1, s.width * scale);
  ctx.beginPath();
  const shape = s.shape ?? "free";
  const [x0, y0, x1, y1] = s.pts;

  if (shape === "rect" && s.pts.length >= 4) {
    ctx.rect(x0 * sx, y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy);
  } else if (shape === "ellipse" && s.pts.length >= 4) {
    ctx.ellipse(((x0 + x1) / 2) * sx, ((y0 + y1) / 2) * sy,
      Math.abs(x1 - x0) / 2 * sx, Math.abs(y1 - y0) / 2 * sy, 0, 0, Math.PI * 2);
  } else if ((shape === "line" || shape === "arrow") && s.pts.length >= 4) {
    ctx.moveTo(x0 * sx, y0 * sy);
    ctx.lineTo(x1 * sx, y1 * sy);
    if (shape === "arrow") {
      /* رأسُ السهم: خطّان يرجعان بزاويةٍ من النهاية */
      const a = Math.atan2((y1 - y0) * sy, (x1 - x0) * sx);
      const head = Math.max(8, s.width * scale * 3);
      for (const off of [Math.PI - 0.4, Math.PI + 0.4]) {
        ctx.moveTo(x1 * sx, y1 * sy);
        ctx.lineTo(x1 * sx + Math.cos(a + off) * head, y1 * sy + Math.sin(a + off) * head);
      }
    }
  } else {
    ctx.moveTo(x0 * sx, y0 * sy);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * sx, s.pts[i + 1] * sy);
    if (s.pts.length === 2) ctx.lineTo(x0 * sx + 0.1, y0 * sy + 0.1); // نقطةٌ مفردة
  }
  ctx.stroke();
}

/** يرسم خطوطاً على canvas بمقاسه الحاليّ — تُستعمل في اللوح وفي التصدير. */
export function paintStrokes(cv: HTMLCanvasElement, strokes: Stroke[], bg?: string): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  if (cv.clientWidth && (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr))) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const useDpr = cv.clientWidth ? dpr : 1;
  ctx.setTransform(useDpr, 0, 0, useDpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const sx = w / GRID, sy = h / GRID;
  const scale = Math.min(sx, sy);
  for (const s of strokes) drawOne(ctx, cv, s, sx, sy, scale);
}

/** يصدّر الرسمة صورةَ PNG بخلفيةٍ صلبة — يُنزّلها الطالبُ ويشاركها. */
export function exportPng(strokes: Stroke[], title: string): void {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 1200;
  const light = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#111";
  /* اللونُ المتغيّر `var(--text)` لا يُحلّ خارج الشجرة، فنمنحه لوناً صريحاً */
  const ink = getComputedStyle(document.body).color || "#fff";
  paintStrokes(cv, strokes.map((s) => ({ ...s, color: s.color.startsWith("var(") ? ink : s.color })), light);
  const a = document.createElement("a");
  a.download = `${title || "رسمة"}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
}

export default function DrawPad({
  value, onChange, height = 300,
}: { value: Stroke[]; onChange: (s: Stroke[]) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const erasing = useRef(false);
  const [tool, setTool] = useState<Tool>("free");
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
    if (tool === "erase") { erasing.current = true; onChange(eraseAt(value, x, y, ERASE_RADIUS)); return; }
    live.current = tool === "free"
      ? { color, width, pts: [x, y], shape: "free" }
      : makeShape(tool, color, width, x, y, x, y);
    repaint();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toGrid(e);
    if (erasing.current) { onChange(eraseAt(value, x, y, ERASE_RADIUS)); return; }
    if (!live.current) return;
    if (live.current.shape && live.current.shape !== "free") {
      live.current = makeShape(live.current.shape, color, width, live.current.pts[0], live.current.pts[1], x, y);
    } else {
      live.current.pts.push(x, y);
    }
    repaint();
  };

  const up = () => {
    if (erasing.current) { erasing.current = false; return; }
    if (!live.current) return;
    const done = finishStroke(live.current);
    live.current = null;
    /* شكلٌ بلا مساحة (ضغطةٌ بلا سحب) لا يُحفظ — نقطةٌ لا يراها أحد */
    const isDot = done.shape !== "free" && done.pts.length >= 4
      && Math.abs(done.pts[2] - done.pts[0]) < 4 && Math.abs(done.pts[3] - done.pts[1]) < 4;
    if (isDot) { repaint(); return; }
    onChange([...value, done]);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <canvas
        ref={ref}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        className="w-full rounded-2xl"
        style={{ height, touchAction: "none", background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)", cursor: tool === "erase" ? "cell" : "crosshair" }}
        aria-label="لوح الرسم"
      />

      {/* الأدوات */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTool(t.id)} aria-pressed={tool === t.id} aria-label={t.label}
            title={t.label}
            className="flex-1 min-w-[44px] h-10 rounded-xl flex items-center justify-center t-body transition active:scale-95"
            style={tool === t.id
              ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
              : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* الألوان والسماكات */}
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
