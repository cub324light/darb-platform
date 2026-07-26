"use client";
/* ═══════════ 🎯 ماذا ستفعل اليوم؟ — جلسة المذاكرة (V2) ═══════════
   أهم شاشةٍ في درب: مدرّبٌ شخصيّ لا قائمة مهام. التدفّق:
   الخطة (مدة كبيرة + مهامّ بأسباب + تخطٍّ بسبب + Sticky CTA) ← الجلسة (مهمةٌ واحدة + مؤقّت)
   ← النجاح (إنجازٌ هادئ: الاستغراق الفعليّ + ما بقي). كل الحساب في المحرّكات النقيّة
   (buildSessionPlan · remainingSteps)؛ الوقت يُسجَّل عبر recordSession وسجلّ الجلسات. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser, ensureWorkspace, recordSession } from "@/lib/storage";
import { buildSessionPlan, type SessionPlan, type SessionTask } from "@/lib/roadmap/session";
import { appendSession } from "@/lib/roadmap/sessionStore";
import { remainingSteps } from "@/lib/roadmap/remainingSteps";
import { readPriorityExam, countRemaining, vaultCount, readTodayAvailability, type PriorityExam } from "@/lib/roadmap/nowRead";
import { loadRoadmapConfig } from "@/lib/roadmap/store";
import { ROADMAP_TUNING } from "@/lib/roadmap/config";
import { trackEvent } from "@/lib/analytics";
import { n } from "@/lib/format";

type Stage = "plan" | "active" | "done";
const TASK_ICON: Record<SessionTask["kind"], string> = { review: "📖", drill: "📝", errors: "❌" };
const SKIP_REASONS = [
  { id: "cant-now", label: "لا أستطيع الآن" },
  { id: "swap", label: "أريد استبدالها" },
  { id: "later", label: "سأفعلها لاحقاً" },
] as const;

/* سببُ كل مهمة — من إشاراتٍ حقيقية فقط (بلا إشارةٍ لا سبب) */
function reasonOf(t: SessionTask, weakest: string | null, subjects: string[]): string {
  if (t.kind === "errors") return "لأن مراجعة الخطأ تمنع تكراره في الاختبار.";
  if (t.kind === "review" && t.subject && t.subject === weakest && subjects.length > 1)
    return `لأن ${t.subject} أقل موادك إنجازاً حتى الآن.`;
  if (t.kind === "drill") return "لأن التدريب يثبّت ما راجعته اليوم.";
  return "";
}

const mmss = (secs: number) => {
  const m = Math.floor(secs / 60), s = secs % 60;
  const two = (x: number) => new Intl.NumberFormat("ar-EG-u-nu-arab", { minimumIntegerDigits: 2 }).format(x);
  return `${two(m)}:${two(s)}`;
};
const taskSecs = (t: SessionTask) =>
  (t.goalMins ?? Math.max(ROADMAP_TUNING.session.minTaskMins, (t.goalCount ?? 0) * ROADMAP_TUNING.session.drillPerQuestionMins)) * 60;

