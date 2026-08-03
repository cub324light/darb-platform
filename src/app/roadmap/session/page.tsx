"use client";
/* ═══════════ 🎯 ماذا ستفعل اليوم؟ — جلسة المذاكرة (V2) ═══════════
   أهم شاشةٍ في درب: مدرّبٌ شخصيّ لا قائمة مهام. التدفّق:
   الخطة (مهامّ بأسباب + تخطٍّ بسبب + Sticky CTA) ← «ابدأ الآن» يسلّم الجلسة إلى صفحة
   ⏱️ التركيز (نظام توقيتٍ واحدٌ للتطبيق كلّه، لا مؤقّتان) ← عند انتهائها تعود إلى هنا
   بـ?done=N فتظهر شاشة النجاح (الاستغراق الفعليّ + ما بقي) ثم «العودة إلى الآن».
   كل الحساب في المحرّكات النقيّة (buildSessionPlan · remainingSteps). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { loadUser, ensureWorkspace } from "@/lib/storage";
import { buildSessionPlan, type SessionPlan, type SessionTask } from "@/lib/roadmap/session";
import { remainingSteps } from "@/lib/roadmap/remainingSteps";
import { focusHandoffQuery } from "@/lib/roadmap/handoff";
import { readPriorityExam, countRemaining, readPlanSubjects, vaultCount, readTodayAvailability, type PriorityExam } from "@/lib/roadmap/nowRead";
import { loadRoadmapConfig } from "@/lib/roadmap/store";
import { ROADMAP_TUNING } from "@/lib/roadmap/config";
import { trackEvent } from "@/lib/analytics";
import { n } from "@/lib/format";
import Sheet from "@/components/Sheet";

type Stage = "plan" | "done";
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

/* «سؤال واحد · سؤالان · 5 أسئلة · 40 سؤالاً» — تمييزُ العربية يتبع العدد،
   و«5 سؤالاً» خطأٌ نحويّ كان يظهر للطالب في كل جلسة. */
function questions(c: number): string {
  if (c === 1) return "سؤال واحد";
  if (c === 2) return "سؤالان";
  return `${n(c)} ${c >= 3 && c <= 10 ? "أسئلة" : "سؤالاً"}`;
}

