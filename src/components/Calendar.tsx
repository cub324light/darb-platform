"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { time, year, dateFull, dateHijri } from "@/lib/format";
import { primaryPeriodOn } from "@/lib/academicCalendar";
import { PERIOD_TONE } from "@/lib/calendarTone";
import { usePref, setPref } from "@/lib/prefs";
import Sheet from "@/components/Sheet";

type Mode = "gregorian" | "hijri";

const GREG_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const DOW = ["ح","ن","ث","ر","خ","ج","س"]; // الأحد – السبت

/* عنصر معاينة اليوم — يصله من الأب جاهزاً (ملوّن ومرتب) */
export interface DayPeekItem { id: string; label: string; color: string; from: number; to: number; }

interface CalCell { greg: Date; label: number; inMonth: boolean; }

function dk(d: Date) { return d.toISOString().slice(0, 10); }

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

/** اختبارُ الطالب كما يعرفه التقويم — مفتاحٌ واسمٌ ولون. */
export interface CalendarExam { key: string; label: string; color?: string }

/* ظِلُّ التقويم الدراسي تحت كل يوم: **هايلايت** ممتدٌّ على أيام الفترة، مستديرٌ
   عند بدايتها ونهايتها فتُقرأ مدّتُها بلمحة. كان خطّاً رفيعاً لا يكاد يُرى.
   الفصلُ ظلٌّ هادئ، والإجازةُ والاختباراتُ ألوانُها الخاصّة. يُطفأ بمفتاحٍ ويبقى مطفأً. */
