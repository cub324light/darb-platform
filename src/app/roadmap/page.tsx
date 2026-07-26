"use client";
/* ═══════════════ مساري — «🧭 الآن» V2 (الأغنى، وما زال هادئاً) ═══════════════
   مدير حياة الطالب لا Dashboard: ترحيبٌ ورسالة دويرب ← شبكة أفعالٍ ٢×٢ (هدف اليوم ·
   ماذا ينقصك · التقويم · اختبارك) ← «هذا الأسبوع» شريطٌ خافت ← زرٌّ واحدٌ بطل ←
   مداخل الأقسام. كل رقمٍ من محرّكٍ نقيّ، وأي بياناتٍ ناقصة = حالةٌ صادقة لا صفر. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageFooter from "@/components/PageFooter";
import PageGuide from "@/components/PageGuide";
import ModuleWorkspace from "@/components/roadmap/ModuleWorkspace";
import { loadUser, saveUser, ensureWorkspace, saveWorkspace, loadStats, loadTrackExamDates, localDayKey } from "@/lib/storage";
import {
  moduleView, memberView, groupMembers, visibleModules,
  recordScore, setState as wsSetState, recordMemberScore, setMemberState,
  type Workspace, type ModuleId, type ExamMemberId, type ModuleInstance, type ModuleState,
} from "@/lib/modules";
import { pickDailyMessage } from "@/lib/roadmap/dailyMessage";
import { buildSessionPlan } from "@/lib/roadmap/session";
import { remainingSteps, arCount } from "@/lib/roadmap/remainingSteps";
import { computeStats } from "@/lib/roadmap/stats";
import { loadSessions } from "@/lib/roadmap/sessionStore";
import { loadCalendar } from "@/lib/roadmap/calendarStore";
import { groupUpcoming, kindMeta, warnsPlanChange, type CalendarEvent } from "@/lib/roadmap/calendar";
import { readPriorityExam, countRemaining, vaultCount, readTodayAvailability, readDailySignals } from "@/lib/roadmap/nowRead";
import { loadRoadmapConfig } from "@/lib/roadmap/store";
import { daysBetween } from "@/lib/roadmap/metrics";
import { n, pct, days as daysWord } from "@/lib/format";

/* ترتيب شاشة المذاكرة (تُفتح من بطاقة الاختبار) */
const STATE_ORDER: Record<ModuleState, number> = { active: 0, "needs-retake": 1, added: 2, paused: 3, completed: 4, "not-added": 5 };
const byPriority = (a: ModuleInstance, b: ModuleInstance): number =>
  (!!a.priority !== !!b.priority ? (a.priority ? -1 : 1) : (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9));

function studyPctOf(subjects: { name: string }[] | undefined): number {
  const c = countRemaining(subjects ?? []);
  return c.totalItems === 0 ? 0 : Math.round((c.doneItems / c.totalItems) * 100);
}

/* بطاقة فعلٍ في الشبكة — أيقونة ← تسمية ← قيمة ← سياق (٣ طبقات، لمسةٌ تفتح) */
function Tile({ icon, label, value, sub, onClick }: { icon: string; label: string; value: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-4 min-h-[108px] flex flex-col text-right transition active:scale-[0.98]"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      <span className="text-[20px]" aria-hidden="true">{icon}</span>
      <span className="t-caption font-bold mt-1.5" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="t-body font-black mt-0.5 leading-snug" style={{ color: "var(--text)" }}>{value}</span>
      {sub && <span className="t-caption mt-auto pt-1 leading-snug" style={{ color: "var(--text-dim)" }}>{sub}</span>}
    </button>
  );
}

