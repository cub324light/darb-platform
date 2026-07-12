"use client";
/* ─── بطاقة تقييم واقعية الهدف ───
   تُستخدَم في Profile (تبويب الأهداف) وصفحة الخطة.
   مصدر القرار: evaluateGoal() في goalReality.ts — لا منطق مكرّر هنا. */
import { useMemo } from "react";
import { evaluateGoal, type GoalRealityResult } from "@/lib/goalReality";
import { loadGoals, loadUser, currentScoreMap } from "@/lib/storage";
import { getStrategy } from "@/lib/strategy";
import { daysUntil } from "@/lib/insights";
import { loadTrackExamDates } from "@/lib/storage";
import { getTrack, type TrackId } from "@/lib/tracks";

/* حقل الدرجة المستهدفة لكل اختبار */
const TRACK_GOAL_KEY: Record<string, keyof ReturnType<typeof loadGoals>> = {
  "قدرات":         "quduratTarget",
  "تحصيلي":        "tahsiliTarget",
  "تحصيلي مبكر":  "tahsiliTarget",
  "ستيب":          "stepTarget",
  "CPC":           "cpcTarget",
  "ITC":           "itcTarget",
};

interface GoalEntry {
  examName: string;
  result: GoalRealityResult;
}

export default function GoalRealityCard() {
  const entries = useMemo<GoalEntry[]>(() => {
    const u = loadUser();
    if (!u) return [];
    const goals = loadGoals();
    const scoreMap = currentScoreMap();
    const trackDates = loadTrackExamDates();
    const ids = (u.activeTracks?.length ? u.activeTracks : (u.track ? [u.track] : [])) as TrackId[];
    if (!ids.length) return [];

    const strategy = getStrategy();

    return ids.map((id) => {
      const track = getTrack(id);
      const examName = track?.title ?? id;
      const goalKey = TRACK_GOAL_KEY[id];
      const targetScore = goalKey ? (goals[goalKey] as number | undefined) : undefined;
      const dateStr = trackDates[id] ?? u.examDate ?? null;
      const days = daysUntil(dateStr);
      const currentEntry = scoreMap[examName] ?? scoreMap[id];

      const result = evaluateGoal({
        targetScore: targetScore ?? null,
        currentScore: currentEntry?.score ?? null,
        daysToExam: days,
        weeklyHoursTotal: strategy.weeklyHoursTotal,
        readinessPct: strategy.readinessPct,
        attemptCount: currentEntry?.attempts ?? 0,
        examName,
      });

      return { examName, result };
    });
  }, []);

  if (!entries.length) return null;

  /* لو كل الأهداف غير محدودة (50 / واقعي بسبب لا هدف) → لا نعرض */
  const hasTarget = entries.some((e) => e.result.feasibilityScore !== 50 || e.result.reason.startsWith("لا يوجد"));
  if (!hasTarget) return null;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[15px] font-black" style={{ color: "var(--text)" }}>🎯 واقعية أهدافك</p>

      {entries.map(({ examName, result }) => (
        <div key={examName}
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
          style={{ background: "var(--surface2)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[20px]">{result.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-black truncate" style={{ color: "var(--text)" }}>
                {examName} — {result.verdict}
              </p>
            </div>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: result.icon === "🟢"
                  ? "color-mix(in srgb, var(--success) 15%, transparent)"
                  : result.icon === "🟡"
                  ? "color-mix(in srgb, var(--gold) 15%, transparent)"
                  : "color-mix(in srgb, var(--danger) 15%, transparent)",
                color: result.icon === "🟢" ? "var(--success)" : result.icon === "🟡" ? "var(--gold)" : "var(--danger)",
              }}>
              {result.feasibilityScore}٪
            </span>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>{result.reason}</p>
          <p className="text-[14px] font-bold rounded-lg px-2.5 py-1.5 mt-0.5"
            style={{
              background: result.icon === "🟢"
                ? "color-mix(in srgb, var(--success) 8%, transparent)"
                : result.icon === "🟡"
                ? "color-mix(in srgb, var(--gold) 8%, transparent)"
                : "color-mix(in srgb, var(--danger) 8%, transparent)",
              color: result.icon === "🟢" ? "var(--success)" : result.icon === "🟡" ? "var(--gold)" : "var(--danger)",
            }}>
            💡 {result.suggestion}
          </p>
        </div>
      ))}
    </div>
  );
}