export default function SessionPage() {
  const router = useRouter();
  const [exam] = useState<PriorityExam | null>(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser(); if (!u) return null;
    const ws = ensureWorkspace(u).workspace; if (!ws) return null;
    return readPriorityExam(ws);
  });
  const [avail] = useState(() => (typeof window !== "undefined" ? readTodayAvailability() : { minutes: 0, adjusted: false, blocked: false, onVacation: false }));
  /* نفسُ نمط التوزيع الذي تقرؤه لوحةُ مساري — مصدرٌ واحد لا قراءتان */
  const [planSubjects] = useState(() => {
    if (typeof window === "undefined") return [] as { name: string; color: string }[];
    const u = loadUser(); if (!u) return [];
    const w = ensureWorkspace(u).workspace;
    return w ? readPlanSubjects(w) : [];
  });
  const [counts] = useState(() => (planSubjects.length ? countRemaining(planSubjects) : { remainingLessons: 0, remainingDrills: 0, weakestSubject: null, totalItems: 0, doneItems: 0 }));
  const [plan, setPlan] = useState<SessionPlan | null>(() => {
    if (typeof window === "undefined" || !exam) return null;
    return buildSessionPlan({
      subjects: planSubjects.map((s) => s.name),
      weakestSubject: counts.weakestSubject,
      remainingLessons: counts.remainingLessons,
      remainingDrills: counts.remainingDrills,
      activeErrors: vaultCount(),
      availableMinutes: avail.minutes,
      mode: loadRoadmapConfig().studyMode,
    });
  });

  /* عائدٌ من التركيز؟ ?done=N ⇒ شاشة النجاح بالمدّة الفعليّة التي سجّلها التركيز */
  const [doneMins] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(new URLSearchParams(window.location.search).get("done")) || 0;
  });
  const [stage] = useState<Stage>(() => (doneMins > 0 ? "done" : "plan"));
  const [skipIdx, setSkipIdx] = useState<number | null>(null);

  if (!exam || !plan) {
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="max-w-xl mx-auto w-full px-5 pt-10 text-center">
          <p className="t-body" style={{ color: "var(--text-muted)" }}>أضف اختباراً أولاً لتبدأ جلساتك.</p>
          <button onClick={() => router.push("/roadmap")} className="btn-primary glow-blue mt-6 w-full">→ العودة إلى الآن</button>
        </div>
      </div>
    );
  }

  const tasks = plan.tasks;

  /* «ابدأ الآن» — تسليمٌ إلى ⏱️ التركيز (نظام التوقيت الوحيد)، ويعود بـ?done=N.
     نمرّر وزن المهمّة الأولى (task) واسمها (tlabel) ليعرف الطالب — وهو داخل التركيز —
     كم يتبقّى من مهمّته بعد هذه الجلسة، فلا ينقطع الخيط بين الخطة والمؤقّت. */
  const startSession = () => {
    if (tasks.length === 0) return;
    trackEvent("session_started", { source: "masari", tasks: tasks.length });
    const t = tasks[0];
    router.push(`/orbit?${focusHandoffQuery({ subject: t?.subject, taskMins: t?.goalMins, taskLabel: t?.label })}`);
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
          <div className="self-start"><BackButton href="/roadmap" label="مساري" /></div>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-[44px]" aria-hidden="true">🌤️</span>
            <p className="t-title font-black" style={{ color: "var(--text)" }}>{avail.onVacation ? "أنت في إجازة" : "يومك ممتلئ اليوم"}</p>
            <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>{plan.hint || "خذ راحتك، ونكمل غداً بإذن الله."}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── 3) شاشة النجاح — إنجازٌ هادئ ── */
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
            <p className="t-display font-black font-mono-nums mt-5" style={{ color: "var(--text)" }}>{n(doneMins)} دقيقة</p>
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

  /* ── 1) الخطة — «ماذا ستفعل اليوم؟» ── */
  return (
    <div className="min-h-dvh relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7" style={{ paddingBottom: "calc(var(--nav-h) + 175px)" }}>
        <BackButton href="/roadmap" label="مساري" />

        <h1 className="t-h2 font-black mt-5" style={{ color: "var(--text)" }}>🎯 ماذا ستفعل اليوم؟</h1>
        <p className="t-body mt-1.5" style={{ color: "var(--text-muted)" }}>جهّزت لك جلسة على قدّ يومك.</p>

        {/* ما ستنجزه — البطل الرقميّ الوحيد. المدّة ليست هنا: هي تفضيلٌ محفوظٌ في ⏱️ التركيز،
            فلو أعلنّا رقماً هنا لناقض المؤقّت الحقيقيّ الذي سيبدأ بعد «ابدأ الآن». */}
        <div className="rounded-3xl mt-5 py-5 text-center" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>جلسة اليوم</p>
          <p className="t-display font-black font-mono-nums mt-0.5" style={{ color: "var(--text)" }}>{n(tasks.length)} مهام</p>
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
                      {t.goalMins != null ? `${n(t.goalMins)} دقيقة` : questions(t.goalCount ?? 0)}
                    </span>
                  </div>
                  {why && <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{why}</p>}
                  <button onClick={() => setSkipIdx(i)} className="t-caption font-bold mt-2 tap-44" style={{ color: "var(--text-dim)" }}>تخطّي</button>
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
            {n(tasks.length)} مهام — تبدأ بجلسة تركيز
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
        <Sheet onClose={() => setSkipIdx(null)} label="سبب التخطّي">
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
        </Sheet>
      )}
    </div>
  );
}
