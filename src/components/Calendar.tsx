"use client";
import { useState } from "react";

type Mode = "gregorian" | "hijri";

const GREG_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const DOW = ["ح","ن","ث","ر","خ","ج","س"]; // الأحد – السبت

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

export default function Calendar({
  examDate,
  onExamDateChange,
}: {
  examDate: string | null;
  onExamDateChange: (d: string | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("gregorian");
  const [viewDate, setViewDate] = useState(new Date());
  const todayKey = dk(new Date());

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
    if (mode === "gregorian") setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 15));
    else { const s = hijriMonthStart(viewDate); s.setDate(s.getDate() - 15); setViewDate(s); }
  };
  const next = () => {
    if (mode === "gregorian") setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 15));
    else { const s = hijriMonthStart(viewDate); s.setDate(s.getDate() + 32); setViewDate(s); }
  };

  return (
    <div className="card">
      {/* التبديل بين الميلادي والهجري */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {(["gregorian", "hijri"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setViewDate(new Date()); }}
            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition"
            style={mode === m ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
            {m === "gregorian" ? "ميلادي" : "هجري"}
          </button>
        ))}
      </div>

      {/* تنقل الأشهر — RTL: أول عنصر = يمين = السابق */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev}
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-[18px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>›</button>
        <p className="font-black text-[16px]" style={{ color: "var(--text)" }}>{header()}</p>
        <button onClick={next}
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-[18px]"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>‹</button>
      </div>

      {/* رؤوس الأيام */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((h) => (
          <div key={h} className="text-center text-[11px] font-bold py-1" style={{ color: "var(--text-muted)" }}>{h}</div>
        ))}
      </div>

      {/* شبكة التقويم */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell, ci) => {
            const cellKey = dk(cell.greg);
            const isToday = cellKey === todayKey;
            const isExam = cellKey === examDate;
            return (
              <button
                key={ci}
                onClick={() => cell.inMonth && onExamDateChange(isExam ? null : cellKey)}
                className="flex items-center justify-center"
                style={{ height: "40px" }}
                aria-label={cell.label.toString()}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[13px] font-bold"
                  style={
                    isExam
                      ? { background: "var(--gold)", color: "#1a1200", outline: isToday ? "2.5px solid var(--accent)" : "none", outlineOffset: "2px" }
                      : isToday
                      ? { background: "var(--accent)", color: "white" }
                      : !cell.inMonth
                      ? { color: "var(--text-muted)", opacity: 0.28 }
                      : { color: "var(--text)" }
                  }
                >
                  {cell.label}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {/* يوم الاختبار */}
      {examDate && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
          <span className="text-[12px] flex-1" style={{ color: "var(--text-dim)" }}>
            {"يوم الاختبار: "}
            {new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </span>
          <button onClick={() => onExamDateChange(null)} className="text-[var(--text-muted)] text-sm px-1 min-h-[28px]">✕</button>
        </div>
      )}
      <p className="text-[11px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>اضغط أي يوم لتحديده كيوم اختبار (اختياري)</p>
    </div>
  );
}
