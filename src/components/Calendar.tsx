"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type Mode = "gregorian" | "hijri";

const GREG_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const DOW = ["ح","ن","ث","ر","خ","ج","س"]; // الأحد – السبت

/* عنصر معاينة اليوم — يصله من الأب جاهزاً (ملوّن ومرتب) */
export interface DayPeekItem { id: string; label: string; color: string; from: number; to: number; }

interface CalCell { greg: Date; label: number; inMonth: boolean; }

function dk(d: Date) { return d.toISOString().slice(0, 10); }

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return "12 ص";
  if (h < 12) return `${h} ص`;
  if (h === 12) return "12 م";
  return `${h - 12} م`;
}

function hijriOf(d: Date): { year: number; month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      calendar: "islamic-umalqura", year: "numeric", month: "numeric", day: "numeric",
    } as unknown as Intl.DateTimeFormatOptions).formatToParts(d);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    return { year: +(m.year ?? 1446), month: +(m.month ?? 1), day: +(m.day ?? 1) };
  } catch {
    return { year: 1446, month: 12, day: 1 };
  }
}

function hijriMonthStart(ref: Date): Date {
  const t = hijriOf(ref);
  const d = new Date(ref);
  for (let i = 0; i < 32; i++) {
    const h = hijriOf(d);
    if (h.year === t.year && h.month === t.month && h.day === 1) return new Date(d);
    if (h.year < t.year || (h.year === t.year && h.month < t.month)) break;
    d.setDate(d.getDate() - 1);
  }
  const s = new Date(ref); s.setDate(s.getDate() - 35);
  for (let i = 0; i < 70; i++) {
    const h = hijriOf(s);
    if (h.year === t.year && h.month === t.month && h.day === 1) return new Date(s);
    s.setDate(s.getDate() + 1);
  }
  return new Date(ref);
}

interface PeekState { key: string; cx: number; top: number; bottom: number; place: "top" | "bottom"; }

