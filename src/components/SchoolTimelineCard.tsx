"use client";
/* ─── بطاقةُ التقويم في «المدرسة» ───
   الطالب يفتح المدرسة فيسأل: «كم باقي على الدراسة؟» و«وشو الجاي؟». كان الجواب
   موزّعاً بين التقويم في «خطتي» وبين رأسه. هنا جوابٌ واحدٌ كبير، و«المزيد»
   يفتح ما بقي من العام وما مضى منه.

   القرار في `schoolTimeline` (نقيٌّ ومُختبَر)، وهنا الـIO والعرض فقط (قاعدة P1). */
import { useState } from "react";
import { schoolTimeline, type TimelineEntry, type CalendarPeriod } from "@/lib/academicCalendar";
import { dateShort, days as daysWord } from "@/lib/format";

const localDayKey = (d = new Date()): string => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* لونٌ لكل نوعِ فترة — نفسُ المعاني في تقويم «مساري» فلا يتعلّم الطالبُ رمزين */
const TONE: Record<CalendarPeriod["kind"], { color: string; icon: string }> = {
  term:          { color: "var(--accent)",  icon: "📘" },
  school_finals: { color: "var(--gold)",    icon: "📝" },
  break:         { color: "var(--success)", icon: "🌿" },
  summer:        { color: "var(--success)", icon: "☀️" },
  qudurat:       { color: "var(--accent-light)", icon: "🧠" },
  tahsili:       { color: "var(--accent-light)", icon: "🧪" },
  step:          { color: "var(--accent-light)", icon: "🔤" },
};

function Row({ e, past = false }: { e: TimelineEntry; past?: boolean }) {
  const t = TONE[e.period.kind];
  return (
    <li className="flex items-center gap-2.5 py-2" style={{ opacity: past ? 0.6 : 1 }}>
      <span aria-hidden="true" className="text-[15px] flex-shrink-0">{t.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block t-small font-black truncate" style={{ color: "var(--text)" }}>
          {e.period.label}
        </span>
        <span className="block t-caption" style={{ color: "var(--text-muted)" }}>
          {dateShort(e.period.start)} – {dateShort(e.period.end)} · {daysWord(e.days)}
          {e.period.approximate ? " · تقديريّ" : ""}
        </span>
      </span>
      {!past && (
        <span className="t-caption font-black flex-shrink-0 font-mono-nums" style={{ color: t.color }}>
          بعد {daysWord(e.daysAway)}
        </span>
      )}
    </li>
  );
}

export default function SchoolTimelineCard() {
  const [open, setOpen] = useState(false);
  const t = schoolTimeline(localDayKey());
  if (!t) return null;

  /* ما نحن فيه اليوم — الفصلُ واختباراتُه قد يتداخلان، فنُبرز الأخصّ */
  const now = t.today.find((p) => p.kind !== "term") ?? t.today[0] ?? null;
  const tone = now ? TONE[now.kind] : TONE.term;

  return (
    <section className="ds-card" aria-labelledby="school-timeline">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 id="school-timeline" className="t-h3" style={{ color: "var(--text)" }}>🗓️ التقويم الدراسي</h2>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>{t.yearId}هـ · {t.yearLabel}</span>
      </div>

      {/* الجواب الواحد الكبير */}
      {now ? (
        <p className="t-title font-black" style={{ color: tone.color }}>
          {tone.icon} {now.label}
        </p>
      ) : (
        <p className="t-title font-black" style={{ color: "var(--text-muted)" }}>خارج العام الدراسي</p>
      )}

      {t.next && (
        <p className="t-body mt-1" style={{ color: "var(--text-dim)" }}>
          متبقّي <span className="font-black font-mono-nums" style={{ color: "var(--text)" }}>{daysWord(t.next.daysAway)}</span>
          {" "}على «{t.next.period.label}»
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 w-full rounded-2xl py-2 t-small font-black transition active:scale-[0.99]"
        style={{ background: "var(--surface2)", color: "var(--text)" }}
      >
        {open ? "إخفاء" : "المزيد"} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3">
          {t.upcoming.length > 0 && (
            <>
              <p className="eyebrow mb-1">المواعيد القادمة</p>
              <ul className="list-none p-0 m-0 divide-y" style={{ borderColor: "var(--border)" }}>
                {t.upcoming.map((e) => <Row key={`${e.period.kind}-${e.period.start}`} e={e} />)}
              </ul>
            </>
          )}
          {t.past.length > 0 && (
            <>
              <p className="eyebrow mt-4 mb-1">مواعيد مضت</p>
              <ul className="list-none p-0 m-0 divide-y" style={{ borderColor: "var(--border)" }}>
                {t.past.map((e) => <Row key={`${e.period.kind}-${e.period.start}`} e={e} past />)}
              </ul>
            </>
          )}
          <p className="t-caption mt-3" style={{ color: "var(--text-muted)" }}>المصدر: {t.source}</p>
        </div>
      )}
    </section>
  );
}