export default function RoadmapPage() {
  const router = useRouter();
  const [ws, setWs] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser(); if (!u) return null;
    const ensured = ensureWorkspace(u);
    if (!u.workspace && ensured.workspace) saveUser(ensured);
    return ensured.workspace ?? null;
  });
  const [sel, setSel] = useState<{ kind: "module" | "member"; id: string } | null>(null);
  const [devMsg, setDevMsg] = useState(false);

  if (!ws) return <div className="min-h-dvh" />;

  const apply = (fn: (w: Workspace) => Workspace) =>
    setWs((cur) => { if (!cur) return cur; const next = fn(cur); saveWorkspace(next); return next; });

  /* ── شاشة مذاكرة الاختبار (تفاصيل + دروس) — تُفتح من بطاقة الاختبار ── */
  if (sel) {
    const view = sel.kind === "module" ? moduleView(sel.id as ModuleId) : memberView(sel.id as ExamMemberId);
    const inst = sel.kind === "module" ? ws.modules.find((m) => m.id === sel.id) : undefined;
    const member = sel.kind === "member"
      ? groupMembers(ws, "english").concat(groupMembers(ws, "programs")).find((x) => x.id === sel.id) : undefined;
    const state = (sel.kind === "module" ? inst?.state : member?.state) ?? "added";
    const sorted = [...visibleModules(ws)].sort(byPriority);
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="px-5 py-6 max-w-2xl mx-auto w-full">
          <ModuleWorkspace view={view} state={state}
            progressPct={studyPctOf(view.content.subjects)}
            completedCount={sorted.filter((m) => m.state === "completed").length} totalCount={sorted.length}
            onBack={() => setSel(null)}
            onRecordScore={(s) => apply((w) => (sel.kind === "module" ? recordScore(w, sel.id as ModuleId, s) : recordMemberScore(w, sel.id as ExamMemberId, s)))}
            onToggleRetake={() => apply((w) => (sel.kind === "module"
              ? wsSetState(w, sel.id as ModuleId, state === "needs-retake" ? "active" : "needs-retake")
              : setMemberState(w, sel.id as ExamMemberId, state === "needs-retake" ? "active" : "needs-retake")))} />
        </div>
      </div>
    );
  }

  /* ── لقطة «الآن» — كل الأرقام من مصادر حقيقية ── */
  const today = localDayKey();
  const priority = readPriorityExam(ws);
  const signals = readDailySignals(ws);
  const daily = pickDailyMessage(signals);

  const examDate = priority?.examKey ? (loadTrackExamDates()[priority.examKey] ?? null) : null;
  const daysLeft = examDate ? daysBetween(today, examDate) : null;

  const counts = priority ? countRemaining(priority.subjects) : { remainingLessons: 0, remainingDrills: 0, weakestSubject: null, totalItems: 0, doneItems: 0 };
  const avail = readTodayAvailability();
  const plan = priority ? buildSessionPlan({
    subjects: priority.subjects.map((s) => s.name), weakestSubject: counts.weakestSubject,
    remainingLessons: counts.remainingLessons, remainingDrills: counts.remainingDrills,
    activeErrors: vaultCount(), availableMinutes: avail.minutes, mode: loadRoadmapConfig().studyMode,
  }) : null;

  const steps = remainingSteps({ remainingLessons: counts.remainingLessons, remainingDrills: counts.remainingDrills, unreviewedErrors: vaultCount() });

  const upcoming = groupUpcoming(loadCalendar(), today);
  const nextEv: { ev: CalendarEvent; when: string } | null =
    upcoming.today[0] ? { ev: upcoming.today[0], when: "اليوم" }
    : upcoming.tomorrow[0] ? { ev: upcoming.tomorrow[0], when: "غداً" }
    : upcoming.week[0] ? { ev: upcoming.week[0], when: "هذا الأسبوع" } : null;

  const stats = computeStats({ dayMins: loadStats().dayMins ?? {}, sessions: loadSessions(), today, plannedDailyMins: ((loadUser()?.studyHours ?? 0) * 60) || null });
  const hasWeek = stats.week.hours > 0 || stats.week.sessions > 0;

  const goSession = () => router.push("/roadmap/session");
  const openExam = () => priority && setSel({ kind: priority.kind, id: priority.id });
  const dev = () => { setDevMsg(true); setTimeout(() => setDevMsg(false), 2400); };

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7 pb-6 flex flex-col gap-4">
        <PageGuide pageKey="roadmap" steps={[
          { title: "مساري = دربك خطوة بخطوة", desc: "بطاقات اليوم فوق، وزر «ابدأ المذاكرة» يفتح جلستك الجاهزة مباشرة." },
        ]} />

        {/* الترحيب + رسالة دويرب */}
        <h1 className="t-h2 font-black leading-tight" style={{ color: "var(--text)" }}>{daily.greeting}</h1>
        <div className="rounded-2xl px-4 py-3.5 -mt-1" style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
          <p className="t-caption font-black mb-1" style={{ color: "var(--accent-light)" }}>💬 دويرب</p>
          <p className="t-body font-bold leading-relaxed" style={{ color: "var(--text)" }}>{daily.message}</p>
        </div>

        {/* شبكة الأفعال ٢×٢ */}
        <div className="grid grid-cols-2 gap-2.5">
          <Tile icon="🎯" label="هدف اليوم"
            value={plan?.available ? `جلسة ${n(plan.totalMins)} دقيقة` : "يومك مشغول"}
            sub={plan?.available ? plan.tasks.map((t) => t.label).join("، ") : plan?.hint}
            onClick={goSession} />
          <Tile icon="🧩" label="ماذا ينقصك"
            value={steps.length > 0 ? arCount(steps.length, "خطوة واحدة", "خطوتان", "خطوات", "خطوة") : "لا شيء عالق"}
            sub={steps.length > 0 ? steps.join("، ") : "أضف دروسك وتدريبك لتتكوّن خطتك"}
            onClick={openExam} />
          <Tile icon="🗓️" label="التقويم"
            value={nextEv ? `${kindMeta(nextEv.ev.kind).icon} ${nextEv.ev.title}` : "لا أحداث قريبة"}
            sub={nextEv ? (warnsPlanChange(nextEv.ev) ? "سيتم تعديل خطتك تلقائياً" : nextEv.when) : "سجّل أحداث حياتك ليخطط دويرب حولها"}
            onClick={() => router.push("/roadmap/calendar")} />
          {priority ? (
            <Tile icon={priority.icon ?? "🧠"} label="اختبارك" value={priority.label}
              sub={daysLeft != null && daysLeft > 0 ? `باقي ${daysWord(daysLeft)} — جاهز تبدأ؟` : daysLeft === 0 ? "موعدك اليوم — بالتوفيق" : "جاهز تبدأ؟"}
              onClick={openExam} />
          ) : (
            <Tile icon="🧠" label="اختبارك" value="لا اختبار بعد" sub="أضف اختبارك الأول" onClick={dev} />
          )}
        </div>

        {/* هذا الأسبوع — شريطٌ خافتٌ واحد (أو دعوةٌ صادقة) */}
        <div>
          <p className="eyebrow mb-2 px-1">هذا الأسبوع</p>
          {hasWeek ? (
            <div className="rounded-2xl py-3.5 px-2 flex" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              {[
                { v: n(stats.week.hours), l: "ساعة" },
                { v: n(stats.week.sessions), l: "جلسات" },
                { v: `🔥 ${n(stats.week.streakDays)}`, l: "أيام متتالية" },
                ...(stats.week.commitmentPct != null ? [{ v: pct(stats.week.commitmentPct), l: "التزام" }] : []),
              ].map((s, i) => (
                <div key={s.l} className="flex-1 text-center" style={i > 0 ? { borderInlineStart: "1px solid var(--border)" } : undefined}>
                  <p className="t-title font-black font-mono-nums" style={{ color: "var(--text)" }}>{s.v}</p>
                  <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{s.l}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="t-body px-1" style={{ color: "var(--text-muted)" }}>ابدأ أول جلسة، وسنعرض تقدمك هنا.</p>
          )}
        </div>

        {/* ▶ البطل الوحيد */}
        <button onClick={goSession}
          className="w-full rounded-3xl glow-blue transition active:scale-[0.98] mt-1"
          style={{ background: "var(--accent)", color: "#fff", padding: "20px", boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 45%, transparent)" }}>
          <span className="block font-black" style={{ fontSize: "1.35rem" }}>▶ ابدأ المذاكرة</span>
        </button>

        {/* مداخل الأقسام */}
        <div className="grid grid-cols-4 gap-2 mt-1">
          {[
            { icon: "🗓️", label: "التقويم", go: () => router.push("/roadmap/calendar") },
            { icon: "📈", label: "الإحصائيات", go: () => router.push("/roadmap/stats") },
            { icon: "📚", label: "المصادر", go: () => router.push("/roadmap/resources") },
            { icon: "⚙️", label: "الإعدادات", go: dev },
          ].map((s) => (
            <button key={s.label} onClick={s.go}
              className="rounded-2xl py-3.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97]"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
              <span className="text-[20px]" aria-hidden="true">{s.icon}</span>
              <span className="t-caption font-bold" style={{ color: "var(--text)" }}>{s.label}</span>
            </button>
          ))}
        </div>

        <PageFooter />
      </div>

      {devMsg && (
        <div className="fixed left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 t-caption font-bold z-50 rise"
          style={{ bottom: "88px", background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
          هذه الصفحة ما زالت قيد التطوير.
        </div>
      )}
    </div>
  );
}
