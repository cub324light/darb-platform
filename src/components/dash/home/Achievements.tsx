"use client";
/* ─── «إيقاعك» — أسبوعُك وسلسلتُك في مكانٍ واحد ───
   كان الرقمُ نفسُه يُطبع مرّتين في صفحةٍ واحدة: 🔥 في «أسبوعك»، ثم «يوم متتالٍ»
   في «إنجازاتك» أسفلَ الصفحة. ومعه ثلاثةُ مجاميعَ عمرية (جلسات · ساعات · مهام)
   لا تتغيّر بجلسةٍ ولا تُملي فعلاً — ولها **صفحةٌ كاملة** في «إنجازاتك».

   فصارت بطاقةً واحدةً تجيب سؤالاً واحداً: **هل أنا مستمرّ؟** شريطُ الأسبوع
   يُريه أيّامه، والسلسلةُ رقمٌ واحد، وساعاتُ الأسبوع سطرٌ تحتهما. وما وراء ذلك
   رابطٌ إلى صفحته. */
import { useState } from "react";
import Link from "next/link";
import { loadStats, computeStreak, localDayKey } from "@/lib/storage";
import { n, dur, days } from "@/lib/format";

const DAY_INITIAL = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // الأحد → السبت

interface RhythmData {
  week: { key: string; label: string; done: boolean; isToday: boolean; isFuture: boolean }[];
  streak: number;
  weekMins: number;
  activeDays: number;
}

function build(): RhythmData | null {
  if (typeof window === "undefined") return null;
  const s = loadStats();
  const todayKey = localDayKey(new Date());
  const done = new Set(s.sessionDays ?? []);
  const dayMins = s.dayMins ?? {};

  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());

  let weekMins = 0;
  const week = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sunday); dt.setDate(sunday.getDate() + i);
    const key = localDayKey(dt);
    weekMins += dayMins[key] ?? 0;
    return { key, label: DAY_INITIAL[i], done: done.has(key), isToday: key === todayKey, isFuture: key > todayKey };
  });

  return { week, streak: computeStreak(s), weekMins, activeDays: week.filter((d) => d.done).length };
}

export default function Achievements() {
  const [d] = useState(build);
  if (!d) return null;

  return (
    <section className="ds-card ds-card-tight">
      <div className="flex items-center justify-between mb-3">
        <p className="t-title font-black" style={{ color: "var(--text)" }}>إيقاعك</p>
        {d.streak > 0 && (
          <span className="t-caption font-black px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)", color: "var(--gold)" }}>
            <span className="streak-fire">🔥</span> {n(d.streak)} يوم
          </span>
        )}
      </div>

      <div className="flex items-stretch justify-between gap-1">
        {d.week.map((day) => (
          <div key={day.key} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="t-caption font-bold" style={{ color: day.isToday ? "var(--accent-light)" : "var(--text-muted)" }}>{day.label}</span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-black transition"
              style={day.done
                ? { background: "var(--success)", color: "#04240f", border: "none" }
                : day.isToday
                  ? { background: "transparent", color: "var(--accent-light)", border: "2px solid var(--accent)" }
                  : { background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)", opacity: day.isFuture ? 0.5 : 1 }}>
              {day.done ? "✓" : day.isToday ? "•" : ""}
            </span>
          </div>
        ))}
      </div>

      {/* سطرٌ واحدٌ عن الأسبوع — لا أربعُ بطاقاتٍ بمجاميعَ عمرية. */}
      <div className="flex items-center justify-between gap-2 mt-3.5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>
          {/* العددُ داخل جملةٍ سرديّة يُكتب كلمةً («يومان» لا «2») — والقياسُ وحده
             يبقى رقماً (قاعدةُ الخطوط في AGENTS.md). وصِيَغُ `days` مرفوعة
             («يومان»)، فلا يُجرّ بحرفٍ قبلها («في يومان» لحنٌ) — تُعرض مفردةً
             في صفٍّ لا داخلَ جملةٍ تحكمها. */}
          {d.activeDays === 0
            ? "لم تبدأ هذا الأسبوع بعد"
            : <>هذا الأسبوع · {days(d.activeDays)} · <span className="font-black font-mono-nums" style={{ color: "var(--text)" }}>{dur(d.weekMins)}</span></>}
        </span>
        <Link href="/profile/achievements" className="t-caption font-bold no-underline flex-shrink-0 tap-44" style={{ color: "var(--accent-light)" }}>
          إنجازاتك ←
        </Link>
      </div>
    </section>
  );
}
