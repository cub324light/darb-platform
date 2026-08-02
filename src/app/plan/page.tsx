"use client";
/* ═══════════ 🗓️ خطتي — الصفحة تفتح على الخطة ═══════════
   كانت هذه الصفحة 5220px، جدولُها 253px منها (4٫8٪) يبدأ بعد أربع شاشاتٍ من النماذج
   والتقارير. الطالب يفتح «خطتي» ليعرف «ماذا الآن؟» فلا يجد جواباً إلا بعد تمريرٍ طويل.
   فأُعيد ترتيبها حول سؤالٍ واحد، بأربعة أقسامٍ معنونة تنازلياً بالإلحاح:

     أوّلاً · الآن       — جوابٌ واحدٌ كبير: جلستُك الجارية أو القادمة أو حالةٌ فارغةٌ صادقة.
     ثانياً · جدولي      — اليوم/الأسبوع/الشهر، وبناءُ الجدول يدويّاً أو مع دويرب.
     ثالثاً · إلى أين؟   — حكمُ واقعية الهدف ظاهر، وتحريرُ الأهداف مطويٌّ تحته.
     رابعاً · ما يحيط بخطتك — التسجيل والتقويم والاستراتيجية: سياقٌ يشكّل الخطة لا يسبقها.

   ولا ميزة حُذفت — كلّها هنا، والترتيب وحده تغيّر. */
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import CalendarExport from "@/components/CalendarExport";
/* استيراد مباشر لتفادي انزياح التخطيط — يظهر فوراً بحالته المحسوبة تزامنياً */
import ExamRegistrationAlert from "@/components/ExamRegistrationAlert";
import GoalsPanel from "@/components/GoalsPanel";
import UniversityFuture from "@/components/UniversityFuture";
import type { Slot } from "@/lib/dayLadder";
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });
const DayLadder = dynamic(() => import("@/components/DayLadder"), { ssr: false });
const DayScheduler = dynamic(() => import("@/components/DayScheduler"), { ssr: false });
const StrategyBanner = dynamic(() => import("@/components/StrategyBanner"), { ssr: false });
const CalendarStatusCard = dynamic(() => import("@/components/CalendarStatusCard"), { ssr: false });
const GoalRealityCard = dynamic(() => import("@/components/GoalRealityCard"), { ssr: false });
import { getEventsForDate, studyMinutesOn, currentEvent, nextEvent } from "@/lib/schedule";
import {
  loadUser, activeTrackIds, loadEvents, saveEvents, loadExamDate, saveExamDate, loadTrackExamDates,
  loadGoals, loadStats, showsUniversityUI, ensureWorkspace, localDayKey, EVENTS_CHANGED,
  type ScheduleEvent,
} from "@/lib/storage";
import { loadCalendar } from "@/lib/roadmap/calendarStore";
import { eventsOnDay, kindMeta } from "@/lib/roadmap/calendar";
import { readPriorityExam } from "@/lib/roadmap/nowRead";
import { focusHandoffQuery } from "@/lib/roadmap/handoff";
import { isUniversityGraduate } from "@/lib/phase";
import { getTrack, colorForSubject, type TrackId } from "@/lib/tracks";
import { days as arDays, dur, time } from "@/lib/format";

function daysUntil(dateStr: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
  );
}

/* الساعة الكسريّة من ISO محلّيّ (أحداث التقويم تُخزَّن بلا منطقةٍ زمنية) */
const hourOf = (iso: string): number => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours() + d.getMinutes() / 60;
};

type PlanView = "day" | "week" | "month";

