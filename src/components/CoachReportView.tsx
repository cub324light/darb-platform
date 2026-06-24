"use client";
/* ─── تقرير المدرب الأسبوعي ───
   مُحسَّب بالكامل من البيانات المحلية — لا طلب شبكة.
   يُعرض من ملف الطالب (تبويب مدرّبي) ومن لوحة التحكم. */
import { useMemo } from "react";
import { loadStats, loadSessionLog, loadPrefs } from "@/lib/storage";
import { computeWeeklyReport, fmtMins } from "@/lib/weeklyReport";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { computeDuwairbScore, detectMissedOpportunities } from "@/lib/coachScore";
import { activeDaysWithin } from "@/lib/insights";
import { trackEvent } from "@/lib/events";
import { useEffect } from "react";

const ar = (n: number) => n.toLocaleString("ar");

export default function CoachReportView() {
  const data = useMemo(() => {
    const stats = loadStats();
    const log = loadSessionLog();
    const weekly = computeWeeklyReport(stats, log);
    const { profile, goalLine } = buildDuwairbProfile();
    const readinessPct = profile.readinessPct ?? 0;
    const score = computeDuwairbScore(stats, readinessPct);

    /* أسبوع سابق للمقارنة */
    const prevStreak = 0; // لا نخزّن التاريخي — نعرض الحالي فقط

    /* ساعات هذا الأسبوع */
    const weekHours = Math.round((weekly.mins / 60) * 10) / 10;

    /* فرص ضائعة */
    const prefs = loadPrefs();
    const primaryExam = profile.exams?.[0];
    const opps = detectMissedOpportunities(stats, readinessPct, {
      targetScore: primaryExam?.target,
      examName: primaryExam?.name,
      daysRemaining: primaryExam?.days,
      weeklyStudyMins: weekly.mins,
      reviewedCardsCount: (() => {
        try {
          const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]") as { repetitions?: number }[];
          return cards.filter((c) => (c.repetitions ?? 0) > 0).length;
        } catch { return 0; }
      })(),
    });

    return { stats, weekly, profile, goalLine, readinessPct, score, weekHours, opps, prefs };
  }, []);

  /* قياس المشاهدة */
  useEffect(() => {
    trackEvent("coach_report_viewed");
  }, []);

  const { weekly, score, weekHours, opps, goalLine, readinessPct } = data;

  const deltaSign = (weekly.deltaPct ?? 0) >= 0 ? "↑" : "↓";
  const deltaAbs = Math.abs(weekly.deltaPct ?? 0);

  /* لون التقييم */
  const scoreColor =
    score.total >= 75 ? "var(--success)" :
    score.total >= 50 ? "var(--accent-light)" :
    score.total >= 30 ? "var(--gold)" :
    "var(--danger)";

  return (
    <div className="flex flex-col gap-5">

      {/* رأس التقرير */}
      <div className="rounded-3xl p-5"
        style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
        <p className="text-[13px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>📊 تقريرك الأسبوعي</p>
        <p className="text-[22px] font-black mb-0.5" style={{ color: "var(--text)" }}>
          {fmtMins(weekly.mins)}
          {weekly.deltaPct != null && (
            <span className="text-[14px] font-bold mr-2" style={{ color: (weekly.deltaPct ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>
              {deltaSign} {deltaAbs}٪
            </span>
          )}
        </p>
        {goalLine && <p className="text-[13px] font-semibold" style={{ color: "var(--accent-light)" }}>🎯 {goalLine}</p>}
      </div>

      {/* شبكة الإحصائيات */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: "⏱️", label: "ساعات الأسبوع",   value: `${weekHours} س` },
          { icon: "🔥", label: "جلسات منجزة",     value: `${ar(weekly.sessions)} جلسة` },
          { icon: "📅", label: "أيام نشطة",       value: `${ar(weekly.activeDays)}/7` },
          { icon: "⚡", label: "الستريك الحالي",  value: `${ar(weekly.streak)} يوم` },
          ...(readinessPct ? [{ icon: "🚀", label: "الجاهزية", value: `${ar(readinessPct)}٪` }] : []),
          ...(weekly.topSubject ? [{ icon: "⭐", label: "الأقوى",  value: weekly.topSubject.name }] : []),
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl px-4 py-3.5 flex flex-col gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
              <span aria-hidden="true">{tile.icon}</span> {tile.label}
            </p>
            <p className="text-[18px] font-black" style={{ color: "var(--text)" }}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* تقييم دويرب */}
      <div className="rounded-3xl p-5 flex flex-col gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>🎯 تقييم دويرب</p>
            <p className="text-[28px] font-black leading-tight" style={{ color: scoreColor }}>
              {ar(score.total)}<span className="text-[16px] font-bold" style={{ color: "var(--text-muted)" }}>/100</span>
            </p>
          </div>
          {/* شريط دائري بسيط */}
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--surface2)" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="5"
              strokeDasharray={`${(score.total / 100) * 138.2} 138.2`}
              strokeLinecap="round" transform="rotate(-90 28 28)" />
          </svg>
        </div>

        {/* مكوّنات التقييم */}
        <div className="flex flex-col gap-1.5">
          {Object.values(score.components).map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <p className="text-[12px] font-bold w-24 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{c.label}</p>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(c.score / c.max) * 100}%`, background: "var(--accent)" }} />
              </div>
              <p className="text-[11px] font-bold w-8 text-left" style={{ color: "var(--text-muted)" }}>{c.score}/{c.max}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ الإنجازات */}
      {score.strengths.length > 0 && (
        <div className="rounded-3xl p-4"
          style={{ background: "color-mix(in srgb, var(--success) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)" }}>
          <p className="text-[13px] font-black mb-2.5" style={{ color: "var(--success)" }}>✅ إنجازاتك</p>
          <ul className="flex flex-col gap-1.5">
            {score.strengths.map((s) => (
              <li key={s} className="text-[13px] font-semibold flex items-start gap-1.5" style={{ color: "var(--text)" }}>
                <span aria-hidden="true">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ⚠️ ما يحتاج تحسين */}
      {score.gaps.length > 0 && (
        <div className="rounded-3xl p-4"
          style={{ background: "color-mix(in srgb, var(--gold) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--gold) 20%, transparent)" }}>
          <p className="text-[13px] font-black mb-2.5" style={{ color: "var(--gold)" }}>⚠️ ما يحتاج تحسين</p>
          <ul className="flex flex-col gap-1.5">
            {score.gaps.map((g) => (
              <li key={g} className="text-[13px] font-semibold flex items-start gap-1.5" style={{ color: "var(--text)" }}>
                <span aria-hidden="true">•</span>{g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 🎯 توصية دويرب — فرص ضائعة */}
      {opps.length > 0 && (
        <div className="rounded-3xl p-4 flex flex-col gap-3"
          style={{ background: "color-mix(in srgb, var(--danger) 5%, var(--surface))", border: "1px solid color-mix(in srgb, var(--danger) 18%, transparent)" }}>
          <p className="text-[13px] font-black" style={{ color: "var(--danger)" }}>🎯 توصية دويرب للأسبوع القادم</p>
          {opps.map((o, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{o.message}</p>
              <p className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>← {o.solution}</p>
            </div>
          ))}
        </div>
      )}

      {/* إن لا فرص ضائعة → توصية إيجابية */}
      {opps.length === 0 && score.total >= 50 && (
        <div className="rounded-3xl p-4"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
          <p className="text-[13px] font-black mb-1" style={{ color: "var(--accent-light)" }}>🎯 توصية دويرب للأسبوع القادم</p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {score.total >= 75
              ? "أنت على المسار الصحيح — حافظ على هذا الإيقاع وركّز على التدريب بأسئلة مشابهة للاختبار الحقيقي."
              : "استمر في بناء عادة المذاكرة اليومية — الاتساق هو أقوى سلاح لتحسين تقييمك."}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-2">
        <a href="/orbit"
          className="py-3 rounded-2xl text-[13px] font-black transition active:scale-[0.97] flex items-center justify-center gap-1.5 no-underline"
          style={{ background: "var(--accent)", color: "#fff" }}>
          ⏱️ ابدأ جلسة الآن
        </a>
        <a href="/roadmap"
          className="py-3 rounded-2xl text-[13px] font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5 no-underline"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          🗺️ افتح الخريطة
        </a>
      </div>
    </div>
  );
}
