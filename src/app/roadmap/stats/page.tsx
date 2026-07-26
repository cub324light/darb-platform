"use client";
/* ═══════════ 📈 الإحصائيات — قصّةٌ لا لوحة (V2) ═══════════
   تبدأ بـ«هذا الأسبوع» (سؤال الزائر الحقيقيّ: كيف أدائي الآن؟) ثم Heatmap ثم بطاقات
   Bento متنوّعة الأحجام. كل رقمٍ من computeStats النقيّ، وأي إحصاءٍ بلا بياناتٍ حقيقية
   يظهر كدعوةٍ صادقة («ابدأ أول جلسة، وسنعرض تقدمك هنا») — لا صفرٌ ولا اختراع. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStats, loadUser, localDayKey } from "@/lib/storage";
import { computeStats } from "@/lib/roadmap/stats";
import { loadSessions } from "@/lib/roadmap/sessionStore";
import { n, pct, dateShort } from "@/lib/format";

const LEVEL_MIX = [0, 24, 46, 70, 100]; // شدّة اللون لكل مستوى نشاط

/* بطاقة Bento — عنوانٌ خافت ثم قيمةٌ كبيرة أو دعوةٌ صادقة */
function B({ title, value, sub, wide, children }: {
  title: string; value?: string | null; sub?: string; wide?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-4 ${wide ? "col-span-2" : ""}`} style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{title}</p>
      {children ?? (value != null ? (
        <>
          <p className="t-h3 font-black font-mono-nums mt-1.5" style={{ color: "var(--text)" }}>{value}</p>
          {sub && <p className="t-caption mt-0.5" style={{ color: "var(--text-dim)" }}>{sub}</p>}
        </>
      ) : (
        <p className="t-caption mt-2 leading-relaxed" style={{ color: "var(--text-dim)" }}>{sub ?? "ابدأ أول جلسة، وسنعرض تقدمك هنا."}</p>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [s] = useState(() => computeStats({
    dayMins: typeof window !== "undefined" ? (loadStats().dayMins ?? {}) : {},
    sessions: typeof window !== "undefined" ? loadSessions() : [],
    today: localDayKey(),
    plannedDailyMins: typeof window !== "undefined" ? (((loadUser()?.studyHours ?? 0) * 60) || null) : null,
  }));

  const hasAny = s.heatmap.some((c) => c.mins > 0);
  const hourLabel = (h: number) => `${n(((h + 11) % 12) + 1)}–${n(((h + 12) % 12) + 1)} ${h >= 12 ? "م" : "ص"}`;
  /* أعمدة أيام الأسبوع من الـHeatmap (السبت→الجمعة) */
  const last7 = s.heatmap.slice(-7);
  const maxDay = Math.max(1, ...last7.map((c) => c.mins));

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7 pb-8 flex flex-col gap-4">
        <button onClick={() => router.push("/roadmap")} className="t-body font-bold self-start" style={{ color: "var(--text-muted)" }}>← الآن</button>
        <h1 className="t-h2 font-black -mt-2" style={{ color: "var(--text)" }}>📈 إحصائياتك</h1>

        <div className="grid grid-cols-2 gap-2.5">
          {/* هذا الأسبوع — أول ما يُرى */}
          <B title="هذا الأسبوع" wide>
            {s.week.hours > 0 || s.week.sessions > 0 ? (
              <div className="flex mt-2">
                {[
                  { v: n(s.week.hours), l: "ساعة" },
                  { v: n(s.week.sessions), l: "جلسات" },
                  { v: `🔥 ${n(s.week.streakDays)}`, l: "أيام متتالية" },
                  ...(s.week.commitmentPct != null ? [{ v: pct(s.week.commitmentPct), l: "التزام" }] : []),
                ].map((x, i) => (
                  <div key={x.l} className="flex-1 text-center" style={i > 0 ? { borderInlineStart: "1px solid var(--border)" } : undefined}>
                    <p className="t-title font-black font-mono-nums" style={{ color: "var(--text)" }}>{x.v}</p>
                    <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{x.l}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-caption mt-2 leading-relaxed" style={{ color: "var(--text-dim)" }}>ابدأ أول جلسة، وسنعرض تقدمك هنا.</p>
            )}
          </B>

          {/* Heatmap */}
          <B title="🗓️ نشاطك — آخر ١٢ أسبوعاً" wide>
            {hasAny ? (
              <div className="grid gap-[3px] mt-2.5" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
                {s.heatmap.map((c) => (
                  <i key={c.day} title={c.day} className="block rounded-[4px]"
                    style={{ aspectRatio: "1", background: c.level === 0 ? "var(--surface2)" : `color-mix(in srgb, var(--accent) ${LEVEL_MIX[c.level]}%, var(--surface2))` }} />
                ))}
              </div>
            ) : (
              <p className="t-caption mt-2 leading-relaxed" style={{ color: "var(--text-dim)" }}>كل يوم تذاكر فيه سيضيء هنا.</p>
            )}
          </B>

          <B title="🔥 أطول سلسلة"
            value={s.longestStreak > 0 ? `${n(s.longestStreak)} أيام` : null}
            sub={s.longestStreak > 0 ? `وسلسلتك الحالية ${n(s.week.streakDays)}` : "ذاكر يومين متتاليين لتبدأ سلسلتك."} />

          <B title="🕐 أكثر ساعة"
            value={s.topHour.available && s.topHour.value ? hourLabel(s.topHour.value.hour) : null}
            sub={s.topHour.available ? "وقتك الذهبي" : "تظهر بعد أول جلساتك."} />

          <B title="📚 أكثر مادة"
            value={s.topSubject.available && s.topSubject.value ? s.topSubject.value.subject : null}
            sub={s.topSubject.available && s.topSubject.value ? `${n(Math.round(s.topSubject.value.mins / 60))} ساعات مسجّلة` : "تظهر بعد أول جلساتك."} />

          <B title="أيام أسبوعك">
            {hasAny ? (
              <>
                <div className="flex items-end gap-1.5 mt-2.5" style={{ height: "58px" }}>
                  {last7.map((c) => (
                    <i key={c.day} className="flex-1 rounded-t-md" style={{
                      height: `${Math.max(6, (c.mins / maxDay) * 100)}%`,
                      background: c.mins === maxDay && c.mins > 0 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 26%, var(--surface2))",
                    }} />
                  ))}
                </div>
                <p className="t-caption mt-1.5" style={{ color: "var(--text-dim)" }}>آخر ٧ أيام</p>
              </>
            ) : (
              <p className="t-caption mt-2" style={{ color: "var(--text-dim)" }}>ابدأ أول جلسة.</p>
            )}
          </B>

          <B title="📅 أفضل أسبوع"
            value={s.bestWeek.available && s.bestWeek.value ? `${n(s.bestWeek.value.hours)} ساعة` : null}
            sub={s.bestWeek.available && s.bestWeek.value ? `يبدأ ${dateShort(s.bestWeek.value.start)}` : "يظهر بعد أسبوعٍ من المذاكرة."} />

          <B title="↕️ مقارنة بالشهر الماضي"
            value={s.vsLastMonthPct.available && s.vsLastMonthPct.value != null ? `${s.vsLastMonthPct.value > 0 ? "+" : ""}${pct(s.vsLastMonthPct.value)}` : null}
            sub={s.vsLastMonthPct.available ? `${n(s.monthHours)} ساعة هذا الشهر` : "تحتاج شهراً سابقاً للمقارنة."} />
        </div>
      </div>
    </div>
  );
}