export default function SessionPage() {
  const router = useRouter();
  const [exam] = useState<PriorityExam | null>(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser(); if (!u) return null;
    const ws = ensureWorkspace(u).workspace; if (!ws) return null;
    return readPriorityExam(ws);
  });
  const [avail] = useState(() => (typeof window !== "undefined" ? readTodayAvailability() : { minutes: 0, adjusted: false, blocked: false, onVacation: false }));
  const [counts] = useState(() => (exam ? countRemaining(exam.subjects) : { remainingLessons: 0, remainingDrills: 0, weakestSubject: null, totalItems: 0, doneItems: 0 }));
  const [plan, setPlan] = useState<SessionPlan | null>(() => {
    if (typeof window === "undefined" || !exam) return null;
    return buildSessionPlan({
      subjects: exam.subjects.map((s) => s.name),
      weakestSubject: counts.weakestSubject,
      remainingLessons: counts.remainingLessons,
      remainingDrills: counts.remainingDrills,
      activeErrors: vaultCount(),
      availableMinutes: avail.minutes,
      mode: loadRoadmapConfig().studyMode,
    });
  });

  const [stage, setStage] = useState<Stage>("plan");
  const [skipIdx, setSkipIdx] = useState<number | null>(null);
  const [taskIdx, setTaskIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [actualMins, setActualMins] = useState(0);
  const taskStartRef = useRef(0);

  /* المؤقّت — عدٌّ تنازليّ يتوقف عند الإيقاف المؤقّت (لا يُنهي المهمة تلقائياً — الطالب يقرّر) */
  useEffect(() => {
    if (stage !== "active" || paused) return;
    const iv = setInterval(() => setSecsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [stage, paused, taskIdx]);

  if (!exam || !plan) {
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="max-w-xl mx-auto w-full px-5 pt-10 text-center">
          <p className="t-body" style={{ color: "var(--text-muted)" }}>أضف اختباراً أولاً لتبدأ جلساتك.</p>
          <button onClick={() => router.push("/roadmap")} className="btn-primary glow-blue mt-6 w-full">← العودة إلى الآن</button>
        </div>
      </div>
    );
  }

  const tasks = plan.tasks;

  const startSession = () => {
    if (tasks.length === 0) return;
    trackEvent("session_started", { source: "masari", tasks: tasks.length, plannedMins: plan.totalMins });
    setTaskIdx(0); setSecsLeft(taskSecs(tasks[0])); setPaused(false);
    taskStartRef.current = Date.now();
    setStage("active");
  };

  /* إنهاء المهمة الحالية: تسجيل الوقت الفعليّ (سجلّ الجلسات + الإحصاءات) ثم التالية/النجاح */
  const finishTask = () => {
    const t = tasks[taskIdx];
    const elapsedMins = Math.max(1, Math.round((Date.now() - taskStartRef.current) / 60000));
    appendSession({ id: `${Date.now()}`, examId: exam.id, subject: t.subject, taskKind: t.kind, startedAt: taskStartRef.current, durationMins: elapsedMins });
    recordSession(elapsedMins, t.subject);
    setActualMins((m) => m + elapsedMins);
    if (taskIdx + 1 < tasks.length) {
      setTaskIdx((i) => i + 1); setSecsLeft(taskSecs(tasks[taskIdx + 1])); setPaused(false);
      taskStartRef.current = Date.now();
    } else {
      trackEvent("session_completed", { source: "masari", focusMins: actualMins + elapsedMins });
      setStage("done");
    }
  };

  /* تخطٍّ بسبب: استبدالٌ إن طلب (مادةٌ أخرى للمراجعة/التدريب)، وإلا حذفٌ — ودويرب يتعلّم */
  const confirmSkip = (reason: (typeof SKIP_REASONS)[number]["id"]) => {
    if (skipIdx == null) return;
    const t = tasks[skipIdx];
    trackEvent("session_task_skipped", { kind: t.kind, reason });
    let next = tasks.filter((_, i) => i !== skipIdx);
    if (reason === "swap" && (t.kind === "review" || t.kind === "drill")) {
      const other = exam.subjects.map((s) => s.name).find((s) => s !== t.subject);
      if (other) next = [...next.slice(0, skipIdx), { ...t, subject: other, label: `${t.kind === "review" ? "مراجعة" : "تدريب"} ${other}` }, ...next.slice(skipIdx)];
    }
    const totalMins = next.reduce((a, x) => a + (x.goalMins ?? (x.goalCount ?? 0) * ROADMAP_TUNING.session.drillPerQuestionMins), 0);
    setPlan({ ...plan, tasks: next, totalMins });
    setSkipIdx(null);
  };

  /* ── الحالة: لا وقت اليوم ── */
  if (!plan.available || tasks.length === 0) {
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="max-w-xl mx-auto w-full px-5 pt-8 flex flex-col" style={{ minHeight: "70dvh" }}>
          <button onClick={() => router.push("/roadmap")} className="t-body font-bold self-start" style={{ color: "var(--text-muted)" }}>← الآن</button>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-[44px]" aria-hidden="true">🌤️</span>
            <p className="t-title font-black" style={{ color: "var(--text)" }}>{avail.onVacation ? "أنت في إجازة" : "يومك ممتلئ اليوم"}</p>
            <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>{plan.hint || "خذ راحتك، ونكمل غداً بإذن الله."}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── ٣) شاشة النجاح — إنجازٌ هادئ ── */
  if (stage === "done") {
    const fresh = countRemaining(exam.subjects);
    const rest = remainingSteps({ remainingLessons: fresh.remainingLessons, remainingDrills: fresh.remainingDrills, unreviewedErrors: vaultCount() });
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="max-w-xl mx-auto w-full px-5 flex flex-col" style={{ minHeight: "88dvh" }}>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rise w-[104px] h-[104px] rounded-full grid place-items-center text-[44px]"
              style={{ background: "color-mix(in srgb, var(--success) 13%, transparent)", color: "var(--success)" }}>✓</div>
            <h1 className="t-h2 font-black mt-6" style={{ color: "var(--text)" }}>أحسنت.</h1>
            <p className="t-body mt-1.5" style={{ color: "var(--text-muted)" }}>أنهيت جلسة اليوم.</p>
            <p className="t-display font-black font-mono-nums mt-5" style={{ color: "var(--text)" }}>{n(actualMins)} دقيقة</p>
            {rest.length > 0 && (
              <div className="mt-6">
                <p className="t-caption font-black" style={{ color: "var(--text)" }}>بقي عليك</p>
                <p className="t-body mt-1 leading-loose" style={{ color: "var(--text-muted)" }}>{rest.join("، ")}</p>
              </div>
            )}
            <p className="t-caption mt-4" style={{ color: "var(--text-dim)" }}>وسيتم تحديث جاهزيتك الآن.</p>
          </div>
          <button onClick={() => router.push("/roadmap")} className="mb-8 w-full rounded-2xl py-4 t-body font-black"
            style={{ background: "transparent", color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
            العودة إلى الآن
          </button>
        </div>
      </div>
    );
  }

  /* ── ٢) الجلسة النشطة — مهمةٌ واحدة، لا شيء غيرها ── */
  if (stage === "active") {
    const t = tasks[taskIdx];
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="max-w-xl mx-auto w-full px-5 pt-6 flex flex-col" style={{ minHeight: "88dvh" }}>
          <div className="flex items-center justify-between">
            <button onClick={() => setStage("plan")} className="t-body font-bold" style={{ color: "var(--text-muted)" }}>← إنهاء</button>
            <span className="t-caption font-black px-4 py-1.5 rounded-full font-mono-nums"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              {n(taskIdx + 1)} / {n(tasks.length)}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center -mt-8">
            <span className="text-[40px]" aria-hidden="true">{TASK_ICON[t.kind]}</span>
            <h1 className="t-h3 font-black mt-3.5" style={{ color: "var(--text)" }}>{t.label}</h1>
            {reasonOf(t, counts.weakestSubject, exam.subjects.map((s) => s.name)) && (
              <p className="t-caption mt-2" style={{ color: "var(--text-muted)" }}>{reasonOf(t, counts.weakestSubject, exam.subjects.map((s) => s.name))}</p>
            )}
            <p className="font-black font-mono-nums mt-9" style={{ color: paused ? "var(--text-muted)" : "var(--text)", fontSize: "var(--fs-display, 3.6rem)", lineHeight: 1 }}>
              {mmss(secsLeft)}
            </p>
            {t.goalCount != null && <p className="t-caption mt-2" style={{ color: "var(--text-dim)" }}>الهدف: {n(t.goalCount)} سؤالاً</p>}
          </div>
          <div className="mb-8 flex flex-col gap-2.5">
            <button onClick={finishTask} className="btn-primary glow-blue w-full">إنهاء المهمة ✓</button>
            <button onClick={() => setPaused((p) => !p)} className="w-full rounded-2xl py-3.5 t-body font-bold"
              style={{ background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
              {paused ? "متابعة" : "إيقاف مؤقت"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── ١) الخطة — «ماذا ستفعل اليوم؟» ── */
  return (
    <div className="min-h-dvh relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7" style={{ paddingBottom: "calc(var(--nav-h) + 175px)" }}>
        <button onClick={() => router.push("/roadmap")} className="t-body font-bold" style={{ color: "var(--text-muted)" }}>← الآن</button>

        <h1 className="t-h2 font-black mt-5" style={{ color: "var(--text)" }}>🎯 ماذا ستفعل اليوم؟</h1>
        <p className="t-body mt-1.5" style={{ color: "var(--text-muted)" }}>جهّزت لك جلسة على قدّ يومك.</p>

        {/* مدة الجلسة — البطل الرقميّ الوحيد */}
        <div className="rounded-3xl mt-5 py-5 text-center" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>مدة الجلسة</p>
          <p className="t-display font-black font-mono-nums mt-0.5" style={{ color: "var(--text)" }}>{n(plan.totalMins)} دقيقة</p>
        </div>

        {/* وقتٌ محدود ⇒ المحرّك أعاد البناء فعلاً */}
        {avail.adjusted && (
          <div className="rounded-2xl mt-3 px-4 py-3 t-caption font-bold"
            style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 30%, var(--border))", color: "var(--text)" }}>
            ⏳ وقتك اليوم محدود، فاقترحت جلسة مختصرة.
          </div>
        )}

        <p className="eyebrow mt-6 mb-2.5 px-1">اليوم ستنجز</p>
        <div className="flex flex-col gap-2.5">
          {tasks.map((t, i) => {
            const why = reasonOf(t, counts.weakestSubject, exam.subjects.map((s) => s.name));
            return (
              <div key={`${t.kind}-${t.subject}-${i}`} className="rounded-2xl p-4 flex gap-3 items-start rise"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", animationDelay: `${i * 60}ms` }}>
                <span className="w-11 h-11 rounded-xl grid place-items-center text-[20px] flex-shrink-0"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} aria-hidden="true">{TASK_ICON[t.kind]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="t-title font-black" style={{ color: "var(--text)" }}>{t.label}</p>
                    <span className="t-caption font-bold whitespace-nowrap font-mono-nums" style={{ color: "var(--text-muted)" }}>
                      {t.goalMins != null ? `${n(t.goalMins)} دقيقة` : `${n(t.goalCount ?? 0)} سؤالاً`}
                    </span>
                  </div>
                  {why && <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{why}</p>}
                  <button onClick={() => setSkipIdx(i)} className="t-caption font-bold mt-2" style={{ color: "var(--text-dim)" }}>تخطّي</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky CTA — التحفيز + الملخّص + الفعل الواحد (فوق شريط التنقّل العائم) */}
      <div className="fixed left-0 right-0 z-40 px-5 pt-4 pb-4"
        style={{ bottom: "var(--nav-h)", background: "var(--surface)", backdropFilter: "blur(18px)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-xl mx-auto w-full">
          <p className="t-caption text-center" style={{ color: "var(--text-muted)" }}>{plan.motivation}</p>
          <p className="t-caption font-black text-center mt-1 mb-3" style={{ color: "var(--text)" }}>
            {n(tasks.length)} مهام و{n(plan.totalMins)} دقيقة
          </p>
          <button onClick={startSession}
            className="w-full rounded-2xl transition active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "17px",
              boxShadow: "0 10px 28px color-mix(in srgb, var(--accent) 42%, transparent)" }}>
            <span className="block font-black" style={{ fontSize: "1.25rem" }}>ابدأ الآن ▶</span>
          </button>
        </div>
      </div>

      {/* ورقة سبب التخطّي — دويرب يتعلّم من اختيارك */}
      {skipIdx != null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setSkipIdx(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise" style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <p className="t-title font-black text-center" style={{ color: "var(--text)" }}>لماذا تريد تخطّيها؟</p>
            <p className="t-caption text-center mt-1 mb-4" style={{ color: "var(--text-muted)" }}>يساعدني أفهمك وأرتّب جلساتك القادمة أفضل.</p>
            <div className="flex flex-col gap-2">
              {SKIP_REASONS.map((r) => (
                <button key={r.id} onClick={() => confirmSkip(r.id)}
                  className="w-full rounded-xl px-4 py-3 text-right font-bold t-body transition active:scale-[0.98]"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setSkipIdx(null)} className="w-full mt-3 py-3 t-body font-bold rounded-xl" style={{ color: "var(--text-muted)" }}>تراجع</button>
          </div>
        </div>
      )}
    </div>
  );
}
