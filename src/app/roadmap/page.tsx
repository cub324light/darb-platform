"use client";
/* ═══════════════ مساري — «🧭 الآن» V3 (لوحة القيادة الشخصية) ═══════════════
   أقوى صفحةٍ في درب، وبنفس لغة تصميم التطبيق (ds-card · Dome · elev · rise).
   الترتيب: رأسٌ فيه العنوان وأفعاله (تقويم/إعدادات) ← ترحيبٌ ورسالة دويرب ←
   «هذا الأسبوع» (أرقامٌ حقيقية بتصميمٍ فاخر) ← شبكة 2×2 غنيّة بالمعلومة ←
   زرٌّ واحدٌ بطل. كل شيءٍ يخدم سؤالاً واحداً: «ماذا أفعل الآن؟». */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Dome from "@/components/Dome";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import PageGuide from "@/components/PageGuide";
import ModuleWorkspace from "@/components/roadmap/ModuleWorkspace";
import RoadmapSettings from "@/components/roadmap/RoadmapSettings";
import ExamPlanTimeline from "@/components/roadmap/ExamPlanTimeline";
import Customizable from "@/components/Customizable";
import DismissibleNote from "@/components/DismissibleNote";
import { duwairbMoment } from "@/lib/duwairb/moments";
import { loadUser, saveWorkspace, loadStats, loadTrackExamDates, localDayKey } from "@/lib/storage";
import { ensureWorkspaceSaved } from "@/lib/userCommands";
import {
  moduleView, memberView, groupMembers, visibleModules,
  recordScore, setState as wsSetState, recordMemberScore, setMemberState,
  type Workspace, type ModuleId, type ExamMemberId, type ModuleInstance, type ModuleState,
} from "@/lib/modules";
import { pickDailyMessage } from "@/lib/roadmap/dailyMessage";
import { buildSessionPlan } from "@/lib/roadmap/session";
import { computeStats } from "@/lib/roadmap/stats";
import { loadSessions } from "@/lib/roadmap/sessionStore";
import { focusHandoffQuery } from "@/lib/roadmap/handoff";
import { OFFICIAL_LINKS } from "@/lib/officialLinks";
import { recentResourceIds } from "@/lib/roadmap/resourceUse";
import { loadCalendar } from "@/lib/roadmap/calendarStore";
import { groupUpcoming, kindMeta } from "@/lib/roadmap/calendar";
import {
  readPriorityExam, readEligibilityCtx, readPlanSubjects, readStagedPlan, readPace, readAllExams, countRemaining, vaultCount, readTodayAvailability, readDailySignals,
  solvedQuestions, tasksDoneToday,
} from "@/lib/roadmap/nowRead";
import { loadRoadmapConfig } from "@/lib/roadmap/store";
import { daysBetween } from "@/lib/roadmap/metrics";
import { n, pct, days as daysWord, tasks as tasksWord } from "@/lib/format";

const STATE_ORDER: Record<ModuleState, number> = { active: 0, "needs-retake": 1, added: 2, paused: 3, completed: 4, "not-added": 5 };
const byPriority = (a: ModuleInstance, b: ModuleInstance): number =>
  (!!a.priority !== !!b.priority ? (a.priority ? -1 : 1) : (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9));

function studyPctOf(subjects: { name: string }[] | undefined): number {
  const c = countRemaining(subjects ?? []);
  return c.totalItems === 0 ? 0 : Math.round((c.doneItems / c.totalItems) * 100);
}

/* بطاقةُ شبكةٍ غنيّة — تسلسلٌ واحدٌ لا يتغيّر: رقاقة أيقونة ← تسمية ← قيمةٌ بارزة ← وصفٌ صغير.
   ▸ الوزن البصريّ يأتي من الرقاقة والتنفّس والتباين، لا من نقطة خطٍّ زائدة: القيمة `t-h3`
     (1.22rem) تبقى دون زرّ «ابدأ المذاكرة» (1.45rem) فلا تنقلب هرمية الصفحة.
   ▸ `line-clamp-2` + `min-w-0` لأن عناوين أحداث التقويم نصٌّ حرٌّ من الطالب: بلا الحدّين
     تمدّ الكلمةُ الطويلة عمود الشبكة وتكسر الصفّ. */
