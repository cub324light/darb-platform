"use client";
/* ─── «اليوم» — البطاقةُ التي تجيب سؤالَ الصفحة ───
   كانت ثلاثَ بطاقاتٍ: بطلٌ يسأل «ماذا سأفعل اليوم؟» ويجيب بزرٍّ عامّ، ثم شريطُ
   الأسبوع، ثم «خطة اليوم». وكان عددُ المهامّ يُطبع في البطل **وقائمتُها تحته
   مباشرة** — رقمٌ يعدّ ما تراه عينُك.

   صارت واحدة: الجوابُ يسمّي المادّة ويقول لماذا هي (`nextAction`)، والزرُّ يبدأ
   الجلسةَ **بتلك المادّة** لا بأيٍّ كان، والمهامُّ تحته بلا عدّادٍ يكرّرها.
   وشريطُ الأسبوع انتقل إلى «إيقاعك» حيث السلسلةُ — فلا يُطبع الرقمُ مرّتين. */
import { useState } from "react";
import Link from "next/link";
import { loadUser, loadStats, localDayKey, activeTrackIds } from "@/lib/storage";
import { loadHomework, bucketOf } from "@/lib/homework";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";
import { countRemaining } from "@/lib/roadmap/nowRead";
import { nextAction, type NextAction } from "@/lib/home/nextAction";
import { dur, tasks as tasksWord } from "@/lib/format";

interface TodayData {
  action: NextAction;
  list: { id: string; title: string; subject?: string; priority: string; late: boolean }[];
  doneMins: number;
  goalMins: number;
}

function build(): TodayData | null {
  if (typeof window === "undefined") return null;
  const u = loadUser();
  const s = loadStats();
  const todayKey = localDayKey(new Date());

  const list = loadHomework()
    .filter((h) => !h.done)
    .filter((h) => bucketOf(h, todayKey) === "today" || bucketOf(h, todayKey) === "overdue")
    .slice(0, 4)
    .map((h) => ({
      id: h.id, title: h.title, subject: h.subject, priority: h.priority,
      late: bucketOf(h, todayKey) === "overdue",
    }));

  const subjects = subjectsForTracks(activeTrackIds() as TrackId[]);
  const { weakestSubject } = countRemaining(subjects);

  const doneMins = s.todayFocusMins ?? 0;
  const goalMins = (u?.studyHours ?? 0) * 60;

  return {
    action: nextAction({
      tasks: list.map((t) => ({ title: t.title, subject: t.subject, priority: t.priority })),
      subjects, weakestSubject, doneMins, goalMins,
    }),
    list, doneMins, goalMins,
  };
}

const PRIO_COLOR: Record<string, string> = { high: "var(--danger)", medium: "var(--gold)", low: "var(--success)" };

export default function TodayBlock() {
  const [d] = useState(build);
  if (!d) return null;

  const { action, list, doneMins, goalMins } = d;
  const pct = goalMins > 0 ? Math.min(100, Math.round((doneMins / goalMins) * 100)) : 0;

  return (
    <section className="rounded-3xl p-5 rise flex flex-col gap-4"
      style={{
        background: "linear-gradient(150deg, color-mix(in srgb, var(--accent) 16%, var(--surface)) 0%, var(--surface) 70%)",
        border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
      }}>
      <div>
        <p className="eyebrow mb-1">يومك</p>
        <h2 className="t-h2 font-black" style={{ color: "var(--text)" }}>{action.title}</h2>
        <p className="t-body mt-1 leading-relaxed" style={{ color: "var(--text-dim)" }}>{action.why}</p>
      </div>

      <Link href={action.href} className="btn-primary glow-blue no-underline flex items-center justify-center gap-2">
        <span className="text-[18px]">▶️</span> {action.cta}
      </Link>

      {/* ▓ الهدفُ سطرٌ وشريط، لا بطاقةٌ مستقلّة: «كم بقي» سؤالُ متابعةٍ لا عنوان.
         ومن لم يحدّد هدفاً لا نخترع له رقماً — نعرض ما ذاكره وكفى. */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>
            {goalMins > 0 ? "هدف اليوم" : "ذاكرتَ اليوم"}
          </span>
          <span className="t-caption font-black font-mono-nums" style={{ color: pct >= 100 ? "var(--success)" : "var(--text)" }}>
            {goalMins > 0 ? `${dur(doneMins)} من ${dur(goalMins)}` : dur(doneMins)}
          </span>
        </div>
        {goalMins > 0 && (
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 100 ? "var(--success)" : "var(--accent)" }} />
          </div>
        )}
      </div>

      {/* ▓ المهامُّ داخل البطاقة نفسِها: كانت بطاقةً ثانيةً تحتها وفيها العنوانُ
         نفسُه تقريباً، فصار الطالبُ يقرأ «اليوم» مرّتين. */}
      {list.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{tasksWord(list.length)}</span>
            <Link href="/plan" className="t-caption font-bold no-underline tap-44" style={{ color: "var(--accent-light)" }}>الخطة الكاملة ←</Link>
          </div>
          {list.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "color-mix(in srgb, var(--surface2) 70%, transparent)", border: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIO_COLOR[t.priority] ?? "var(--text-muted)" }} />
              <span className="t-body font-bold flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{t.title}</span>
              {t.late && (
                <span className="t-caption font-black flex-shrink-0 px-1.5 py-0.5 rounded-md"
                  style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>متأخّرة</span>
              )}
              {t.subject && <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{t.subject}</span>}
            </div>
          ))}
        </div>
      ) : (
        <Link href="/plan" className="t-caption no-underline tap-44" style={{ color: "var(--accent-light)" }}>
          لا مهامَّ مسجّلةً لهذا اليوم · افتح خطّتك ←
        </Link>
      )}
    </section>
  );
}