export default function Calendar({
  examDate,
  onExamDateChange,
  onDayClick,
  getDayInfo,
}: {
  examDate: string | null;
  onExamDateChange: (d: string | null) => void;
  onDayClick?: (date: string) => void;
  getDayInfo?: (date: string) => DayPeekItem[];
}) {
  const [mode, setMode] = useState<Mode>("gregorian");
  const [viewDate, setViewDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [peek, setPeek] = useState<PeekState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const todayKey = dk(new Date());

  useEffect(() => { setMounted(true); }, []);

  /* تموضع المعاينة من زر اليوم — يشتغل للماوس واللمس */
  const peekFromEl = useCallback((btn: HTMLElement) => {
    const key = btn.dataset.cellkey;
    if (!key) return;
    const r = btn.getBoundingClientRect();
    const place: "top" | "bottom" = r.top < 240 ? "bottom" : "top";
    setPeek({ key, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, place });
  }, []);

  /* لمس الجوال: اضغط مطولاً ثم مرّر إصبعك يمين/يسار/فوق/تحت لتصفح الأيام */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let peeking = false;
    let start: { x: number; y: number } | null = null;

    const cellAt = (x: number, y: number): HTMLElement | null => {
      const el = document.elementFromPoint(x, y);
      return (el?.closest("[data-cellkey]") as HTMLElement) ?? null;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      peeking = false;
      const btn = cellAt(t.clientX, t.clientY);
      holdTimer = setTimeout(() => {
        if (btn) {
          peeking = true;
          peekFromEl(btn);
          navigator.vibrate?.(8);
        }
      }, 150);
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!peeking) {
        if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 12) {
          if (holdTimer) clearTimeout(holdTimer);
          peeking = true;
        } else return;
      }
      e.preventDefault(); // أوقف تمرير الصفحة أثناء التصفّح
      const btn = cellAt(t.clientX, t.clientY);
      if (btn) peekFromEl(btn);
    };

    const onEnd = (e: TouchEvent) => {
      if (holdTimer) clearTimeout(holdTimer);
      if (peeking) {
        e.preventDefault(); // امنع فتح الجدول — كانت معاينة فقط
        peeking = false;
        setPeek(null);
      }
      start = null;
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: false });
    root.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
    };
  }, [peekFromEl]);

  const buildCells = (): CalCell[] => {
    if (mode === "gregorian") {
      const y = viewDate.getFullYear(), m = viewDate.getMonth();
      const fDow = new Date(y, m, 1).getDay();
      const dim = new Date(y, m + 1, 0).getDate();
      const cells: CalCell[] = [];
      for (let i = fDow; i > 0; i--) {
        const d = new Date(y, m, 1 - i);
        cells.push({ greg: d, label: d.getDate(), inMonth: false });
      }
      for (let day = 1; day <= dim; day++) cells.push({ greg: new Date(y, m, day), label: day, inMonth: true });
      while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1].greg;
        const nd = new Date(last); nd.setDate(nd.getDate() + 1);
        cells.push({ greg: nd, label: nd.getDate(), inMonth: false });
      }
      return cells;
    } else {
      const target = hijriOf(viewDate);
      const start = hijriMonthStart(viewDate);
      const cells: CalCell[] = [];
      const fDow = start.getDay();
      for (let i = fDow; i > 0; i--) {
        const d = new Date(start); d.setDate(d.getDate() - i);
        cells.push({ greg: d, label: hijriOf(d).day, inMonth: false });
      }
      const cur = new Date(start);
      for (let iter = 0; iter < 35; iter++) {
        const h = hijriOf(cur);
        if (h.year !== target.year || h.month !== target.month) break;
        cells.push({ greg: new Date(cur), label: h.day, inMonth: true });
        cur.setDate(cur.getDate() + 1);
      }
      while (cells.length % 7 !== 0) {
        cells.push({ greg: new Date(cur), label: hijriOf(cur).day, inMonth: false });
        cur.setDate(cur.getDate() + 1);
      }
      return cells;
    }
  };

  const cells = buildCells();
  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const header = () => {
    if (mode === "gregorian") {
      return `${GREG_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    }
    const h = hijriOf(viewDate);
    return `${HIJRI_MONTHS[(h.month - 1) % 12]} ${h.year} هـ`;
  };

  const prev = () => {
    setPeek(null);
    if (mode === "gregorian") setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 15));
    else { const s = hijriMonthStart(viewDate); s.setDate(s.getDate() - 15); setViewDate(s); }
  };
  const next = () => {
    setPeek(null);
    if (mode === "gregorian") setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 15));
    else { const s = hijriMonthStart(viewDate); s.setDate(s.getDate() + 32); setViewDate(s); }
  };

  /* بطاقة المعاينة العائمة */
  const peekCard = peek && mounted ? createPortal(
    (() => {
      const items = getDayInfo?.(peek.key) ?? [];
      const isExam = peek.key === examDate;
      const dateLabel = new Date(peek.key + "T12:00:00").toLocaleDateString("ar-SA", {
        weekday: "long", day: "numeric", month: "long",
      });
      const top = peek.place === "top" ? peek.top - 12 : peek.bottom + 12;
      return (
        <div
          style={{
            position: "fixed", left: peek.cx, top, zIndex: 9999, pointerEvents: "none",
            transform: peek.place === "top" ? "translate(-50%,-100%)" : "translate(-50%,0)",
          }}
        >
          <div
            className="cal-peek rounded-2xl p-3.5 shadow-2xl"
            style={{
              width: 222, background: "var(--surface)",
              border: "1.5px solid var(--border)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
            }}
          >
            {/* رأس البطاقة */}
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-black" style={{ color: "var(--text)" }}>{dateLabel}</p>
              {isExam && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
                  اختبار
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {isExam ? "يوم الاختبار — جهّز نفسك ونم بدري." : "ما في جدول — اضغط لإضافة مهامك."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }} />
                    <span className="text-[12.5px] font-bold flex-1 truncate" style={{ color: "var(--text)" }}>{it.label}</span>
                    <span className="text-[11px] font-mono-nums" style={{ color: "var(--text-muted)" }}>
                      {fmtHour(it.from)}
                    </span>
                  </div>
                ))}
                {items.length > 4 && (
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--accent-light)" }}>
                    +{items.length - 4} غيرها
                  </p>
                )}
              </div>
            )}

            {/* السهم */}
            <span
              className="absolute w-3 h-3 rotate-45"
              style={{
                left: "50%", marginLeft: -6,
                background: "var(--surface)",
                ...(peek.place === "top"
                  ? { bottom: -6, borderRight: "1.5px solid var(--border)", borderBottom: "1.5px solid var(--border)" }
                  : { top: -6, borderLeft: "1.5px solid var(--border)", borderTop: "1.5px solid var(--border)" }),
              }}
            />
          </div>
        </div>
      );
    })(),
    document.body
  ) : null;

  return (
    <div className="card" ref={rootRef} style={{ touchAction: "manipulation" }}>
      {/* التبديل بين الميلادي والهجري */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {(["gregorian", "hijri"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setViewDate(new Date()); setPeek(null); }}
            className="flex-1 py-2 rounded-xl text-[17px] font-bold transition"
            style={mode === m ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
            {m === "gregorian" ? "ميلادي" : "هجري"}
          </button>
        ))}
      </div>

      {/* تنقل الأشهر — RTL: أول عنصر = يمين = السابق */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev}
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-[19px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>›</button>
        <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>{header()}</p>
        <button onClick={next}
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-[19px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>‹</button>
      </div>

      {/* رؤوس الأيام */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((h) => (
          <div key={h} className="text-center text-[17px] font-bold py-1" style={{ color: "var(--text-muted)" }}>{h}</div>
        ))}
      </div>

      {/* شبكة التقويم */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell, ci) => {
            const cellKey = dk(cell.greg);
            const isToday = cellKey === todayKey;
            const isExam = cellKey === examDate;
            const isPeeked = peek?.key === cellKey;
            const hasEv = cell.inMonth && (getDayInfo?.(cellKey)?.length ?? 0) > 0;
            const dotColor = isExam ? "#1a1200" : isToday ? "rgba(255,255,255,0.85)" : "var(--accent-light)";
            return (
              <button
                key={ci}
                {...(cell.inMonth ? { "data-cellkey": cellKey } : {})}
                onClick={() => {
                  if (!cell.inMonth) return;
                  if (onDayClick) {
                    onDayClick(cellKey);
                  } else {
                    onExamDateChange(isExam ? null : cellKey);
                  }
                }}
                onPointerEnter={(e) => { if (cell.inMonth && e.pointerType === "mouse") peekFromEl(e.currentTarget); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") setPeek(null); }}
                className="relative flex items-center justify-center"
                style={{ height: "40px" }}
                aria-label={cell.label.toString()}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[17px] font-bold transition-transform"
                  style={
                    isExam
                      ? { background: "var(--gold)", color: "#1a1200", outline: isToday ? "2.5px solid var(--accent)" : (isPeeked ? "2.5px solid var(--accent-light)" : "none"), outlineOffset: "2px", transform: isPeeked ? "scale(1.12)" : "none" }
                      : isToday
                      ? { background: "var(--accent)", color: "white", outline: isPeeked ? "2.5px solid var(--accent-light)" : "none", outlineOffset: "2px", transform: isPeeked ? "scale(1.12)" : "none" }
                      : !cell.inMonth
                      ? { color: "var(--text-muted)", opacity: 0.28 }
                      : { color: "var(--text)", background: isPeeked ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", outline: isPeeked ? "2px solid var(--accent)" : "none", outlineOffset: "1px", transform: isPeeked ? "scale(1.12)" : "none" }
                  }
                >
                  {cell.label}
                </span>
                {hasEv && (
                  <span className="absolute rounded-full" style={{ bottom: 3, width: 4, height: 4, background: dotColor }} />
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* يوم الاختبار */}
      {examDate && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
          <span className="text-[17px] flex-1" style={{ color: "var(--text-dim)" }}>
            {"يوم الاختبار: "}
            {new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </span>
          <button onClick={() => onExamDateChange(null)} className="text-[var(--text-muted)] text-sm px-1 min-h-[28px]">✕</button>
        </div>
      )}
      <p className="text-[15px] mt-2 text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {onDayClick
          ? "مرّر فوق أي يوم (أو اضغط مطوّلاً ولُف بالجوال) لمعاينة جدوله · اضغط للتعديل"
          : "اضغط أي يوم لتحديد يوم الاختبار"}
      </p>

      {peekCard}
    </div>
  );
}