export default function Calendar({
  examDate,
  onExamDateChange,
  onDayClick,
  getDayInfo,
  flushBottom,
  exams,
  examDays,
  onSetExamDay,
  onClearExamDay,
  onAddEvent,
}: {
  examDate: string | null;
  onExamDateChange: (d: string | null) => void;
  onDayClick?: (date: string) => void;
  getDayInfo?: (date: string) => DayPeekItem[];
  flushBottom?: boolean;
  /** اختباراتُ الطالب — إن كانت أكثر من واحد سُئل: «قدرات أم ستيب؟» */
  exams?: CalendarExam[];
  /** أيامُ الاختبارات المحدَّدة: تاريخ ← مفتاحُ الاختبار. */
  examDays?: Record<string, string>;
  onSetExamDay?: (date: string, examKey: string) => void;
  onClearExamDay?: (date: string) => void;
  /** إضافةُ حدثٍ في يومٍ بعينه — تفتحه الصفحةُ المستضيفة بنموذجها. */
  onAddEvent?: (date: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("gregorian");
  /* ظِلُّ التقويم الدراسي — ظاهرٌ افتراضاً، ويُطفئه من لا يريده فيبقى مطفأً */
  const showBands = usePref("calBands", true);
  const [viewDate, setViewDate] = useState(new Date());
  const [peek, setPeek] = useState<PeekState | null>(null);
  /* اليومُ المفتوح في ورقته — الضغطُ يفتح يومَه لا يحدّد اختباراً بالخطأ */
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [pickExamFor, setPickExamFor] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const todayKey = dk(new Date());
  const examOf = (date: string): CalendarExam | null => {
    const k = examDays?.[date];
    return k ? (exams?.find((e) => e.key === k) ?? { key: k, label: "اختبار" }) : null;
  };
  const isExamDay = (date: string) => date === examDate || !!examDays?.[date];

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

  /* مفتاحُ الألوان: الفتراتُ الظاهرةُ في هذا الشهر وحدها — لا نعرض لوناً لا يراه */
  const monthTones = (() => {
    if (!showBands) return [] as { label: string; color: string; dim: boolean }[];
    const seen = new Map<string, { label: string; color: string; dim: boolean }>();
    for (const c of cells) {
      if (!c.inMonth) continue;
      const p = primaryPeriodOn(dk(c.greg));
      if (!p) continue;
      const tone = PERIOD_TONE[p.kind];
      /* الاسمُ الحقيقيّ للفترة أنفعُ من اسم نوعها: «إجازة اليوم الوطني» لا «إجازة» */
      if (!seen.has(p.label)) {
        seen.set(p.label, { label: p.label, color: tone.color, dim: p.kind === "term" });
      }
    }
    return [...seen.values()];
  })();

  const header = () => {
    if (mode === "gregorian") {
      return `${GREG_MONTHS[viewDate.getMonth()]} ${year(viewDate.getFullYear())}`;
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
  const peekCard = peek && typeof document !== "undefined" ? createPortal(
    (() => {
      const items = getDayInfo?.(peek.key) ?? [];
      const isExam = peek.key === examDate;
      /* يتبع مبدّل «ميلادي/هجري» الذي اختاره الطالب بنفسه — كان يطبع الهجريّ دائماً */
      const dateLabel = mode === "hijri" ? dateHijri(peek.key, false) : dateFull(peek.key, false);
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
              <p className="text-[15px] font-black" style={{ color: "var(--text)" }}>{dateLabel}</p>
              {isExam && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
                  اختبار
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {isExam ? "يوم الاختبار — جهّز نفسك ونم بدري." : "ما في جدول — اضغط لإضافة مهامك."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }} />
                    <span className="text-[14px] font-bold flex-1 truncate" style={{ color: "var(--text)" }}>{it.label}</span>
                    <span className="text-[12px] font-mono-nums" style={{ color: "var(--text-muted)" }}>
                      {time(it.from)}
                    </span>
                  </div>
                ))}
                {items.length > 4 && (
                  <p className="text-[12px] font-bold mt-0.5" style={{ color: "var(--accent-light)" }}>
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
    <div className="card" ref={rootRef} style={{
      touchAction: "manipulation",
      ...(flushBottom ? {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottom: "none",
        boxShadow: "none",
      } : {}),
    }}>
      {/* التبديل بين الميلادي والهجري */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {(["gregorian", "hijri"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setViewDate(new Date()); setPeek(null); }}
            className="flex-1 py-2 rounded-xl text-[19px] font-bold transition"
            style={mode === m ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
            {m === "gregorian" ? "ميلادي" : "هجري"}
          </button>
        ))}
      </div>

      {/* التقويم الدراسي على الأيام — إظهارٌ وإطفاء، ومفتاحُ الألوان تحته.
          لا نعرض إلا الفتراتِ الظاهرةَ في الشهر المعروض، فلا يقرأ الطالبُ
          مفتاحاً لألوانٍ لا يراها. */}
      <div className="mb-3">
        {/* مفتاحٌ ظاهرُ الحالة — كان سطراً يقول «ظاهر/مخفيّ» فلا يُقرأ زرّاً */}
        <button
          type="button"
          onClick={() => setPref("calBands", !showBands)}
          aria-pressed={showBands}
          className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition active:scale-[0.99]"
          style={{
            background: showBands ? "color-mix(in srgb, var(--accent) 8%, var(--surface2))" : "var(--surface2)",
            border: `1.5px solid ${showBands ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border)"}`,
          }}
        >
          <span className="t-small font-black text-right" style={{ color: "var(--text)" }}>
            🗓️ التقويم الدراسي على الأيام
          </span>
          <span aria-hidden="true" className="w-12 h-7 rounded-full flex items-center transition flex-shrink-0 px-0.5"
            style={{ background: showBands ? "var(--accent)" : "var(--border)", justifyContent: showBands ? "flex-start" : "flex-end" }}>
            <span className="w-6 h-6 rounded-full" style={{ background: "#fff" }} />
          </span>
        </button>

        {showBands && monthTones.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 px-1">
            {monthTones.map((t) => (
              <span key={t.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="rounded-md"
                  style={{ width: 16, height: 10, background: t.color, opacity: t.dim ? 0.28 : 0.55 }} />
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{t.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* تنقل الأشهر — RTL: أول عنصر = يمين = السابق */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev}
          className="tap-44 w-9 h-9 rounded-2xl flex items-center justify-center text-[22px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>›</button>
        <p className="font-black text-[19px]" style={{ color: "var(--text)" }}>{header()}</p>
        <button onClick={next}
          className="tap-44 w-9 h-9 rounded-2xl flex items-center justify-center text-[22px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>‹</button>
      </div>

      {/* رؤوس الأيام */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((h) => (
          <div key={h} className="text-center text-[19px] font-bold py-1" style={{ color: "var(--text-muted)" }}>{h}</div>
        ))}
      </div>

      {/* شبكة التقويم */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell, ci) => {
            const cellKey = dk(cell.greg);
            const isToday = cellKey === todayKey;
            const isExam = isExamDay(cellKey);
            const isPeeked = peek?.key === cellKey;
            const hasEv = cell.inMonth && (getDayInfo?.(cellKey)?.length ?? 0) > 0;
            const dotColor = isExam ? "#1a1200" : isToday ? "rgba(255,255,255,0.85)" : "var(--accent-light)";
            return (
              <button
                key={ci}
                {...(cell.inMonth ? { "data-cellkey": cellKey } : {})}
                onClick={() => {
                  if (!cell.inMonth) return;
                  /* الضغطُ يفتح **يومَه**: ماذا فيه، وماذا تضيف. كان يحدّد يومَ
                     الاختبار مباشرةً — فيضغط الطالبُ ليرى فيُغيّر. */
                  if (onDayClick) onDayClick(cellKey);
                  else setOpenDay(cellKey);
                }}
                onPointerEnter={(e) => { if (cell.inMonth && e.pointerType === "mouse") peekFromEl(e.currentTarget); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") setPeek(null); }}
                className="relative flex items-center justify-center"
                style={{ height: "40px" }}
                aria-label={cell.label.toString()}
              >
                {/* ظِلُّ الفترة: هايلايتٌ يملأ الخليّة فتتّصل الأيامُ شريطاً
                    واحداً، ويستدير طرفُه عند أول الفترة وآخرها. خلف الرقم. */}
                {showBands && cell.inMonth && (() => {
                  const p = primaryPeriodOn(cellKey);
                  if (!p) return null;
                  const tone = PERIOD_TONE[p.kind];
                  const isFirst = cellKey === p.start;
                  const isLast = cellKey === p.end;
                  const r = 10;
                  return (
                    <span aria-hidden="true" className="absolute"
                      style={{
                        top: 3, bottom: 3, insetInlineStart: 0, insetInlineEnd: 0,
                        background: tone.color,
                        opacity: p.kind === "term" ? 0.16 : 0.3,
                        borderStartStartRadius: isFirst ? r : 0,
                        borderEndStartRadius: isFirst ? r : 0,
                        borderStartEndRadius: isLast ? r : 0,
                        borderEndEndRadius: isLast ? r : 0,
                      }} />
                  );
                })()}
                <span
                  className="relative w-8 h-8 flex items-center justify-center rounded-full text-[19px] font-bold transition-transform"
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
          <span className="text-[19px] flex-1" style={{ color: "var(--text-dim)" }}>
            {"يوم الاختبار: "}
            {mode === "hijri" ? dateHijri(examDate) : dateFull(examDate)}
          </span>
          <button onClick={() => onExamDateChange(null)} className="text-[var(--text-muted)] text-sm px-1 min-h-[28px] tap-44" aria-label="إزالة يوم الاختبار">✕</button>
        </div>
      )}
      <p className="text-[17px] mt-2 text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
        اضغط أي يوم لترى ما فيه وتضيف إليه
      </p>

      {peekCard}

      {/* ── ورقةُ اليوم: ماذا فيه، وماذا تضيف ── */}
      {openDay && (
        <Sheet onClose={() => { setOpenDay(null); setPickExamFor(null); }}
          title={mode === "hijri" ? dateHijri(openDay, false) : dateFull(openDay, false)}>
          {(() => {
            const items = getDayInfo?.(openDay) ?? [];
            const period = primaryPeriodOn(openDay);
            const dayExam = examOf(openDay);
            const legacyExam = openDay === examDate;
            const choosing = pickExamFor === openDay;
            const canPick = (exams?.length ?? 0) > 0 && !!onSetExamDay;

            const markExam = (examKey: string) => {
              onSetExamDay?.(openDay, examKey);
              setPickExamFor(null);
              setOpenDay(null);
            };

            return (
              <div className="flex flex-col gap-3">
                {/* سياقُ اليوم من التقويم الدراسي — حقيقةٌ لا تُدخَل يدوياً */}
                {period && (
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5"
                    style={{ background: `color-mix(in srgb, ${PERIOD_TONE[period.kind].color} 12%, var(--surface2))`,
                             border: `1px solid color-mix(in srgb, ${PERIOD_TONE[period.kind].color} 30%, transparent)` }}>
                    <span aria-hidden="true">{PERIOD_TONE[period.kind].icon}</span>
                    <span className="t-small font-bold" style={{ color: "var(--text)" }}>{period.label}</span>
                    {period.approximate && (
                      <span className="t-caption" style={{ color: "var(--text-muted)" }}>موعدٌ تقديريّ حتى تُعلنه الجهة</span>
                    )}
                  </div>
                )}

                {/* يومُ اختبار؟ */}
                {(dayExam || legacyExam) && (
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5"
                    style={{ background: "color-mix(in srgb, var(--gold) 14%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--gold) 34%, transparent)" }}>
                    <span aria-hidden="true">📌</span>
                    <span className="t-small font-black flex-1" style={{ color: "var(--text)" }}>
                      يوم اختبار{dayExam ? ` — ${dayExam.label}` : ""}
                    </span>
                    <button
                      onClick={() => {
                        if (dayExam && onClearExamDay) onClearExamDay(openDay);
                        else onExamDateChange(null);
                        setOpenDay(null);
                      }}
                      className="t-caption font-bold px-2.5 py-1.5 rounded-lg tap-44"
                      style={{ color: "var(--text-muted)" }}>إزالة</button>
                  </div>
                )}

                {/* أحداثُ اليوم */}
                {items.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {items.map((it) => (
                      <div key={it.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: it.color }} />
                        <span className="t-small font-bold flex-1 truncate" style={{ color: "var(--text)" }}>{it.label}</span>
                        <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>{time(it.from)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="t-body text-center py-3" style={{ color: "var(--text-muted)" }}>لا أحداث في هذا اليوم.</p>
                )}

                {/* اختيارُ الاختبار — يظهر فقط حين للطالب أكثر من اختبار */}
                {choosing ? (
                  <div className="flex flex-col gap-2">
                    <p className="t-caption font-bold px-1" style={{ color: "var(--text-muted)" }}>أيّ اختبار؟</p>
                    {(exams ?? []).map((ex) => (
                      <button key={ex.key} onClick={() => markExam(ex.key)}
                        className="rounded-xl px-4 py-3 text-right t-body font-black transition active:scale-[0.98]"
                        style={{ background: "var(--surface2)", border: `1.5px solid ${ex.color ?? "var(--border)"}` }}>
                        {ex.label}
                      </button>
                    ))}
                    <button onClick={() => setPickExamFor(null)} className="t-caption py-2" style={{ color: "var(--text-muted)" }}>إلغاء</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    {onAddEvent && (
                      <button onClick={() => { onAddEvent(openDay); setOpenDay(null); }}
                        className="rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
                        style={{ background: "var(--accent)", color: "#fff" }}>
                        ＋ أضف حدثاً في هذا اليوم
                      </button>
                    )}
                    {!dayExam && !legacyExam && (
                      <button
                        onClick={() => {
                          if (!canPick) { onExamDateChange(openDay); setOpenDay(null); return; }
                          if (exams!.length === 1) { markExam(exams![0].key); return; }
                          setPickExamFor(openDay);
                        }}
                        className="rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
                        style={{ background: "transparent", border: "1.5px solid var(--gold)", color: "var(--gold)" }}>
                        📌 حدّده يوم اختبار
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Sheet>
      )}
    </div>
  );
}
