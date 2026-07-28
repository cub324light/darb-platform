"use client";
/* ─── لوحة الإحصائيات — 10 مؤشرات + إتقان المهارات + الأداء الأسبوعي/الشهري ─── */
import { memo } from "react";
import type { WeeklyReportData } from "@/lib/weeklyReport";
import { fmtMins } from "@/lib/weeklyReport";
import { n } from "@/lib/format";

export interface StatsData {
  focusMins: number;
  sessions: number;
  currentStreak: number;
  longestStreak: number;
  plans: number;
  mistakes: number;
  flashcards: number;
  aiChats: number;
  filesAnalyzed: number;
  quizzes: number;
  skillAvg: number | null;
  weekly: WeeklyReportData | null;
  monthlyDeltaPct: number | null;
}

/* مُصدَّر ليعيد استخدامه ProfileQuickStats — تنسيق واحد للرقم في كل مكان */
export function hoursLabel(mins: number): { val: string; unit: string } {
  if (mins < 60) return { val: n(mins), unit: "دقيقة" };
  const h = Math.round((mins / 60) * 10) / 10; // خانة عشرية واحدة
  return { val: n(h), unit: "ساعة" };
}

function ProfileStatsBase({ data }: { data: StatsData }) {
  const isEmpty = data.sessions === 0 && data.focusMins === 0 && data.mistakes === 0
    && data.flashcards === 0 && data.aiChats === 0 && data.filesAnalyzed === 0
    && data.quizzes === 0 && data.plans === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-4xl mb-2">📊</div>
        <p className="font-black text-[18px] mb-1" style={{ color: "var(--text)" }}>أرقامك تنتظر أول إنجاز</p>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          ساعاتك، جلساتك، ستريكك، وكل تقدّمك سيظهر هنا فور ما تبدأ. كل رقم قصة جهد.
        </p>
        <a href="/orbit" className="inline-block px-5 py-2.5 rounded-2xl text-[16px] font-bold no-underline transition active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff" }}>▶ ابدأ الآن</a>
      </div>
    );
  }

  const hrs = hoursLabel(data.focusMins);
  const tiles = [
    { icon: "⏱", val: hrs.val, label: hrs.unit === "ساعة" ? "ساعة تركيز" : "دقيقة تركيز" },
    { icon: "✅", val: n(data.sessions), label: "جلسة" },
    { icon: "🔥", val: n(data.currentStreak), label: "ستريك حالي" },
    { icon: "🏔️", val: n(data.longestStreak), label: "أطول ستريك" },
    { icon: "🔍", val: n(data.mistakes), label: "خطأ محفوظ" },
    { icon: "🃏", val: n(data.flashcards), label: "بطاقة" },
    { icon: "🧩", val: n(data.plans), label: "خطة" },
    { icon: "💬", val: n(data.aiChats), label: "محادثة ذكاء" },
    { icon: "📂", val: n(data.filesAnalyzed), label: "ملف محلَّل" },
    { icon: "📝", val: n(data.quizzes), label: "اختبار مولّد" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="label mb-3">إحصائياتك</p>
        <ul className="grid grid-cols-3 gap-2.5 list-none m-0 p-0" aria-label="إحصائياتك الكاملة">
          {tiles.map((s) => (
            <li key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-base leading-none mb-1" aria-hidden="true">{s.icon}</p>
              <p className="font-mono-nums font-black text-lg text-[var(--text)] leading-none">{s.val}</p>
              <p className="text-[13px] text-[var(--text-muted)] font-semibold mt-1">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* إتقان المهارات */}
      {data.skillAvg !== null && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>🧠 متوسط إتقان المهارات</span>
            <span className="font-mono-nums font-black text-[17px]" style={{ color: "var(--accent-light)" }}>{data.skillAvg}%</span>
          </div>
          <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: "var(--border)" }}
            role="progressbar" aria-label="متوسط إتقان المهارات" aria-valuenow={data.skillAvg} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.skillAvg}%`, background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {/* الأداء الأسبوعي + الشهري */}
      {data.weekly && data.weekly.hasData && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="label mb-3">أداؤك مؤخراً</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>هذا الأسبوع</p>
              <p className="text-[18px] font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{fmtMins(data.weekly.mins)}</p>
              {data.weekly.deltaPct !== null && (
                <p className="text-[14px] font-bold" style={{ color: data.weekly.deltaPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {data.weekly.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(data.weekly.deltaPct)}% عن السابق
                </p>
              )}
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>أيام نشطة (7)</p>
              <p className="text-[18px] font-black font-mono-nums" style={{ color: "var(--text)" }}>{n(data.weekly.activeDays)}</p>
              {data.monthlyDeltaPct !== null && (
                <p className="text-[14px] font-bold" style={{ color: data.monthlyDeltaPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                  شهرياً {data.monthlyDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(data.monthlyDeltaPct)}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProfileStatsBase);
