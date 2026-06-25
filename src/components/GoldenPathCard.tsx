"use client";
/* ─── بطاقة المسار الذهبي: «أولويتك الآن» ───
   تعرض أولوية الطالب الحالية المحسوبة من goldenPath: بؤرة التركيز + السبب +
   ما أوقفناه + المعلم القادم + زر تفعيل المرحلة التالية (بتأكيد) + متطلبات القبول.
   تظهر لطلاب الثانوي والخريجين فقط (state.show). */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadGoldenPath, type GoldenPathState } from "@/lib/goldenPath";
import { activateTrack } from "@/lib/storage";
import { getTrack, type TrackId } from "@/lib/tracks";

export default function GoldenPathCard() {
  const [state, setState] = useState<GoldenPathState | null>(null);

  useEffect(() => { setState(loadGoldenPath()); }, []);

  const activate = (ids: TrackId[]) => {
    const titles = ids.map((id) => getTrack(id).title).join("، ");
    if (!window.confirm(`بنفعّل ${titles} في مساراتك ونحدّث خطتك حسب أولويتك. تمام؟`)) return;
    for (const id of ids) activateTrack(id);
    window.location.reload();
  };

  const accent = "#D4920A"; // ذهبي — هوية المسار الذهبي
  const isAdmission = state?.primary.kind === "admission";
  const isUniversity = state?.phaseId.startsWith("uni-") ?? false;
  const cardTitle = isUniversity ? "🎓 مسارك الجامعي الآن" : "🧭 أولويتك الآن";

  const milestoneText = useMemo(() => {
    if (!state?.nextMilestone) return null;
    const m = state.nextMilestone;
    if (m.daysAway != null && m.daysAway >= 0) return `${m.label} — خلال ${m.daysAway.toLocaleString("ar")} يوم`;
    return m.label;
  }, [state]);

  if (!state || !state.show) return null;

  return (
    <div className="rise rounded-2xl px-5 py-4"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb,#F5B40A 11%,transparent), color-mix(in srgb,var(--accent) 6%,transparent)), var(--surface)",
        border: "1.5px solid color-mix(in srgb,#F5B40A 32%,transparent)",
      }}>
      {/* العنوان + المرحلة */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[12.5px] font-bold" style={{ color: accent }}>{cardTitle}</p>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "color-mix(in srgb,#F5B40A 14%,transparent)", color: accent }}>
          {state.phaseLabel}
        </span>
      </div>

      {/* بؤرة التركيز */}
      <p className="text-[18px] font-black leading-tight" style={{ color: "var(--text)" }}>
        {state.primary.label}
      </p>
      {state.secondary && (
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          وبعدها: {state.secondary.label}
        </p>
      )}

      {/* السبب */}
      <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: "var(--text)" }}>
        {state.reason}
      </p>

      {/* ما أوقفناه */}
      {state.paused.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {state.paused.map((p) => (
            <span key={p.label} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              ⏸ {p.label} — {p.reason}
            </span>
          ))}
        </div>
      )}

      {/* متطلبات القبول */}
      {isAdmission && state.admissionChecklist && (
        <div className="flex flex-col gap-1.5 mt-3">
          {state.admissionChecklist.map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-[13px]">
              <span style={{ color: c.done ? "var(--success)" : "var(--text-muted)" }}>{c.done ? "✓" : "○"}</span>
              <span style={{ color: "var(--text)", fontWeight: c.done ? 700 : 500 }}>{c.label}</span>
              {c.value && <span className="font-mono-nums" style={{ color: "var(--text-muted)" }}>{c.value}</span>}
            </div>
          ))}
        </div>
      )}

      {/* توصية الإنجليزي */}
      {state.englishRecommendation && (
        <p className="text-[12.5px] leading-relaxed mt-2.5 rounded-xl px-3 py-2"
          style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
          🔤 {state.englishRecommendation}
        </p>
      )}

      {/* المعلم القادم */}
      {milestoneText && !isAdmission && (
        <p className="text-[12px] font-semibold mt-2.5" style={{ color: "var(--text-muted)" }}>
          🔔 {milestoneText}
        </p>
      )}

      {/* الإجراءات */}
      <div className="flex flex-wrap gap-2 mt-3">
        {state.suggestedActivate.length > 0 && (
          <button onClick={() => activate(state.suggestedActivate)}
            className="px-4 py-2 rounded-xl text-[13.5px] font-black transition active:scale-[0.97]"
            style={{ background: accent, color: "#fff" }}>
            ✅ فعّل {state.suggestedActivate.map((id) => getTrack(id).title).join(" و")}
          </button>
        )}
        {isAdmission && (
          <Link href="/university"
            className="px-4 py-2 rounded-xl text-[13.5px] font-black transition active:scale-[0.97] no-underline"
            style={{ background: accent, color: "#fff" }}>
            🏛️ احسب موزونتك
          </Link>
        )}
      </div>
    </div>
  );
}
