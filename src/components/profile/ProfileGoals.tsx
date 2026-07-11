"use client";
/* ─── الأهداف الأكاديمية — درجات مستهدفة + الجامعة/التخصص + نتائجي ─── */
import { memo, useState } from "react";
import type { DarbGoals, ExamResult } from "@/lib/storage";
import { TRACKS, scoreRangeForTitle, validateScore } from "@/lib/tracks";
import { trackEvent } from "@/lib/analytics";

interface Props {
  goals: DarbGoals;
  onGoalsChange: (partial: Partial<DarbGoals>) => void;
  results: ExamResult[];
  onAddResult: (r: ExamResult) => void;
  onDeleteResult: (id: string) => void;
}

const TARGETS: { key: keyof DarbGoals; label: string; max: number }[] = [
  { key: "quduratTarget", label: "القدرات", max: 100 },
  { key: "tahsiliTarget", label: "التحصيلي", max: 100 },
  { key: "stepTarget",    label: "STEP",     max: 100 },
  { key: "cpcTarget",     label: "CPC",      max: 100 },
  { key: "itcTarget",     label: "ITC",      max: 100 },
];

const innerStyle = { background: "var(--surface2)", border: "1.5px solid var(--border)" };

function ProfileGoalsBase({ goals, onGoalsChange, results, onAddResult, onDeleteResult }: Props) {
  // نموذج إضافة نتيجة
  const [resExam, setResExam] = useState("");
  const [resScore, setResScore] = useState("");
  const [resDate, setResDate] = useState("");
  const [resErr, setResErr] = useState("");
  const resRange = resExam ? scoreRangeForTitle(resExam) : undefined;
  const noScore = resRange === null;

  const setTarget = (key: keyof DarbGoals, raw: string) => {
    const n = raw.trim() === "" ? undefined : Math.max(0, Math.min(100, parseFloat(raw)));
    onGoalsChange({ [key]: Number.isNaN(n as number) ? undefined : n } as Partial<DarbGoals>);
  };

  const addResult = () => {
    const exam = resExam.trim();
    if (!exam) return;
    const err = validateScore(exam, resScore);
    if (err) { setResErr(err); return; }
    onAddResult({ id: `${Date.now()}`, exam, score: noScore ? undefined : (resScore.trim() || undefined), date: resDate || undefined });
    /* حدث الاختبار (لوحة الأدمن: عدد الإكمالات + أكثر الاختبارات) — تسجيل يدوي لنتيجة جديدة */
    trackEvent("exam_completed", { exam, attemptNumber: results.filter((r) => r.exam.trim() === exam).length + 1 });
    setResExam(""); setResScore(""); setResDate(""); setResErr("");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* درجات مستهدفة */}
      <div>
        <p className="label mb-1">درجاتك المستهدفة</p>
        <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>حدّد هدفك لكل اختبار — يذكّرك دائماً بوجهتك.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TARGETS.map((t) => (
            <div key={t.key} className="rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2" style={innerStyle}>
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{t.label}</span>
              <input inputMode="decimal" defaultValue={goals[t.key] != null ? String(goals[t.key]) : ""}
                onBlur={(e) => setTarget(t.key, e.target.value)} placeholder="—" maxLength={5}
                aria-label={`هدف ${t.label}`}
                className="w-14 text-center rounded-lg px-1 py-1 text-[14px] font-black font-mono-nums text-[var(--text)] outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* نتائجي */}
      <div>
        <p className="label mb-3">نتائجي</p>
        {results.length > 0 ? (
          <div className="flex flex-col gap-2 mb-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-[var(--text)] truncate">{r.exam}</p>
                  {r.date && <p className="text-[12px] text-[var(--text-muted)]">{r.date}</p>}
                </div>
                {r.score && <span className="font-black text-[16px]" style={{ color: "var(--gold)" }}>{r.score}</span>}
                <button onClick={() => onDeleteResult(r.id)} aria-label="حذف النتيجة" className="text-[var(--text-muted)] text-sm font-bold px-1">✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-3xl mb-1.5">📊</div>
            <p className="font-bold text-[14px] mb-1" style={{ color: "var(--text)" }}>سجّل نتائجك السابقة</p>
            <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>تابع تقدّمك نحو هدفك، اختباراً بعد اختبار.</p>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <select value={resExam} onChange={(e) => { setResExam(e.target.value); setResScore(""); setResErr(""); }}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none" style={innerStyle}>
            <option value="">اختر الاختبار</option>
            {TRACKS.map((t) => (<option key={t.id} value={t.title}>{t.title}</option>))}
          </select>
          <input value={resScore} inputMode="decimal" onChange={(e) => { setResScore(e.target.value); setResErr(""); }}
            disabled={noScore} placeholder={noScore ? "بلا درجة" : "الدرجة"} maxLength={6}
            className="w-24 rounded-2xl px-3 py-3 text-[15px] text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-40" style={innerStyle} />
        </div>
        {resExam && resRange && (<p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {resRange.hint}</p>)}
        {noScore && (<p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>هذا الاختبار برنامج قبول/تدريب — ما له درجة رقمية.</p>)}
        {resErr && (<p className="text-[12px] mb-2 px-1 font-bold" style={{ color: "var(--danger)" }}>{resErr}</p>)}
        <div className="flex gap-2">
          <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
            aria-label="تاريخ الاختبار"
            className="flex-1 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none" style={innerStyle} />
          <button onClick={addResult} disabled={!resExam.trim()} className="px-5 rounded-2xl font-black text-[15px]"
            style={{ background: resExam.trim() ? "var(--accent)" : "var(--surface2)", color: resExam.trim() ? "white" : "var(--text-muted)" }}>أضف</button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileGoalsBase);