/* عنوانُ قسمٍ في الصفحة — العمود الفقري الذي كان ينقص الصفحة القديمة */
function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="t-h3 font-black truncate" style={{ color: "var(--text)" }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function PlanPage() {
  /* مُهيّئٌ كسول (لا قراءةٌ في effect — يتجنّب وميض الحالة الفارغة)، ومستمعٌ يُحدّثه
     بعد أن يبني دويرب أو المحرّر اليدويّ جدولاً. كان بلا setter، فيبني الطالب خطته
     ثم تبقى الصفحة تقول «لا يوجد جدول لليوم» حتى يُعيد التحميل. */
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>(() =>
    typeof window !== "undefined" ? loadEvents() : []
  );
  useEffect(() => {
    const sync = () => setAllEvents(loadEvents());
    window.addEventListener(EVENTS_CHANGED, sync);
    return () => window.removeEventListener(EVENTS_CHANGED, sync);
  }, []);

  /* المصدر الواحد: الاختبارات مشتقّة من Workspace (لا activeTracks) */
  const [activeIds] = useState<TrackId[]>(() => activeTrackIds() as TrackId[]);

  const [view, setView] = useState<PlanView>("day");
  const [sheet, setSheet] = useState<null | "manual">(null);
  const [examDate, setExamDate] = useState<string | null>(() =>
    typeof window !== "undefined" ? loadExamDate() : null
  );

  /* الوقت الحالي — يُحدّث كل دقيقة لإبراز الجلسة الجارية */
  const [now, setNow] = useState<Date | null>(() => typeof window !== "undefined" ? new Date() : null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const nowHour = now ? now.getHours() + now.getMinutes() / 60 : -1;

  /* هل الطالب على أعتاب القبول (ثالث ثانوي/خريج)؟ — يقرّر ظهور «هدفي الجامعي» */
  const [showUni] = useState(() =>
    typeof window !== "undefined" ? showsUniversityUI(loadUser()) : false
  );
  /* خريج الجامعة: لا أهداف/درجات اختبارات — «خطتي» له تخطيطٌ شخصي فقط */
  const [gradUni] = useState(() =>
    typeof window !== "undefined" ? isUniversityGraduate(loadUser()) : false
  );
  /* المطويّة تُفتح تلقائياً لمن لم يضع هدفاً بعد — وإلا بقي القُمع مغلقاً للأبد.
     ولا نركّب محتواها قبل فتحها: `GoalsPanel` و`UniversityFuture` يشغّلان محرّكات
     (الاستراتيجية · الجاهزية · تحليل الفجوة) ويضيفان ~200 عنصراً إلى الصفحة، وأكثر
     الزائرين لا يفتحونها. حالتهما في التخزين لا في الشجرة، فالتركيب المتأخّر لا يفقد شيئاً. */
  const [goalsOpen] = useState(() =>
    typeof window !== "undefined" ? Object.keys(loadGoals()).length === 0 : false
  );
  const [goalsMounted, setGoalsMounted] = useState(goalsOpen);

  /* مواد اختبار الأولوية — يبني دويرب والمحرّر اليدويّ حولها لا حول موادَّ مخترعة */
  const [subjects] = useState<{ name: string; color: string }[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser(); if (!u) return [];
    const ws = ensureWorkspace(u).workspace; if (!ws) return [];
    const ids = activeTrackIds() as TrackId[];
    return (readPriorityExam(ws)?.subjects ?? []).map((s) => ({ name: s.name, color: colorForSubject(ids, s.name) }));
  });

  /* أقرب اختبار من المسارات النشطة */
  const [nearestExam] = useState(() => {
    if (typeof window === "undefined") return null;
    const trackDates = loadTrackExamDates();
    const ed = loadExamDate();
    const ids = activeTrackIds() as TrackId[];
    const candidates: { days: number; label: string; color: string }[] = [];
    for (const id of ids) {
      const d = trackDates[id];
      if (!d) continue;
      const days = daysUntil(d);
      if (days >= 0) {
        const track = getTrack(id);
        candidates.push({ days, label: track?.title ?? id, color: track?.color ?? "var(--accent)" });
      }
    }
    if (ed) {
      const days = daysUntil(ed);
      if (days >= 0) candidates.push({ days, label: "الاختبار", color: "var(--accent)" });
    }
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => a.days - b.days)[0];
  });

  const urgentColor = nearestExam
    ? nearestExam.days <= 1 ? "#EF4444"
      : nearestExam.days <= 7 ? "#F97316"
      : nearestExam.color
    : "var(--accent)";

  const today = typeof window !== "undefined" ? localDayKey() : "";
  const colorFor = (subj?: string) => subj ? colorForSubject(activeIds, subj) : "var(--accent-light)";

  /* أحداث اليوم: مذاكرةٌ ومشغول من خطة المذاكرة */
  const todayEvents = today ? getEventsForDate(today, allEvents) : [];
  const todayStudy = todayEvents.filter((e) => e.type === "study");
  const currentEv = currentEvent(todayStudy, nowHour);
  const nextEv = nextEvent(todayStudy, nowHour);

  /* ومواعيد الحياة من التقويم (سفر/مناسبة/صلاة) — مخزنٌ آخر، فنقرؤه هنا للعرض فقط.
     بدونها تعِد «خطتي» الطالب بساعةٍ هو مشغولٌ فيها أصلاً. */
  const [lifeToday] = useState(() =>
    typeof window === "undefined" ? [] : eventsOnDay(loadCalendar(), localDayKey())
  );

  const daySlots: Slot[] = [
    ...todayEvents.map((ev) => ({
      id: ev.id,
      title: ev.type === "study" ? (ev.subject ?? "مذاكرة") : (ev.label ?? "مشغول"),
      fromHour: ev.fromHour,
      toHour: ev.toHour,
      color: ev.type === "study" ? colorFor(ev.subject) : "var(--text-dim)",
      icon: ev.type === "study" ? undefined : "🚫",
    })),
    ...lifeToday.filter((ev) => !ev.allDay).map((ev) => ({
      id: `cal-${ev.id}`,
      title: ev.title,
      fromHour: hourOf(ev.start),
      toHour: hourOf(ev.end),
      color: kindMeta(ev.kind).color,
      icon: kindMeta(ev.kind).icon,
    })),
  ];

  const dayAllDay = lifeToday.filter((ev) => ev.allDay).map((ev) => ({
    id: `cal-${ev.id}`, title: ev.title, color: kindMeta(ev.kind).color, icon: kindMeta(ev.kind).icon,
  }));

  /* دقائق التركيز المنجزة اليوم — لبطاقة «خلّصت جلسات اليوم» (لا رقمَ مخترع) */
  const [doneMins] = useState(() =>
    typeof window === "undefined" ? 0 : loadStats().dayMins[localDayKey()] ?? 0
  );

  /* أيام الأسبوع القادمة مع حِمل كل يوم */
  const weekDays = (() => {
    const LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const evs = getEventsForDate(dateStr, allEvents).filter((e) => e.type === "study");
      out.push({ label: i === 0 ? "اليوم" : LABELS[d.getDay()], evs, dateStr, mins: studyMinutesOn(dateStr, allEvents) });
    }
    return out;
  })();

  const peakMins = Math.max(60, ...weekDays.map((d) => d.mins));
  const hasSchedule = allEvents.some((e) => e.type === "study");

  const openDuwairb = () =>
    window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }));

  /* ── §1 الآن — الجواب الواحد ── */
  const renderNow = () => {
    if (todayStudy.length === 0) {
      return (
        <div className="ds-card ds-card-lg text-center" style={{ borderStyle: "dashed" }}>
          <p className="t-title font-black mb-1" style={{ color: "var(--text)" }}>ما عندك جدولٌ اليوم</p>
          <p className="t-small mb-4" style={{ color: "var(--text-muted)" }}>
            رتّب يومك بنفسك، أو أخبِر دويرب بمشاغيلك ويرتّبه لك.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setSheet("manual")}
              className="flex-1 rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
              style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
              ＋ يدويّاً
            </button>
            <button onClick={openDuwairb}
              className="flex-1 rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              🤖 مع دويرب
            </button>
          </div>
        </div>
      );
    }

    if (currentEv) {
      const remaining = Math.round((currentEv.toHour - nowHour) * 60);
      const elapsed = Math.max(0, Math.round((nowHour - currentEv.fromHour) * 60));
      const total = Math.max(1, Math.round((currentEv.toHour - currentEv.fromHour) * 60));
      const c = colorFor(currentEv.subject);
      return (
        <div className="ds-card ds-card-lg" style={{ borderColor: `color-mix(in srgb, ${c} 45%, var(--border))` }}>
          <p className="eyebrow" style={{ color: c }}>تجري الآن · حتى {time(currentEv.toHour)}</p>
          <p className="t-h3 font-black mt-0.5" style={{ color: "var(--text)" }}>{currentEv.subject ?? "مذاكرة"}</p>
          <p className="t-small mt-1" style={{ color: "var(--text-muted)" }}>باقي {dur(remaining)} من الجلسة</p>
          <div className="h-1.5 rounded-full overflow-hidden my-3" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%`, background: c }} />
          </div>
          {/* ▓ يحمل الجلسةَ معه: المادة وما تبقّى من وقتها. كان الرابط عارياً
              (`/orbit` بلا وسطاء) فيفتح المؤقّت على مادةٍ افتراضية، والطالبُ
              يعيد اختيار ما جدوَلَه بنفسه — فبدت «خطتي» غيرَ موصولةٍ بشيء. */}
          <Link href={`/orbit?${focusHandoffQuery({ from: "plan", subject: currentEv.subject,
            taskMins: remaining, taskLabel: currentEv.subject ?? "مذاكرة" })}`}
            className="block w-full rounded-2xl py-3 t-body font-black text-center"
            style={{ background: c, color: "#fff", textDecoration: "none" }}>
            ادخل التركيز ←
          </Link>
        </div>
      );
    }

    if (nextEv) {
      const untilMins = Math.round((nextEv.fromHour - nowHour) * 60);
      const c = colorFor(nextEv.subject);
      return (
        <div className="ds-card ds-card-lg">
          <p className="eyebrow">القادمة · {time(nextEv.fromHour)}</p>
          <p className="t-h3 font-black mt-0.5" style={{ color: "var(--text)" }}>{nextEv.subject ?? "مذاكرة"}</p>
          <p className="t-small mt-1 mb-3" style={{ color: "var(--text-muted)" }}>
            {untilMins > 0 ? `بعد ${dur(untilMins)}` : "حان وقتها"} · {dur(Math.round((nextEv.toHour - nextEv.fromHour) * 60))}
          </p>
          <Link href={`/orbit?${focusHandoffQuery({ from: "plan", subject: nextEv.subject,
            taskMins: Math.round((nextEv.toHour - nextEv.fromHour) * 60),
            taskLabel: nextEv.subject ?? "مذاكرة" })}`}
            className="block w-full rounded-2xl py-3 t-body font-black text-center"
            style={{ background: c, color: "#fff", textDecoration: "none" }}>
            ابدأ الآن ←
          </Link>
        </div>
      );
    }

    return (
      <div className="ds-card ds-card-lg text-center">
        <p className="t-h3 font-black" style={{ color: "var(--success)" }}>خلّصت جلسات اليوم 🎉</p>
        <p className="t-small mt-1" style={{ color: "var(--text-muted)" }}>
          {doneMins > 0 ? `ذاكرت اليوم ${dur(doneMins)}.` : "ما بقي شيءٌ مجدول لليوم."}
        </p>
      </div>
    );
  };

  return (
    <div className="page desk-wide">
      <PageGuide pageKey="plan" steps={[
        { title: "خطتي", desc: "شاشة التخطيط الموحّدة — تفتح على «الآن»: ماذا تذاكر هذه اللحظة." },
        { title: "جدولي", desc: "اليوم على سلّم ساعاتٍ بخطّ «الآن»، والأسبوع بحِمل كل يوم، والشهر تقويماً كاملاً." },
        { title: "ابنِ جدولك", desc: "«＋ يدويّاً» تضيف جلسةً بنفسك، و«مع دويرب» يبني لك خطةً حول مشاغيلك." },
      ]} />

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">خطتي</h1>
          {nearestExam !== null && (
            <div className="dome-chip flex items-center gap-1.5">
              <span className="t-small font-black font-mono-nums" style={{ color: urgentColor }}>{arDays(nearestExam.days)}</span>
              <span className="t-small font-semibold" style={{ color: "var(--text-dim)" }}>
                على {nearestExam.label}
              </span>
            </div>
          )}
        </div>
      </Dome>
      <div className="h-5" />

      {/* ═════ §1 الآن ═════ */}
      <section className="px-5 mb-6 rise rise-1">
        <SectionHead eyebrow="أوّلاً · الآن" title="ماذا تذاكر هذه اللحظة؟" />
        {renderNow()}
      </section>

      {/* ═════ §2 جدولي ═════ */}
      <section className="px-5 mb-6 rise rise-2">
        <SectionHead eyebrow="ثانياً · جدولي" title="اليوم والأسبوع والشهر" />

        <div className="flex gap-2 p-1 rounded-2xl mb-3" style={{ background: "var(--surface)" }}>
          {([["day", "اليوم"], ["week", "الأسبوع"], ["month", "الشهر"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-2.5 rounded-xl t-body font-bold text-center transition"
              style={view === v
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {view === "day" && (
          daySlots.length === 0 && dayAllDay.length === 0 ? (
            <p className="ds-card t-small text-center" style={{ color: "var(--text-muted)" }}>
              يومك فارغ — لا جلسات ولا مواعيد.
            </p>
          ) : (
            <DayLadder slots={daySlots} allDay={dayAllDay} />
          )
        )}

        {view === "week" && (
          <div className="flex flex-col gap-2">
            {weekDays.map(({ label, evs, dateStr, mins }, i) => (
              <div key={dateStr} className="rounded-2xl px-3 py-3"
                style={{ background: "var(--surface)", border: `1px solid ${i === 0 ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border)"}` }}>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="t-small font-black w-16 flex-shrink-0" style={{ color: i === 0 ? "var(--accent-light)" : "var(--text)" }}>{label}</span>
                  <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                    <span className="block h-full rounded-full" style={{ width: `${(mins / peakMins) * 100}%`, background: i === 0 ? "var(--accent)" : "var(--accent-light)" }} />
                  </span>
                  <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {mins > 0 ? dur(mins) : "—"}
                  </span>
                </div>
                {evs.length === 0 ? (
                  <p className="t-caption" style={{ color: "var(--text-dim)" }}>لا جلسات</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {evs.map((ev) => (
                      <span key={ev.id} className="t-caption font-bold px-2 py-1 rounded-lg"
                        style={{ background: `color-mix(in srgb, ${colorFor(ev.subject)} 16%, transparent)`, color: colorFor(ev.subject), border: `1px solid ${colorFor(ev.subject)}44` }}>
                        {ev.subject ?? "مذاكرة"} · {time(ev.fromHour)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "month" && (
          <Calendar
            examDate={examDate}
            onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
            getDayInfo={(date) =>
              getEventsForDate(date, allEvents).map((ev) => ({
                id: ev.id,
                label: ev.type === "study" ? (ev.subject ?? "مذاكرة") : (ev.label ?? "مشغول"),
                color: ev.type === "study" ? colorFor(ev.subject) : "var(--danger)",
                from: ev.fromHour,
                to: ev.toHour,
              }))
            }
          />
        )}

        {/* بناء الجدول — الطريقان جنباً إلى جنب دائماً */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => setSheet("manual")}
            className="flex-1 rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
            ＋ يدويّاً
          </button>
          <button onClick={openDuwairb}
            className="flex-1 rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", color: "#fff" }}>
            🤖 مع دويرب
          </button>
        </div>

        <details className="mt-3">
          <summary className="t-small font-bold cursor-pointer py-2" style={{ color: "var(--text-muted)" }}>
            تصدير الجدول إلى تقويمك
          </summary>
          <div className="pt-2">
            <CalendarExport events={allEvents} />
            {!hasSchedule && (
              <p className="t-caption text-center mt-2" style={{ color: "var(--text-muted)" }}>
                ابنِ خطة أولاً ثم صدّرها لتقويمك المفضّل
              </p>
            )}
          </div>
        </details>
      </section>

      {/* ═════ §3 إلى أين؟ — لا تخصّ خريج الجامعة (خارج عالم الاختبارات) ═════ */}
      {!gradUni && (
        <section className="px-5 mb-6 rise rise-3">
          <SectionHead eyebrow="ثالثاً · إلى أين؟" title="هدفك وواقعيّته" />
          <div className="flex flex-col gap-4">
            <GoalRealityCard />
            <details open={goalsOpen} className="ds-card"
              onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setGoalsMounted(true); }}>
              <summary className="t-body font-black cursor-pointer" style={{ color: "var(--text)" }}>
                🎯 أهدافي ودرجاتي
              </summary>
              <div className="pt-4 flex flex-col gap-4">
                {goalsMounted && (
                  <>
                    <GoalsPanel />
                    {/* هدفي الجامعي — لمن هم على أعتاب القبول (ثالث ثانوي/خريج ثانوي) */}
                    {showUni && <UniversityFuture />}
                  </>
                )}
              </div>
            </details>
          </div>
        </section>
      )}

      {/* ═════ §4 ما يحيط بخطتك ═════ */}
      {!gradUni && (
        <section className="px-5 mb-6 rise rise-4">
          <SectionHead eyebrow="رابعاً · ما يحيط بخطتك" title="التسجيل والتقويم والاستراتيجية" />
          <div className="flex flex-col gap-4">
            <ExamRegistrationAlert />
            <CalendarStatusCard />
            <StrategyBanner />
          </div>
        </section>
      )}

      {/* ── روابط سريعة ── */}
      <div className="px-5 mb-5 rise rise-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/study-plan", icon: "📊", label: "مخطط الدراسة" },
            { href: "/roadmap",    icon: "🗺️", label: "مساري" },
            { href: "/orbit",      icon: "⏱️", label: "أوربت" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="ds-card ds-card-tight ds-card-interactive flex flex-col items-center gap-1 text-center"
              style={{ textDecoration: "none" }}>
              <span className="text-[18px]" aria-hidden="true">{item.icon}</span>
              <span className="t-caption font-black" style={{ color: "var(--text)" }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-6" />
      {/* الخيطُ يقول «ابدأ أول جلسة» — فليحملها معه بدل أن يفتح مؤقّتاً فارغاً */}
      <NextThread page="/plan" orbitHandoff={
        (() => {
          const ev = currentEv ?? nextEv;
          if (!ev) return undefined;
          const mins = currentEv
            ? Math.round((currentEv.toHour - nowHour) * 60)
            : Math.round((ev.toHour - ev.fromHour) * 60);
          return focusHandoffQuery({ from: "plan", subject: ev.subject, taskMins: mins,
            taskLabel: ev.subject ?? "مذاكرة" });
        })()
      } />
      <PageFooter />

      {/* محرّر الجدول اليدويّ — إضافةُ جلسةٍ/مشغولٍ وحذفُها وتكرارها.
          «مع دويرب» يبقى على مساره القائم (DuirbFloat) فلا يجتمع محلّلا ذكاءٍ في صفحة. */}
      {sheet === "manual" && (
        <DayScheduler
          date={today}
          events={allEvents}
          subjects={subjects}
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onEventsChange={(next) => { saveEvents(next); setAllEvents(next); }}
          onClose={() => setSheet(null)}
          initialTab="manual"
          manualOnly
        />
      )}
    </div>
  );
}
