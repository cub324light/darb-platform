"use client";
/* ─── الأهداف الأكاديمية — درجات مستهدفة + الجامعة/التخصص + نتائجي ─── */
import { memo, useState, type CSSProperties } from "react";
import type { DarbGoals, ExamResult } from "@/lib/storage";
import { loadUser } from "@/lib/storage";
import { updateProfile } from "@/lib/userCommands";
import { TRACKS, scoreRangeForTitle, validateScore } from "@/lib/tracks";
import { trackEvent } from "@/lib/analytics";
import { satisfactionForResult, examKeyOf, type Satisfaction, type SatBand } from "@/lib/satisfaction";
import { currentPhase } from "@/lib/transition";
import type { Stage } from "@/lib/experience";
import { retakeAvailability, bestNextStep, type FinalityState, type RetakeAvailability } from "@/lib/retake";

const BAND_COLOR: Record<SatBand, string> = { green: "var(--success)", yellow: "var(--gold)", red: "var(--danger)" };

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* عبارة حالة نافذة الإعادة — بلا تاريخ مُخمَّن (المصدر examProvider) */
function windowHint(a: RetakeAvailability): string {
  if (a.reason === "pending") return "⏳ بانتظار إعلان الموعد الرسمي";
  if (a.windowStatus === "open") return "🟢 التسجيل مفتوح الآن";
  if (a.windowStatus === "upcoming") return "🔔 التسجيل قادم";
  return "";
}

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

  /* مرحلة الطالب ووضع القبول — يحكمان أيّ إعادةٍ ممكنة فعلاً (لا نعرض المستحيل) */
  const [stage] = useState<Stage>(() =>
    typeof window !== "undefined" ? currentPhase().stage : "first");
  const [admissionOpen] = useState(() =>
    typeof window !== "undefined" ? currentPhase().allows("secondary-study") : true);
  const today = todayStr();

  /* قرار «هل الدرجة نهائية؟» — ثلاث حالات صريحة (نهائية · لم أقرّر · سأعيد).
     الإعادة تُخزَّن في retakeExams (يقرؤها Life Engine)، والاعتماد في finalizedExams.
     يُحفظان في المستخدم، وقابلان للتغيير في أي وقت من هنا. */
  const [retakes, setRetakes] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadUser()?.retakeExams ?? [] : []);
  const [finals, setFinals] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadUser()?.finalizedExams ?? [] : []);
  const setFinality = (exam: string, state: FinalityState) => {
    const nextRetakes = state === "retake" ? [...new Set([...retakes, exam])] : retakes.filter((x) => x !== exam);
    const nextFinals = state === "final" ? [...new Set([...finals, exam])] : finals.filter((x) => x !== exam);
    setRetakes(nextRetakes);
    setFinals(nextFinals);
    updateProfile({ retakeExams: nextRetakes.length ? nextRetakes : undefined, finalizedExams: nextFinals.length ? nextFinals : undefined });
  };

  /* مؤشّر الرضا لكل اختبارٍ له نتيجة (أحدث نتيجة لكل اختبار، إن كان له حكم) */
  const satCards: { exam: string; sat: Satisfaction }[] = (() => {
    const seen = new Set<string>();
    const out: { exam: string; sat: Satisfaction }[] = [];
    for (const r of results) {
      const ex = r.exam.trim();
      if (seen.has(ex)) continue;
      const sat = satisfactionForResult(ex, r.score, goals);
      if (sat) { seen.add(ex); out.push({ exam: ex, sat }); }
    }
    return out;
  })();

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
        <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>حدّد هدفك لكل اختبار — يذكّرك دائماً بوجهتك.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TARGETS.map((t) => (
            <div key={t.key} className="rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2" style={innerStyle}>
              <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{t.label}</span>
              <input inputMode="decimal" defaultValue={goals[t.key] != null ? String(goals[t.key]) : ""}
                onBlur={(e) => setTarget(t.key, e.target.value)} placeholder="—" maxLength={5}
                aria-label={`هدف ${t.label}`}
                className="w-14 text-center rounded-lg px-1 py-1 text-[16px] font-black font-mono-nums text-[var(--text)] outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* «هل تعتبر هذه الدرجة نهائية؟» — ثلاث حالات، والإعادة تُعرَض فقط إن كانت
          ممكنة فعلاً (المرحلة + نافذة التسجيل). وإلا: أفضل خطوة تالية بدل المستحيل. */}
      {satCards.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {satCards.map(({ exam, sat }) => {
            const c = BAND_COLOR[sat.band];
            const key = examKeyOf(exam);
            const avail = key ? retakeAvailability(key, stage, today, { admissionOpen })
              : { possible: false, reason: "stage", windowStatus: null, windowLabel: null } as RetakeAvailability;
            /* الإعادة تُحتسب حالةً فعّالة فقط إن كانت ممكنة؛ وإلا تُعامَل كـ«لم أقرّر» */
            const state: FinalityState =
              retakes.includes(exam) && avail.possible ? "retake"
              : finals.includes(exam) ? "final" : "undecided";
            const pill = (label: string, active: boolean, activeStyle: CSSProperties, onClick: () => void) => (
              <button onClick={onClick}
                className="flex-1 py-2.5 rounded-xl font-bold text-[13px] transition active:scale-[0.98]"
                style={active ? activeStyle : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {label}
              </button>
            );
            const step = key ? bestNextStep(stage, key) : null;
            const hint = windowHint(avail);
            return (
              <div key={exam} className="rounded-2xl p-4 flex flex-col gap-2.5"
                style={{ background: `color-mix(in srgb, ${c} 8%, var(--surface))`, border: `1.5px solid color-mix(in srgb, ${c} 34%, var(--border))` }}>
                <div>
                  <p className="font-black text-[16px] leading-tight" style={{ color: "var(--text)" }}>{sat.title}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{exam} · {sat.note}</p>
                </div>
                <p className="text-[14px] font-bold" style={{ color: "var(--text-dim)" }}>هل تعتبر هذه الدرجة نهائية؟</p>
                <div className="flex gap-2">
                  {pill("نعم، نهائية", state === "final",
                    { background: "var(--success)", color: "#04240f", border: "none" },
                    () => setFinality(exam, "final"))}
                  {pill("لم أقرّر بعد", state === "undecided",
                    { background: "var(--text-dim)", color: "var(--surface)", border: "none" },
                    () => setFinality(exam, "undecided"))}
                  {avail.possible && pill("لا، سأعيدها", state === "retake",
                    { background: "var(--accent)", color: "#fff", border: "none" },
                    () => setFinality(exam, "retake"))}
                </div>
                {state === "retake" && (
                  <p className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>
                    🔁 فعّلنا خطة إعادة {exam}{hint ? ` — ${hint}` : ""}. ستراها أولويةً في صفحتك الرئيسية.
                  </p>
                )}
                {!avail.possible && step && (
                  <a href={step.href}
                    className="text-[13px] font-bold rounded-xl px-3 py-2 transition active:scale-[0.98]"
                    style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                    ⤷ {step.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* نتائجي */}
      <div>
        <p className="label mb-3">نتائجي</p>
        {results.length > 0 ? (
          <div className="flex flex-col gap-2 mb-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[17px] text-[var(--text)] truncate">{r.exam}</p>
                  {r.date && <p className="text-[14px] text-[var(--text-muted)]">{r.date}</p>}
                </div>
                {r.score && <span className="font-black text-[18px]" style={{ color: "var(--gold)" }}>{r.score}</span>}
                <button onClick={() => onDeleteResult(r.id)} aria-label="حذف النتيجة" className="text-[var(--text-muted)] text-sm font-bold px-1">✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-3xl mb-1.5">📊</div>
            <p className="font-bold text-[16px] mb-1" style={{ color: "var(--text)" }}>سجّل نتائجك السابقة</p>
            <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>تابع تقدّمك نحو هدفك، اختباراً بعد اختبار.</p>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <select value={resExam} onChange={(e) => { setResExam(e.target.value); setResScore(""); setResErr(""); }}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-[17px] text-[var(--text)] outline-none" style={innerStyle}>
            <option value="">اختر الاختبار</option>
            {TRACKS.map((t) => (<option key={t.id} value={t.title}>{t.title}</option>))}
          </select>
          <input value={resScore} inputMode="decimal" onChange={(e) => { setResScore(e.target.value); setResErr(""); }}
            disabled={noScore} placeholder={noScore ? "بلا درجة" : "الدرجة"} maxLength={6}
            className="w-24 rounded-2xl px-3 py-3 text-[17px] text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-40" style={innerStyle} />
        </div>
        {resExam && resRange && (<p className="text-[14px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {resRange.hint}</p>)}
        {noScore && (<p className="text-[14px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>هذا الاختبار برنامج قبول/تدريب — ما له درجة رقمية.</p>)}
        {resErr && (<p className="text-[14px] mb-2 px-1 font-bold" style={{ color: "var(--danger)" }}>{resErr}</p>)}
        <div className="flex gap-2">
          <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
            aria-label="تاريخ الاختبار"
            className="flex-1 rounded-2xl px-4 py-3 text-[17px] text-[var(--text)] outline-none" style={innerStyle} />
          <button onClick={addResult} disabled={!resExam.trim()} className="px-5 rounded-2xl font-black text-[17px]"
            style={{ background: resExam.trim() ? "var(--accent)" : "var(--surface2)", color: resExam.trim() ? "white" : "var(--text-muted)" }}>أضف</button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileGoalsBase);