function Tile({ icon, label, value, lines, tint, onClick }: {
  icon: string; label: string; value: string; lines: string[]; tint: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="ds-card ds-card-interactive ds-tile text-right min-w-0"
      style={{ ["--tint" as string]: tint, minHeight: "132px", gap: "var(--sp-1)" }}>
      <span className="flex items-center gap-2 mb-0.5">
        <span className="w-8 h-8 rounded-xl grid place-items-center text-[18px] flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--tint) 12%, var(--surface2))" }} aria-hidden="true">{icon}</span>
        <span className="eyebrow min-w-0 truncate" style={{ color: "var(--text)" }}>{label}</span>
      </span>
      <span className="t-h3 font-black leading-snug line-clamp-2" style={{ color: "var(--text)" }}>{value}</span>
      <span className="flex flex-col gap-0.5 mt-auto">
        {lines.filter(Boolean).slice(0, 2).map((l, i) => (
          <span key={i} className="t-caption leading-snug" style={{ color: "var(--text-muted)" }}>{l}</span>
        ))}
      </span>
    </button>
  );
}

export default function RoadmapPage() {
  const router = useRouter();
  const [ws, setWs] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    return ensureWorkspaceSaved()?.workspace ?? null;
  });
  const [sel, setSel] = useState<{ kind: "module" | "member"; id: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!ws) return <div className="min-h-dvh" />;

  const apply = (fn: (w: Workspace) => Workspace) =>
    setWs((cur) => { if (!cur) return cur; const next = fn(cur); saveWorkspace(next); return next; });

  /* ── تفاصيل الاختبار (مساحة المذاكرة الكاملة) ── */
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

  /* ── لقطة اليوم: كل رقمٍ من محرّكٍ نقيّ ── */
  const today = localDayKey();
  const priority = readPriorityExam(ws);
  const eligibilityCtx = readEligibilityCtx(today);
  const daily = pickDailyMessage(readDailySignals(ws));
  const examDate = priority?.examKey ? (loadTrackExamDates()[priority.examKey] ?? null) : null;
  const daysLeft = examDate ? daysBetween(today, examDate) : null;

  /* موادُّ الجلسة تتبع نمطَ التوزيع: «بالتتابع» ⇒ اختبارُ الأولوية وحده،
     «معاً» ⇒ موادُّ اختباراتك كلِّها في يومٍ واحد. */
  const planSubjects = readPlanSubjects(ws);
  /* خطّةُ الأشهر — لكلِّ نمط: بالتتابع فترتان، ومعاً مشتركةٌ ثم تفرّغ، ومتداخل
     ثلاثُ فترات. تُعرض لمن عنده اختباران فأكثر. */
  const staged = readStagedPlan(ws, today);
  const pace = readPace(today);
  const examNames = new Map(readAllExams(ws).map((e) => [e.id, e.label]));
  const counts = planSubjects.length ? countRemaining(planSubjects) : { remainingLessons: 0, remainingDrills: 0, weakestSubject: null, totalItems: 0, doneItems: 0 };
  const avail = readTodayAvailability();
  const st = loadStats();
  const stats = computeStats({ dayMins: st.dayMins ?? {}, sessionDays: st.sessionDays, sessions: loadSessions(), today, plannedDailyMins: ((loadUser()?.studyHours ?? 0) * 60) || null });
  /* الإشارتان المتاحتان في حالة هذه الصفحة أصلاً: `daysLeft` (سطر ١٢١) و
     `stats.week.commitmentPct`. تُمرَّران كما هما؛ وما لا يوجد يبقى `undefined`
     والمحرّكُ يعرف كيف يتعامل مع غيابه. */
  const plan = priority ? buildSessionPlan({
    subjects: planSubjects.map((s) => s.name), weakestSubject: counts.weakestSubject,
    remainingLessons: counts.remainingLessons, remainingDrills: counts.remainingDrills,
    activeErrors: vaultCount(), availableMinutes: avail.minutes, mode: loadRoadmapConfig().studyMode,
    daysUntilExam: daysLeft != null && daysLeft >= 0 ? daysLeft : undefined,
    commitmentPercentage: stats.week.commitmentPct ?? undefined,
  }) : null;

  const solved = solvedQuestions();
  const hasWeek = stats.week.hours > 0 || stats.week.sessions > 0 || solved > 0;

  /* تدخّلُ دويرب عند انخفاض الالتزام — من `commitmentPct` وحدَه، ولا يتكلّم قبل
     أن يصير للأسبوع محتوى (نفسُ شرط `hasWeek` أعلاه): «التزام ٠٪» لمن لم يبدأ
     حكمٌ على لا شيء لا معلومة. */
  const commitmentNote = duwairbMoment({
    kind: "commitment-drop",
    commitmentPct: stats.week.commitmentPct,
    weekHours: stats.week.hours,
    weekSessions: stats.week.sessions,
  });

  /* 🎯 هدف اليوم — ماذا سأفعل؟ (بلا مدّة: المدّة وظيفة صفحة التركيز) */
  const doneToday = tasksDoneToday();
  const totalTasks = plan?.tasks.length ?? 0;
  const allDone = totalTasks > 0 && doneToday >= totalTasks;
  /* المهمّةُ التالية — بها يبدأ الزرُّ، وباسمها يُخبر الطالبَ بأيّ مادّةٍ يبدأ */
  const nextTask = plan?.tasks[Math.min(doneToday, Math.max(0, totalTasks - 1))] ?? plan?.tasks[0];

  /* 🗓️ التقويم — ماذا عندي؟ عنوانُ أقرب حدثٍ وحده هو القيمة (قصيرٌ يحتمل الخطّ الكبير)،
     والظرف («اليوم»/«غداً») ينزل إلى الوصف مع الحدث الذي يليه — لا دمجَ في سطرٍ واحد. */
  const up = groupUpcoming(loadCalendar(), today);
  const upNext = [...up.today, ...up.tomorrow, ...up.week];
  const whenOf = (e: (typeof upNext)[number]) =>
    up.today.includes(e) ? "اليوم" : up.tomorrow.includes(e) ? "غداً" : "هذا الأسبوع";
  const nextEvent = upNext[0] ?? null;
  const afterNext = upNext[1] ?? null;
  const calLines = [
    nextEvent ? whenOf(nextEvent) : "سجّل أحداث حياتك",
    afterNext ? `ثمّ ${whenOf(afterNext)} ${kindMeta(afterNext.kind).icon} ${afterNext.title}` : "عرض التقويم ←",
  ];

  /* 📚 المصادر — من أين أتعلم؟ (المستخدَمة فعلاً، وإلا أبرز الجهات) */
  const recentIds = recentResourceIds();
  const shortOf = (l: { name: string; short?: string }) => l.short ?? l.name;
  const usedNames = recentIds.map((id) => OFFICIAL_LINKS.find((l) => l.id === id)).filter(Boolean).map((l) => shortOf(l!));
  const shownNames = (usedNames.length > 0 ? usedNames : OFFICIAL_LINKS.map(shortOf)).slice(0, 3);
  const restCount = Math.max(0, OFFICIAL_LINKS.length - shownNames.length);

  const openExam = () => { if (priority) setSel({ kind: priority.kind, id: priority.id }); else setSettingsOpen(true); };

  /* «هذا الأسبوع» — أربعة مقاييس حقيقية */
  const weekMetrics = [
    { icon: "⏱️", v: n(stats.week.hours), l: "ساعة مذاكرة" },
    { icon: "📚", v: n(stats.week.sessions), l: "جلسات" },
    { icon: "🔥", v: n(stats.week.streakDays), l: "أيام متتالية" },
    { icon: "✍️", v: n(solved), l: "سؤالاً محلولاً" },
  ];

  return (
    <div className="page desk-wide">
      <PageGuide pageKey="roadmap" steps={[
        { title: "مساري = لوحة قيادتك", desc: "أعلاها ملخّص أسبوعك، ثم بطاقاتك الأربع، وزر «ابدأ المذاكرة» يفتح جلسة اليوم الجاهزة." },
      ]} />
      {/* اسم الصفحة في القبّة تحت الساعة والفضّة — كما في بقية الصفحات.
          بلا إيموجي: grad-title يقصّ اللون فيحوّل المِحرَف إلى كتلةٍ ملوّنة. */}
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">مساري</h1>
        </div>
      </Dome>
      <div className="h-4" />

      <div className="page-content flex flex-col gap-2.5">
        {/* الرأس: ترحيبُ دويرب + فعلُ الإعدادات (اسم الصفحة صار في القبّة أعلاه) */}
        <header className="ds-card flex flex-col gap-1.5 rise"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <div className="flex items-start gap-2">
            <p className="t-title font-black flex-1" style={{ color: "var(--text)" }}>{daily.greeting}</p>
            <button onClick={() => setSettingsOpen(true)} aria-label="إعدادات مساري" title="إعدادات مساري"
              className="w-9 h-9 rounded-full grid place-items-center text-[16px] transition active:scale-90 flex-shrink-0"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--elev-1)" }}>
              ⚙️
            </button>
          </div>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>{daily.message}</p>
        </header>

        {commitmentNote && (
          <DismissibleNote id={commitmentNote.id} title={commitmentNote.text}>{commitmentNote.why}</DismissibleNote>
        )}

        {/* الأقسامُ يرتّبها الطالبُ ويخفي ما لا يعنيه — والترويسةُ فوقها ثابتة.
            «هذا الأسبوع» أرقامٌ حقيقية تفتح الإحصائيات الكاملة. */}
        <Customizable page="roadmap" className="flex flex-col gap-2.5" sections={[
        { id: "week", label: "هذا الأسبوع", desc: "أرقامُ أسبوعك والتزامك", node: (
        <button onClick={() => router.push("/roadmap/stats")}
          className="ds-card ds-card-interactive flex flex-col gap-3 text-right rise rise-1" style={{ ["--tint" as string]: "var(--accent)" }}>
          <span className="flex items-center gap-2">
            <span className="eyebrow flex-1" style={{ color: "var(--text-muted)" }}>📊 هذا الأسبوع</span>
            {/* «التزام ٠٪» لمن لم يبدأ بعد ليست معلومةً — هي حكمٌ على لا شيء.
                فالرقاقةُ لا تظهر إلا بعد أن يصير للأسبوع محتوى. */}
            {hasWeek && stats.week.commitmentPct != null && (
              <span className="t-caption font-black px-2.5 py-1 rounded-full font-mono-nums"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                التزام {pct(stats.week.commitmentPct)}
              </span>
            )}
            <span className="t-caption" style={{ color: "var(--text-dim)" }}>↗</span>
          </span>
          {/* البطاقةُ تحفظ شكلها فارغةً وممتلئة: أربعةُ مقاييسَ بشرطاتٍ قبل أن
              يبدأ، فيرى **ما الذي سيمتلئ** بدل جملةٍ وحيدةٍ في فراغ. */}
          <span className="grid grid-cols-4">
            {weekMetrics.map((m, i) => (
              <span key={m.l} className="flex flex-col items-center gap-0.5 px-1"
                style={i > 0 ? { borderInlineStart: "1px solid var(--border)" } : undefined}>
                <span className="text-[15px] leading-none" aria-hidden="true">{m.icon}</span>
                <span className="t-h2 font-black font-mono-nums leading-tight"
                  style={{ color: hasWeek ? "var(--text)" : "var(--text-dim)" }}>{hasWeek ? m.v : "—"}</span>
                <span className="t-caption text-center leading-tight" style={{ color: "var(--text-dim)" }}>{m.l}</span>
              </span>
            ))}
          </span>
          {!hasWeek && (
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>ابدأ أول جلسة، وتمتلئ هذه الأرقام بأسبوعك.</span>
          )}
        </button>
        ) },

        /* الشبكة ٢×٢ — كل بطاقة تجيب سؤالاً واحداً، بلا تكرارٍ مع صفحةٍ أخرى */
        { id: "tiles", label: "بطاقاتك الأربع", desc: "اختبارك · خطتي · التقويم · المصادر", node: (
        <div className="grid grid-cols-2 gap-2.5 rise rise-3">
          <Tile icon="🧠" label="اختبارك" tint={priority?.color ?? "var(--accent)"}
            value={priority?.label ?? "لا اختبار بعد"}
            lines={priority
              ? [daysLeft != null && daysLeft > 0 ? `باقي ${daysWord(daysLeft)}` : daysLeft === 0 ? "موعدك اليوم" : "بلا موعدٍ محدّد", "جاهز تبدأ؟"]
              : ["أضف اختبارك الأول", ""]}
            onClick={openExam} />

          <Tile icon="🗓️" label="خطتي" tint="#8B5CF6"
            value={priority?.label ?? "لا خطة بعد"}
            lines={[
              daysLeft != null && daysLeft > 0 ? `باقي ${daysWord(daysLeft)}` : daysLeft === 0 ? "موعدك اليوم" : "حدّد موعد اختبارك",
              "افتح خطتي ←",
            ]}
            onClick={() => router.push("/plan")} />

          <Tile icon="🗓️" label="التقويم" tint="#3B82F6"
            value={nextEvent ? nextEvent.title : "لا أحداث قريبة"}
            lines={calLines}
            onClick={() => router.push("/roadmap/calendar")} />

          <Tile icon="📚" label="المصادر" tint="#10B981"
            value={shownNames[0] ?? "الجهات الرسمية"}
            lines={[shownNames.slice(1).join("، "), restCount > 0 ? "+ باقي المصادر ←" : "افتح المواقع الرسمية ↗"]}
            onClick={() => router.push("/roadmap/resources")} />
        </div>
        ) },

        /* ▶ البطل — وفيه **هدفُ اليوم**. كانا بطاقتين: واحدةٌ تقول ماذا عليك
           وأخرى تقول ابدأ، والطالبُ يقرأ الأولى ثم يضغط الثانية. صارا واحداً:
           ماذا عليك اليوم · كم أنجزت · وبأيّ مادّةٍ يبدأ — في الزرّ الذي يبدأ.
           ثابتٌ لا يُخفى: صفحةٌ لا تبدأ منها المذاكرةُ ليست «مساري». */
        { id: "start", label: "ابدأ المذاكرة", desc: "هدفُ اليوم وزرُّ البدء", fixed: true, node: (
        <button onClick={() => {
            /* يبدأ بالمهمّة **التالية** لا بالأولى دائماً: من أنجز اثنتين يكمل
               من الثالثة، فتبدأ الجلسةُ على مادّتها هي. */
            const t = nextTask;
            router.push(`/orbit?${focusHandoffQuery({
              subject: t?.subject ?? counts.weakestSubject ?? undefined,
              taskMins: t?.goalMins, taskLabel: t?.label,
            })}`);
          }}
          className="w-full text-right transition active:scale-[0.98] rise rise-3"
          style={{
            background: allDone
              ? "linear-gradient(135deg, var(--success), color-mix(in srgb, var(--success) 70%, var(--accent)))"
              : "linear-gradient(135deg, var(--accent), var(--accent-hi, var(--accent-light)))",
            color: "#fff", border: "none", borderRadius: "var(--r-lg)", padding: "16px 18px",
            boxShadow: "0 12px 32px color-mix(in srgb, var(--accent) 32%, transparent), 0 2px 6px rgba(0,0,0,.06)",
          }}>
          <span className="flex items-center gap-3 w-full">
            <span className="w-11 h-11 rounded-2xl grid place-items-center text-[20px] flex-shrink-0"
              style={{ background: "rgba(255,255,255,.16)" }} aria-hidden="true">{allDone ? "✓" : "▶"}</span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>
                {plan?.available && !allDone ? `هدف اليوم · ${tasksWord(totalTasks)}` : "هدف اليوم"}
              </span>
              <span className="block t-title font-black" style={{ letterSpacing: "0" }}>
                {allDone ? "أنهيتَ مهامّ اليوم" : "ابدأ المذاكرة"}
              </span>
              <span className="block t-caption font-bold line-clamp-2" style={{ color: "rgba(255,255,255,.86)" }}>
                {!plan?.available
                  ? (plan?.hint ?? "حدّد ساعات مذاكرتك")
                  : allDone ? "جلسةٌ إضافية؟ أنت في المقدّمة اليوم."
                  : `تبدأ بـ${nextTask?.label ?? "جلسة تركيز"}`}
              </span>
            </span>
          </span>

          {/* كم أنجزتَ من مهامّ اليوم — كان في البطاقة المحذوفة */}
          {plan?.available && totalTasks > 0 && (
            <span className="w-full flex items-center gap-2 mt-3">
              <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.25)" }}>
                <span className="block h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((doneToday / totalTasks) * 100))}%`, background: "#fff" }} />
              </span>
              <span className="t-caption font-mono-nums font-black flex-shrink-0" style={{ color: "rgba(255,255,255,.92)" }}>
                {n(Math.min(doneToday, totalTasks))}/{n(totalTasks)}
              </span>
            </span>
          )}
        </button>
        ) },

        { id: "months", label: "خطّتك عبر الأشهر", desc: "متى تجهز لكلّ اختبار", node: (
          <ExamPlanTimeline plan={staged} pace={pace} labelOf={(id) => examNames.get(id) ?? id} />
        ) },
        ]} />

        <NextThread page="/roadmap" />
        <PageFooter />
      </div>

      {settingsOpen && (
        <RoadmapSettings
          ws={ws}
          ctx={eligibilityCtx}
          onChange={(next) => { setWs(next); saveWorkspace(next); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

    </div>
  );
}
