"use client";
/* ─── بطاقة 🎓 مستقبلي الجامعي الدائمة (نظرة عامة) ───
   ملخّص مدمج: الجامعة + التخصص + مؤشر الوصول + الأيام المتبقية + زر دويرب.
   تستهلك نفس محرّك universityReadiness — لا منطق مكرّر. */
import { useMemo } from "react";
import { findMajor, findUniversity, universityReadiness } from "@/lib/university";
import { loadGoals, currentScoreMap, activeExamTrackIds, loadTrackExamDates } from "@/lib/storage";
import { getStrategy } from "@/lib/strategy";
import { daysUntil } from "@/lib/insights";
import { getTrack, type TrackId } from "@/lib/tracks";
import { n as ar } from "@/lib/format";


export default function UniversityFutureCard({ onOpenTab }: { onOpenTab?: () => void }) {
  const data = useMemo(() => {
    const goals = loadGoals();
    const major = findMajor(goals.majorId);
    const uni = findUniversity(goals.universityId);
    if (!major && !uni && !goals.university && !goals.major) return null;

    const strategy = getStrategy();
    const scoreMap = currentScoreMap();
    const scoreOf = (...keys: string[]) => {
      for (const k of keys) { for (const mk of Object.keys(scoreMap)) { if (mk.includes(k)) return scoreMap[mk].score; } }
      return null;
    };
    const readiness = universityReadiness({
      requirements: major?.requirements,
      readinessPct: strategy.readinessPct,
      quduratScore: scoreOf("قدرات"),
      tahsiliScore: scoreOf("تحصيلي"),
      stepScore: scoreOf("STEP", "ستيب"),
      weeklyHours: strategy.weeklyHoursTotal,
    });

    /* أقرب اختبار — المصدر الواحد: اختبارات الطالب من Workspace (لا activeTracks) */
    const dates = loadTrackExamDates();
    const ids = activeExamTrackIds() as TrackId[];
    let exam: { days: number; label: string } | null = null;
    for (const id of ids) {
      const d = dates[id];
      if (!d) continue;
      const days = daysUntil(d);
      if (days != null && days >= 0 && (!exam || days < exam.days)) exam = { days, label: getTrack(id)?.title ?? id };
    }

    return {
      uniName: uni?.id === "other" ? (goals.university || "أخرى") : (uni?.name ?? goals.university ?? null),
      majorName: major?.name ?? goals.major ?? null,
      readiness, exam,
    };
  }, []);

  if (!data) return null;
  const { uniName, majorName, readiness, exam } = data;

  const levelColor =
    readiness.icon === "🟢" ? "var(--success)" :
    readiness.icon === "🟡" ? "var(--gold)" : "var(--danger)";

  const askDuwairb = () => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "progress" } }));

  return (
    <div className="rounded-3xl p-4 flex flex-col gap-3"
      style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)" }}>
      <div className="flex items-center gap-2">
        <span className="text-[20px]">🎓</span>
        <p className="text-[16px] font-black flex-1" style={{ color: "var(--text)" }}>مستقبلي الجامعي</p>
        {onOpenTab && (
          <button onClick={onOpenTab} className="text-[14px] font-bold px-2" style={{ color: "var(--accent-light)" }}>
            عرض الكل ←
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {majorName && (
          <p className="text-[17px] font-black" style={{ color: "var(--text)" }}>{majorName}</p>
        )}
        {uniName && (
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>🏛️ {uniName}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {readiness.hasData ? (
          <span className="text-[14px] font-black px-2.5 py-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${levelColor} 14%, transparent)`, color: levelColor }}>
            {readiness.icon} الوصول: {readiness.level} ({ar(readiness.score)}٪)
          </span>
        ) : (
          <span className="text-[14px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            أضف نتائجك لحساب مؤشر الوصول
          </span>
        )}
        {exam && (
          <span className="text-[14px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>
            ⏳ {ar(exam.days)} يوم لـ{exam.label}
          </span>
        )}
      </div>

      <button onClick={askDuwairb}
        className="rounded-2xl py-2.5 text-[15px] font-black transition active:scale-[0.97]"
        style={{ background: "var(--accent)", color: "#fff" }}>
        🤖 كيف أصل لهذا التخصص؟
      </button>
    </div>
  );
}
