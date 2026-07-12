"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import DefCard from "@/components/DefCard";
import { RAKAN_SCHEDULE } from "@/lib/constants";
import { getTrack, subjectColor, TRACKS, type Track, type TrackId } from "@/lib/tracks";
import { fmtHour } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import Confetti from "@/components/Confetti";
import {
  loadUser, saveUser, loadList, saveList, loadExamDate, saveExamDate, loadStats,
  loadEvents, saveEvents, loadExamFlow, saveExamFlow,
  loadStageReviews, saveStageReviews,
  loadTadreebItems, saveTadreebItems, loadTadreebDone, saveTadreebDone,
  loadTasreebatPct, saveTasreebatPct,
  loadTrackExamDates, saveTrackExamDates,
  loadResults, saveResults, recordTrackProgress,
  type ScheduleEvent, type ExamFlow, type StageReviews, type TrainingItem,
} from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";
/* syncUser مُستورَد ديناميكياً أسفل — يُبعد Firebase عن حزمة الخريطة المبدئية */
import dynamic from "next/dynamic";
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });
const TopicExtractor = dynamic(() => import("@/components/TopicExtractor"), { ssr: false });
const LeaksPlanner = dynamic(() => import("@/components/LeaksPlanner"), { ssr: false });
const ExamCoordPanel = dynamic(() => import("@/components/ExamCoordPanel"), { ssr: false });
const StrategyBanner = dynamic(() => import("@/components/StrategyBanner"), { ssr: false });
import DayScheduler, { getEventsForDate } from "@/components/DayScheduler";
import ExamDateButton from "@/components/ExamDateButton";

interface CustomLesson { id: string; subject: string; title: string; }

const DONE_KEY   = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";
type TahsiliSubject = keyof typeof RAKAN_SCHEDULE;

const TAHSILI_TOTALS: Record<TahsiliSubject, { hours: number; pages: string }> = {
  فيزياء:   { hours: 30, pages: "8-90"    },
  رياضيات: { hours: 42, pages: "92-157"  },
  كيمياء:   { hours: 30, pages: "180-263" },
  أحياء:    { hours: 37, pages: "266-353" },
};

/* نسب التقدم — تُحسب قبل الـ render لمزامنتها مع Firestore */
function computeProgress(
  track: Track, done: string[], custom: CustomLesson[],
  tadreebItems: TrainingItem[], tadreebDone: string[],
): { taseesPct: number; tadreebPct: number } {
  const isTahsili = track.id === "تحصيلي" || track.id === "تحصيلي مبكر";
  const doneSet = new Set(done);
  const lessonKeys = track.subjects.flatMap((s) =>
    isTahsili && s.name in RAKAN_SCHEDULE
      ? RAKAN_SCHEDULE[s.name as TahsiliSubject].map((l) => `${s.name}-${l.lesson}`)
      : custom.filter((c) => c.subject === s.name).map((c) => `custom-${c.id}`)
  );
  const taseesPct = lessonKeys.length === 0 ? 0
    : Math.round((lessonKeys.filter((k) => doneSet.has(k)).length / lessonKeys.length) * 100);

  const tdSet = new Set(tadreebDone);
  const subjectNames = new Set(track.subjects.map((s) => s.name));
  const training = tadreebItems.filter((t) => subjectNames.has(t.subject));
  const tadreebPct = training.length === 0 ? 0
    : Math.round((training.filter((t) => tdSet.has(t.id)).length / training.length) * 100);

  return { taseesPct, tadreebPct };
}

const TASEES_CHECKPOINTS: { key: keyof StageReviews; pct: number; label: string }[] = [
  { key: "tasees25", pct: 25, label: "ربع التأسيس — خذ 10 دقائق للمراجعة" },
  { key: "tasees50", pct: 50, label: "نصف التأسيس — راجع قبل المتابعة" },
  { key: "tasees75", pct: 75, label: "ثلاثة أرباع التأسيس — آخر ربع" },
];
const TADREEB_CHECKPOINTS: { key: keyof StageReviews; pct: number; label: string }[] = [
  { key: "tadreeb25", pct: 25, label: "ربع التدريب — راجع حلولك" },
  { key: "tadreeb50", pct: 50, label: "نصف التدريب — مرحلة ممتازة" },
  { key: "tadreeb75", pct: 75, label: "ثلاثة أرباع التدريب — اقتربت" },
];

/* ─── ReviewBanner ─── */
function ReviewBanner({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-3"
      style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 32%, transparent)" }}>
      <p className="flex-1 font-bold text-[19px]" style={{ color: "var(--text)" }}>{label}</p>
      <button onClick={onDismiss} className="px-3 py-2 rounded-xl font-bold text-[19px] min-h-[40px] flex-shrink-0"
        style={{ background: "var(--accent)", color: "white", border: "none" }}>تمت ✓</button>
    </div>
  );
}

/* ─── PhaseSection ─── */
function PhaseSection({ title, num, pct, complete, unlocked, color, accentText, lockedMsg, open, onToggle, children }: {
  title: string; num: number; pct: number; complete: boolean;
  unlocked: boolean; color: string; accentText: string;
  lockedMsg?: string; open?: boolean; onToggle?: () => void; children?: ReactNode;
}) {
  /* مقفلة → شريط رفيع فقط */
  if (!unlocked) {
    return (
      <div className="px-5 mb-3">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
            style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>🔒</div>
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>المرحلة {num} من ٣</span>
            <p className="font-black text-[17px] leading-tight" style={{ color: "var(--text-muted)" }}>{title}</p>
          </div>
          {lockedMsg && <span className="text-[14px] font-bold text-left" style={{ color: "var(--text-muted)" }}>{lockedMsg}</span>}
        </div>
      </div>
    );
  }

  /* مكتملة ومطويّة → عنوان صغير قابل للفتح */
  if (complete && !open) {
    return (
      <div className="px-5 mb-3">
        <button onClick={onToggle}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition active:scale-[0.99]"
          style={{ background: "color-mix(in srgb, #10B981 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background: "#10B981", color: "white" }}>✓</div>
          <div className="flex-1 min-w-0 text-right">
            <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>المرحلة {num} من ٣</span>
            <p className="font-black text-[17px] leading-tight" style={{ color: "var(--text)" }}>{title} — مكتمل</p>
          </div>
          <span className="text-[15px] font-black flex-shrink-0" style={{ color: "#10B981" }}>عرض ▾</span>
        </button>
      </div>
    );
  }

  /* مفتوحة (الجارية أو مكتملة فُتحت يدوياً) */
  return (
    <div className="px-5 mb-5">
      <button onClick={complete ? onToggle : undefined} disabled={!complete}
        className="w-full flex items-center gap-3 mb-2.5 text-right">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={complete ? { background: "#10B981", color: "white" } : { background: color, color: "white" }}>
          {complete ? "✓" : num}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>المرحلة {num} من ٣</span>
          <p className="font-black text-base leading-tight" style={{ color: "var(--text)" }}>{title}</p>
        </div>
        <span className="font-mono-nums font-black text-[19px] flex-shrink-0" style={{ color: accentText }}>{pct}%</span>
        {complete && <span className="text-[15px] font-black flex-shrink-0" style={{ color: "#10B981" }}>▴</span>}
      </button>
      <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: pct + "%", background: color }} />
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ─── NextStepOverlay ─── */
function NextStepOverlay({
  grade, skipped, currentPlan, canDismiss, examTitle, stats,
  onPick, onResetTasees, onResetTadreeb, onClose,
}: {
  grade?: number; skipped: boolean; currentPlan?: string; canDismiss: boolean;
  examTitle: string;
  stats: { days: number; hours: string; sessions: number };
  onPick: (plan: string) => void;
  onResetTasees: () => void;
  onResetTadreeb: () => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  const gradeDisplay = grade !== undefined
    ? `درجتك كانت ${grade}`
    : skipped ? "لم تُسجَّل الدرجة" : "";

  const FORWARD_OPTS = [
    { id: "cpc",    title: "مسار CPC — أرامكو",      sub: "ابتعاث أو توظيف أرامكو" },
    { id: "qudrat", title: "اختبار القدرات",          sub: "كمي ولفظي — قياس" },
    { id: "other",  title: "مادة أخرى",               sub: "تخصص أو مسار جديد" },
    { id: "rest",   title: "استراحة مستحقة",           sub: "خذ نفسك — رجعت أقوى" },
  ];
  const RETRY_OPTS = [
    { id: "from_tasees",  title: "أعد التأسيس من الصفر", sub: "إعادة بناء كاملة", action: onResetTasees },
    { id: "from_tadreeb", title: "أعد التدريب",           sub: "التأسيس جيد — عمّق التمارين", action: onResetTadreeb },
    { id: "diagnostic",   title: "اختبار تشخيصي",         sub: "حدد وين الضعف بالضبط", action: undefined },
  ];

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        {canDismiss && (
          <button onClick={onClose} className="dome-chip text-[19px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>← رجوع</button>
        )}
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>وش تبي تكمل؟</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-6 pb-24">
        {/* احتفال الإكمال — وسام فضي لامع + إحصائيات الرحلة */}
        <div className="flex flex-col items-center text-center gap-4 pt-2">
          <div className="relative silver-medal w-28 h-28 rounded-full flex flex-col items-center justify-center">
            <span className="text-[38px] leading-none">🏅</span>
            <span className="text-[12px] font-black mt-0.5" style={{ color: "#5A6270" }}>أنجزت</span>
          </div>
          <div>
            <p className="title-lg" style={{ color: "var(--text)" }}>مبروك! أكملت {examTitle}</p>
            <p className="text-[16px] mt-1" style={{ color: "var(--text-muted)" }}>وسام الفضة من نصيبك — رحلة تستاهل الفخر</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {[
              { val: stats.days,     label: "يوم مذاكرة",  isNum: typeof stats.days === "number", color: "var(--accent-light)", glow: "#2563EB" },
              { val: stats.hours,    label: "ساعة تركيز",  isNum: false, color: "var(--gold)", glow: "#F5B40A" },
              { val: stats.sessions, label: "جلسة أوربت",  isNum: typeof stats.sessions === "number", color: "var(--success)", glow: "#10B981" },
            ].map((s) => (
              <div key={s.label} className="relative rounded-2xl p-3 flex flex-col gap-0.5 overflow-hidden"
                style={{
                  background: `color-mix(in srgb, ${s.glow} 7%, var(--surface))`,
                  border: `1px solid color-mix(in srgb, ${s.glow} 20%, var(--border))`,
                }}>
                <span className="font-mono-nums font-black text-2xl relative z-10" style={{ color: s.color }}>
                  {s.isNum && typeof s.val === "number" && s.val > 0
                    ? <NumberTicker value={s.val} style={{ color: s.color }} />
                    : s.val}
                </span>
                <span className="text-[12px] relative z-10" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grade chip */}
        {gradeDisplay && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)" }}>
            <span className="font-bold text-[19px]" style={{ color: "var(--gold)" }}>{gradeDisplay}</span>
          </div>
        )}

        {/* Forward section */}
        <div>
          <p className="eyebrow mb-3 px-1">تابع بمسار جديد</p>
          <div className="flex flex-col gap-2.5">
            {FORWARD_OPTS.map((opt) => (
              <button key={opt.id} onClick={() => onPick(opt.id)}
                className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 text-right transition active:scale-[0.98]"
                style={{
                  background: currentPlan === opt.id ? "color-mix(in srgb, var(--accent) 14%, var(--surface))" : "var(--surface)",
                  border: currentPlan === opt.id ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                  minHeight: "72px",
                }}>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-[19px]" style={{ color: "var(--text)" }}>{opt.title}</p>
                  <p className="text-[19px] mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
                </div>
                {currentPlan === opt.id && <span className="text-[var(--accent)] text-xl flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Retry section */}
        <div>
          <p className="eyebrow mb-3 px-1">أعد المذاكرة</p>
          <div className="flex flex-col gap-2.5">
            {RETRY_OPTS.map((opt) => (
              <button key={opt.id}
                onClick={() => {
                  if (opt.action) opt.action();
                  onPick(opt.id);
                }}
                className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 text-right transition active:scale-[0.98]"
                style={{
                  background: currentPlan === opt.id ? "color-mix(in srgb, var(--danger) 10%, var(--surface))" : "var(--surface)",
                  border: currentPlan === opt.id ? "2px solid var(--danger)" : "1.5px solid var(--border)",
                  minHeight: "72px",
                }}>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-[19px]" style={{ color: "var(--text)" }}>{opt.title}</p>
                  <p className="text-[19px] mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
                </div>
                {currentPlan === opt.id && <span className="text-[var(--danger)] text-xl flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[19px] text-center" style={{ color: "var(--text-muted)" }}>
          القرار يُحفظ ويمكنك تغييره في أي وقت من مساري
        </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/* ═══════════════════════════════════════════════════════ */
export default function RoadmapPage() {
  const [primaryTrack, setPrimaryTrack] = useState<Track | null>(() => {
    if (typeof window === "undefined") return null;
    return getTrack(loadUser()?.track);
  });
  const [done, setDone] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadList<string>(DONE_KEY) : []
  );
  const [custom, setCustom] = useState<CustomLesson[]>(() =>
    typeof window !== "undefined" ? loadList<CustomLesson>(CUSTOM_KEY) : []
  );

  const [selected, setSelected]       = useState<string | null>(null);
  const [drillPhase, setDrillPhase]   = useState<"tasees" | "tadreeb">("tasees");
  const [newLesson, setNewLesson]     = useState("");
  const [newTraining, setNewTraining] = useState("");

  const [examDate, setExamDate] = useState<string | null>(() =>
    typeof window !== "undefined" ? loadExamDate() : null
  );
  const [events, setEvents] = useState<ScheduleEvent[]>(() =>
    typeof window !== "undefined" ? loadEvents() : []
  );
  const [schedulerDate, setSchedulerDate]   = useState<string | null>(null);
  const [schedTab, setSchedTab]             = useState<"manual" | "ai">("manual");

  const [examFlow, setExamFlow] = useState<ExamFlow>(() =>
    typeof window !== "undefined" ? loadExamFlow() : {}
  );
  const [stageReviews, setStageReviews] = useState<StageReviews>(() =>
    typeof window !== "undefined" ? loadStageReviews() : {}
  );
  const [gradeInput, setGradeInput]       = useState("");
  const [showNextStep, setShowNextStep]   = useState(false);
  const [showConfetti, setShowConfetti]   = useState(false);
  const celebratedRef = useRef<Set<string>>(new Set());

  const [tadreebItems, setTadreebItems] = useState<TrainingItem[]>(() =>
    typeof window !== "undefined" ? loadTadreebItems() : []
  );
  const [tadreebDone, setTadreebDone] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadTadreebDone() : []
  );
  const [tasreebatPct, setTasreebatPct] = useState<number>(() =>
    typeof window !== "undefined" ? loadTasreebatPct() : 0
  );
  const [trackExamDates, setTrackExamDates] = useState<Record<string, string>>(() =>
    typeof window !== "undefined" ? loadTrackExamDates() : {}
  );
  const [activeTrackIds, setActiveTrackIds] = useState<TrackId[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    return (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
  });
  const [testTab, setTestTab] = useState<TrackId | "all">(() => {
    if (typeof window === "undefined") return "all";
    return (loadUser()?.track as TrackId) ?? "all";
  });

  useEffect(() => { saveList(DONE_KEY, done); }, [done]);
  useEffect(() => { saveList(CUSTOM_KEY, custom); }, [custom]);
  useEffect(() => { saveTadreebItems(tadreebItems); }, [tadreebItems]);
  useEffect(() => { saveTadreebDone(tadreebDone); }, [tadreebDone]);

  /* مزامنة نسب التقدم مع Firestore — تظهر في لوحة الأدمن (للمسار الأساسي) */
  const progress = primaryTrack ? computeProgress(primaryTrack, done, custom, tadreebItems, tadreebDone) : null;
  const taseesSync = progress?.taseesPct ?? -1;
  const tadreebSync = progress?.tadreebPct ?? -1;
  useEffect(() => {
    if (taseesSync < 0) return;
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ taseesProgress: taseesSync, tadreebProgress: tadreebSync }); });
    recordTrackProgress(Math.max(taseesSync, tadreebSync));
  }, [taseesSync, tadreebSync]);

  if (!primaryTrack) return <div className="min-h-dvh" />;

  /* الاختبار المعروض: «الكل» = نظرة مدمجة · أو اختبار محدد = خريطته الكاملة */
  const track: Track = testTab === "all" ? primaryTrack : getTrack(testTab);

  const isTahsili = track.id === "تحصيلي" || track.id === "تحصيلي مبكر";
  const doneSet = new Set(done);
  const tadreebDoneSet = new Set(tadreebDone);

  const lessonsOf = (subj: string): { key: string; title: string; meta?: string; diff?: string }[] => {
    if (isTahsili && subj in RAKAN_SCHEDULE) {
      return RAKAN_SCHEDULE[subj as TahsiliSubject].map((l) => ({
        key: `${subj}-${l.lesson}`, title: l.lesson,
        meta: `اليوم ${l.day} · ${l.hours} ساعة · ص ${l.pages}`, diff: l.difficulty,
      }));
    }
    return custom.filter((c) => c.subject === subj).map((c) => ({ key: `custom-${c.id}`, title: c.title }));
  };

  const trainingOf = (subj: string) => tadreebItems.filter((t) => t.subject === subj);

  /* تقدم التأسيس */
  const allLessons      = track.subjects.flatMap((s) => lessonsOf(s.name));
  const taseesDoneCount = allLessons.filter((l) => doneSet.has(l.key)).length;
  const taseesPct       = allLessons.length === 0 ? 0 : Math.round((taseesDoneCount / allLessons.length) * 100);
  const taseesComplete  = taseesPct === 100;

  /* تقدم التدريب */
  const allTraining        = track.subjects.flatMap((s) => trainingOf(s.name));
  const tadreebDoneCount   = allTraining.filter((t) => tadreebDoneSet.has(t.id)).length;
  const tadreebPct         = allTraining.length === 0 ? 0 : Math.round((tadreebDoneCount / allTraining.length) * 100);
  const tadreebUnlocked    = taseesComplete;
  const tadreebComplete    = tadreebUnlocked && (
    examFlow.skippedTadreeb === true || (allTraining.length > 0 && tadreebPct === 100)
  );

  /* التسريبات */
  const tasreebatUnlocked = tadreebComplete;
  const todayStr   = new Date().toISOString().slice(0, 10);
  const examPast   = examDate !== null && examDate <= todayStr;
  const hasGrade   = examFlow.grade !== undefined;
  const skipped    = examFlow.skippedGrade === true;
  const gradeOrSkipped = hasGrade || skipped;

  const displayTasreebatPct = examPast && hasGrade ? 100 : tasreebatPct;

  /* ── المرحلة الجارية فقط مفتوحة ──
     النشطة = أول مرحلة مفتوحة وغير مكتملة. المكتملة تنطوي (يمكن فتحها يدوياً)،
     والمقفلة تظهر شريطاً رفيعاً. يبسّط الخريطة فلا تتكدّس المراحل. */
  const activePhase = !taseesComplete ? 1 : !tadreebComplete ? 2 : 3;
  const [openCompleted, setOpenCompleted] = useState<Set<number>>(new Set());
  const togglePhase = (n: number) =>
    setOpenCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  const isPhaseOpen = (n: number) => n === activePhase || openCompleted.has(n);

  /* المرحلة التالية — تطلع أوتوماتيك لما يدخل الدرجة أو يتجاوزها */
  const shouldAutoOpenNextStep = examPast && gradeOrSkipped && !examFlow.plan;

  /* احتفال لمرة واحدة عند إكمال مرحلة */
  useEffect(() => {
    const celebrate = (key: string) => {
      if (celebratedRef.current.has(key)) return;
      try { if (localStorage.getItem(key)) return; } catch { return; }
      celebratedRef.current.add(key);
      try { localStorage.setItem(key, "1"); } catch {}
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    };
    if (taseesComplete) celebrate("darb_tasees_celebrated");
    if (tadreebComplete) celebrate("darb_tadreeb_celebrated");
  }, [taseesComplete, tadreebComplete]);

  /* تخطيط سطح المكتب: القائمة + تفاصيل المادة جنباً إلى جنب (≥1280px) */
  const [isWide, setIsWide] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const h = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  /* ─── Actions ─── */
  const updFlow = (patch: Partial<ExamFlow>) => {
    const u = { ...examFlow, ...patch };
    setExamFlow(u); saveExamFlow(u);
  };
  const updReviews = (patch: Partial<StageReviews>) => {
    const u = { ...stageReviews, ...patch };
    setStageReviews(u); saveStageReviews(u);
  };
  const setTasreebat = (n: number) => {
    const v = Math.min(99, Math.max(0, n));
    setTasreebatPct(v); saveTasreebatPct(v);
  };

  const switchTrack = (plan: string) => {
    const PLAN_TO_TRACK: Record<string, "تحصيلي" | "قدرات" | "CPC"> = {
      cpc: "CPC", qudrat: "قدرات", other: "تحصيلي",
    };
    const newTrackId = PLAN_TO_TRACK[plan];
    if (!newTrackId) return; // rest / from_* لا يغيّر المسار

    const user = loadUser();
    if (!user || user.track === newTrackId) return;
    if (!confirm("تبديل المسار يصفّر تقدّمك في الخريطة الحالية. متأكد؟")) return;

    saveUser({ ...user, track: newTrackId });
    setPrimaryTrack(getTrack(newTrackId));
    setActiveTrackIds((prev) => (prev.includes(newTrackId) ? prev : [newTrackId, ...prev]));
    setTestTab(newTrackId);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ track: newTrackId, taseesProgress: 0, tadreebProgress: 0 }); });

    // إعادة ضبط كل تقدم الخريطة للمسار الجديد
    const fresh: string[] = [];
    setDone(fresh); saveList(DONE_KEY, fresh);
    setCustom([]); saveList(CUSTOM_KEY, []);
    const freshReviews: StageReviews = {};
    setStageReviews(freshReviews); saveStageReviews(freshReviews);
    const freshTD: string[] = [];
    setTadreebDone(freshTD); saveTadreebDone(freshTD);
    setTasreebatPct(0); saveTasreebatPct(0);
    const freshFlow: ExamFlow = {};
    setExamFlow(freshFlow); saveExamFlow(freshFlow);
  };

  const resetTasees = () => {
    /* إعادة كل شيء من الصفر — يبقى المسار والتمارين */
    const freshDone: string[] = [];
    setDone(freshDone); saveList(DONE_KEY, freshDone);
    const freshReviews: StageReviews = {};
    setStageReviews(freshReviews); saveStageReviews(freshReviews);
    const freshTadreebDone: string[] = [];
    setTadreebDone(freshTadreebDone); saveTadreebDone(freshTadreebDone);
    setTasreebatPct(0); saveTasreebatPct(0);
  };

  const resetTadreeb = () => {
    /* يبقى التأسيس، يصفّر التدريب والتسريبات */
    const freshTadreebDone: string[] = [];
    setTadreebDone(freshTadreebDone); saveTadreebDone(freshTadreebDone);
    const freshReviews = { ...stageReviews, tadreeb25: undefined, tadreeb50: undefined, tadreeb75: undefined };
    setStageReviews(freshReviews); saveStageReviews(freshReviews);
    setTasreebatPct(0); saveTasreebatPct(0);
  };

  /* ══ تفاصيل المادة (تأسيس/تدريب) — جسم مشترك بين الجوال (شاشة كاملة) وسطح المكتب (لوحة جانبية) ══ */
  const detailCount = (): string => {
    if (!selected || !drillPhase) return "";
    if (drillPhase === "tasees") {
      const l = lessonsOf(selected);
      return `${l.filter((x) => doneSet.has(x.key)).length}/${l.length}`;
    }
    const it = trainingOf(selected);
    return `${it.filter((x) => tadreebDoneSet.has(x.id)).length}/${it.length}`;
  };

  const renderDetailBody = () => {
    if (!selected || !drillPhase) return null;

    if (drillPhase === "tasees") {
      const color   = subjectColor(track, selected);
      const lessons = lessonsOf(selected);
      const dc      = lessons.filter((l) => doneSet.has(l.key)).length;
      const pct     = lessons.length === 0 ? 0 : Math.round((dc / lessons.length) * 100);
      const totals  = isTahsili ? TAHSILI_TOTALS[selected as TahsiliSubject] : null;
      const addCustom = () => {
        if (!newLesson.trim()) return;
        setCustom((p) => [...p, { id: Date.now().toString(), subject: selected, title: newLesson.trim() }]);
        setNewLesson("");
      };
      const toggle = (key: string) =>
        setDone((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);

      return (
        <>
          <div className="px-5 mb-6 rise rise-1">
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: `1.5px solid ${color}`, boxShadow: `0 0 14px ${color}25` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-base text-[var(--text)]">التأسيس — {selected}</p>
                <span className="font-mono-nums font-black text-2xl" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", background: color }} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <span className="text-sm text-[var(--text-muted)]">{lessons.length} درس</span>
                {totals && <><span className="text-sm text-[var(--text-muted)]">{totals.hours} ساعة</span><span className="text-sm text-[var(--text-muted)]">ص {totals.pages}</span></>}
              </div>
            </div>
          </div>
          {!isTahsili && (
            <div className="px-5 mb-6 flex flex-col gap-3">
              <div className="flex gap-2.5">
                <input value={newLesson} onChange={(e) => setNewLesson(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder={`درس جديد في ${selected}...`}
                  className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[54px]"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
                <button onClick={addCustom} className="px-6 rounded-2xl font-black text-lg min-h-[54px]"
                  style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
              </div>
              <TopicExtractor subject={selected} color={color}
                onAdd={(titles) => setCustom((p) => [
                  ...p,
                  ...titles.map((t, i) => ({ id: `${Date.now()}-${i}`, subject: selected, title: t })),
                ])} />
            </div>
          )}
          <div className="px-5 flex flex-col gap-3 rise rise-2">
            {lessons.length === 0 && (
              <div className="text-center py-12">
                <p className="title-md text-[var(--text)] mb-2">ما فيه دروس بعد</p>
                <p className="body-sm">أضف دروسك فوق وتابع تقدمك درساً بدرس.</p>
              </div>
            )}
            {lessons.map((lesson) => {
              const isDone = doneSet.has(lesson.key);
              const diffColor = lesson.diff === "سهل" ? "#10B981" : lesson.diff === "متوسط" ? "#F59E0B" : "#EF4444";
              return (
                <div key={lesson.key} onClick={() => toggle(lesson.key)}
                  className="rounded-2xl p-5 cursor-pointer transition active:scale-[0.98]"
                  style={{ background: isDone ? color + "10" : "var(--surface)", border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}`, minHeight: "76px" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                      {isDone && <span className="text-white text-lg font-black">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-base leading-snug ${isDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{lesson.title}</p>
                      {lesson.meta && <p className="text-sm text-[var(--text-muted)] mt-1.5">{lesson.meta}</p>}
                    </div>
                    {lesson.diff && <span className="text-sm font-bold flex-shrink-0" style={{ color: diffColor }}>{lesson.diff}</span>}
                    {!isTahsili && (
                      <button onClick={(e) => { e.stopPropagation(); setCustom((p) => p.filter((c) => `custom-${c.id}` !== lesson.key)); setDone((p) => p.filter((k) => k !== lesson.key)); }}
                        className="text-[var(--text-muted)] text-lg px-2 min-h-[44px]" aria-label="حذف">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-6" />
        </>
      );
    }

    /* تدريب */
    const color = subjectColor(track, selected);
    const items = trainingOf(selected);
    const addTraining = () => {
      if (!newTraining.trim()) return;
      setTadreebItems((p) => [...p, { id: Date.now().toString() + Math.random().toString(36).slice(2), subject: selected, title: newTraining.trim() }]);
      setNewTraining("");
    };
    const pct = items.length === 0 ? 0 : Math.round((items.filter((t) => tadreebDoneSet.has(t.id)).length / items.length) * 100);

    return (
      <>
        <div className="px-5 mb-5 rise rise-1">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: `1.5px solid ${color}55` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-base text-[var(--text)]">التدريب — {selected}</p>
              <span className="font-mono-nums font-black text-2xl" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: pct + "%", background: color }} />
            </div>
          </div>
        </div>
        <div className="px-5 mb-6 flex flex-col gap-3">
          <div className="flex gap-2.5">
            <input value={newTraining} onChange={(e) => setNewTraining(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTraining()}
              placeholder={`تمرين جديد في ${selected}...`}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[54px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
            <button onClick={addTraining} className="px-6 rounded-2xl font-black text-lg min-h-[54px]"
              style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
          </div>
          <TopicExtractor subject={selected} color={color}
            onAdd={(titles) => setTadreebItems((p) => [
              ...p,
              ...titles.map((t, i) => ({ id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`, subject: selected, title: t })),
            ])} />
        </div>
        <div className="px-5 flex flex-col gap-3 rise rise-2">
          {items.length === 0 && (
            <div className="text-center py-12">
              <p className="title-md text-[var(--text)] mb-2">ما فيه تمارين بعد</p>
              <p className="body-sm">أضف التمارين اللي تبي تحلّها في {selected}.</p>
            </div>
          )}
          {items.map((item) => {
            const isDone = tadreebDoneSet.has(item.id);
            return (
              <div key={item.id} onClick={() => setTadreebDone((p) => p.includes(item.id) ? p.filter((k) => k !== item.id) : [...p, item.id])}
                className="rounded-2xl p-5 cursor-pointer transition active:scale-[0.98]"
                style={{ background: isDone ? color + "10" : "var(--surface)", border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}`, minHeight: "68px" }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                    {isDone && <span className="text-white text-lg font-black">✓</span>}
                  </div>
                  <p className={`flex-1 font-black text-base ${isDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{item.title}</p>
                  <button onClick={(e) => { e.stopPropagation(); setTadreebItems((p) => p.filter((t) => t.id !== item.id)); setTadreebDone((p) => p.filter((k) => k !== item.id)); }}
                    className="text-[var(--text-muted)] text-lg px-2 min-h-[44px]" aria-label="حذف">✕</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-6" />
      </>
    );
  };

  /* الجوال: تفاصيل المادة شاشة كاملة (سطح المكتب يعرضها كلوحة جانبية في العرض الرئيسي) */
  if (!isWide && selected && (drillPhase === "tasees" || drillPhase === "tadreeb")) {
    return (
      <div className="min-h-dvh pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="dome-chip text-[19px] font-bold" style={{ color: "var(--text)" }}>← رجوع</button>
            <h1 className="title-lg grad-title">{selected}</h1>
            <span className="dome-chip num-hero text-[19px]" style={{ color: "var(--text)" }}>{detailCount()}</span>
          </div>
        </Dome>
        <div className="h-5" />
        {renderDetailBody()}
      </div>
    );
  }

  /* ── أدوات عرض الاختبارات ── */
  const daysLeftOf = (d: string) =>
    Math.round((new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);

  /* تقدم مادة داخل اختبار: تأسيس + تدريب */
  /* ذاكرة مؤقّتة على مستوى الرسم الواحد: statsForSubject يُستدعى ٤–٥ مرات لكل
     مادة في عرض «الكل» (شريط التقدم + البطاقات + المتوسط). الكاش يجمعها في حساب
     واحد لكل (مسار،مادة) دون إضافة أي hook (يُبنى من جديد كل رسم فيعكس الحالة). */
  const statsCache = new Map<string, { done: number; total: number; pct: number }>();
  const statsForSubject = (tr: Track, subj: string) => {
    const ck = `${tr.id}::${subj}`;
    const cached = statsCache.get(ck);
    if (cached) return cached;
    const isT = tr.id === "تحصيلي" || tr.id === "تحصيلي مبكر";
    const lessonKeys = (isT && subj in RAKAN_SCHEDULE)
      ? RAKAN_SCHEDULE[subj as TahsiliSubject].map((l) => `${subj}-${l.lesson}`)
      : custom.filter((c) => c.subject === subj).map((c) => `custom-${c.id}`);
    const training = tadreebItems.filter((t) => t.subject === subj);
    const total = lessonKeys.length + training.length;
    const done = lessonKeys.filter((k) => doneSet.has(k)).length
      + training.filter((t) => tadreebDoneSet.has(t.id)).length;
    const result = { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    statsCache.set(ck, result);
    return result;
  };

  const examLabel = (dl: number | null) =>
    dl === null ? "اضغط «تحديد الموعد» ليوم الاختبار"
      : dl < 0   ? "انتهى الاختبار"
      : dl === 0 ? "الاختبار اليوم — بالتوفيق"
      : dl === 1 ? "الاختبار بكرة — راجع ونم بدري"
      : `${dl} يوم على الاختبار`;

  const examColor = (dl: number | null) =>
    dl === null || dl < 0 ? "var(--text-muted)"
      : dl <= 3 ? "#EF4444"
      : dl <= 14 ? "#F97316"
      : "#10B981";

  /* صف اختبار مبسّط (للوضع المفرد) — الموعد فقط */
  const renderTestRow = (tid: TrackId) => {
    const t = TRACKS.find((tr) => tr.id === tid);
    if (!t) return null;
    const d = trackExamDates[tid] ?? "";
    const dl = d ? daysLeftOf(d) : null;
    return (
      <div key={tid} className="rounded-2xl px-3.5 py-3"
        style={{ background: `color-mix(in srgb, ${t.color} 7%, var(--surface))`, border: `1.5px solid ${t.color}33` }}>
        <div className="flex items-center gap-3">
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: t.color, minHeight: "36px" }} />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[18px]" style={{ color: "var(--text)" }}>{t.title}</p>
            <p className="text-[14px] font-semibold mt-0.5" style={{ color: examColor(dl) }}>{examLabel(dl)}</p>
          </div>
          <ExamDateButton value={d} color={t.color} min={todayStr}
            onChange={(v) => { const updated = { ...trackExamDates, [tid]: v }; setTrackExamDates(updated); saveTrackExamDates(updated); }}
            onClear={() => { const updated = { ...trackExamDates }; delete updated[tid]; setTrackExamDates(updated); saveTrackExamDates(updated); }} />
        </div>
      </div>
    );
  };

  /* بطاقة اختبار كاملة (لوضع «الكل») — الموعد + تقدّم كل مادة */
  const renderTestCard = (tid: TrackId) => {
    const t = TRACKS.find((tr) => tr.id === tid);
    if (!t) return null;
    const d = trackExamDates[tid] ?? "";
    const dl = d ? daysLeftOf(d) : null;
    return (
      <div key={tid} className="rounded-2xl p-3.5"
        style={{ background: `color-mix(in srgb, ${t.color} 6%, var(--surface))`, border: `1.5px solid ${t.color}33` }}>
        {/* رأس: اسم الاختبار + الموعد */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: t.color, minHeight: "34px" }} />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[18px]" style={{ color: "var(--text)" }}>{t.title}</p>
            <p className="text-[14px] font-semibold mt-0.5" style={{ color: examColor(dl) }}>{examLabel(dl)}</p>
          </div>
          <ExamDateButton value={d} color={t.color} min={todayStr}
            onChange={(v) => { const updated = { ...trackExamDates, [tid]: v }; setTrackExamDates(updated); saveTrackExamDates(updated); }}
            onClear={() => { const updated = { ...trackExamDates }; delete updated[tid]; setTrackExamDates(updated); saveTrackExamDates(updated); }} />
        </div>
        {/* تقدّم كل مادة — تُخفى المواد التي لا تحتوي أي دروس أو تمارين */}
        {(() => {
          const activeSubjects = t.subjects.filter((s) => statsForSubject(t, s.name).total > 0);
          if (activeSubjects.length === 0) {
            return (
              <p className="text-[14px] font-semibold text-center py-1" style={{ color: "var(--text-muted)" }}>
                ابدأ بإضافة دروسك من الخريطة
              </p>
            );
          }
          return (
            <div className="flex flex-col gap-2">
              {activeSubjects.map((s) => {
                const st = statsForSubject(t, s.name);
                return (
                  <div key={s.name} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[15px] font-bold flex-shrink-0" style={{ color: "var(--text)", minWidth: "58px" }}>{s.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${st.pct}%`, background: s.color }} />
                    </div>
                    <span className="font-mono-nums text-[12px] font-black flex-shrink-0 text-left" style={{ color: s.color, minWidth: "32px" }}>{st.pct}%</span>
                    <span className="font-mono-nums text-[11px] flex-shrink-0 text-left" style={{ color: "var(--text-muted)", minWidth: "34px" }}>{st.done}/{st.total}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  };

  /* ══ الصفحة الرئيسية ══ */
  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter desk-wide">
      {showConfetti && <Confetti count={36} />}
      {/* سطح المكتب: شبكة [القائمة | تفاصيل المادة] جنباً إلى جنب؛ الجوال يبقى عموداً واحداً */}
      <div className="rm-grid">
      <div className="rm-main">
      <PageGuide pageKey="roadmap" steps={[
        { title: "خريطة طريقك", desc: "رحلتك ثلاث مراحل: تأسيس (تتعلم الأساسيات) ← تدريب (تحل تجميعات) ← تسريبات (محاكاة الاختبار الحقيقي)." },
        { title: "علّم اللي خلصته", desc: "اضغط على أي درس بعد ما تخلصه وبتشوف نسبة تقدمك ترتفع. كل ربع تكمله يطلع لك تنبيه مراجعة." },
        { title: "جدول يومك من هنا", desc: "فوق بالخريطة تلقى المساعد الذكي — قل له مشاغيلك ويبني لك جدول مذاكرة اليوم حولها." },
      ]} />
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">مساري</h1>
          <span className="dome-chip text-[19px] font-bold" style={{ color: "var(--text-dim)" }}>
            {testTab === "all" ? "كل الاختبارات" : `${track.icon} ${track.title}`}
          </span>
        </div>
      </Dome>
      <div className="h-4" />

      {/* تعريفات الاختبارات — صغيرة قابلة للطيّ (تظهر مرّة ثم تُطوى) */}
      <div className="px-5 mb-4 flex flex-col gap-2">
        <DefCard id="qudurat" q="ما هو اختبار القدرات؟"
          a="يقيس مهارات التفكير والتحليل، وتستخدمه معظم الجامعات السعودية في القبول." />
        <DefCard id="tahsili" q="ما هو التحصيلي؟"
          a="يقيس فهمك لمواد المرحلة الثانوية، ويستخدم خصوصاً في التخصصات العلمية والصحية." />
      </div>

      {/* خطتي — وجهة التخطيط الموحّدة */}
      <div className="px-5 mb-4">
        <Link href="/plan"
          className="w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 transition active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", color: "#fff", textDecoration: "none" }}>
          <span className="text-[23px]">🗓️</span>
          <span className="flex-1 text-right">
            <span className="block text-[18px] font-black">خطتي</span>
            <span className="block text-[14px] opacity-90">جدول اليوم والأسبوع وتخطيط دويرب</span>
          </span>
          <span className="text-[20px] font-black">←</span>
        </Link>
      </div>

      {/* استراتيجية المذاكرة الموحّدة — نفس قرار الخطة والمدرّب */}
      <div className="px-5 mb-4">
        <StrategyBanner />
      </div>

      {/* فلتر الاختبارات — [الكل] + كل اختبار */}
      <div className="px-5 mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => { setTestTab("all"); setSelected(null); }}
          className="px-3.5 py-1.5 rounded-xl text-[15px] font-bold transition"
          style={testTab === "all"
            ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
            : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
          الكل
        </button>
        {activeTrackIds.map((tid) => {
          const t = TRACKS.find((tr) => tr.id === tid);
          if (!t) return null;
          const active = testTab === tid;
          return (
            <button key={tid}
              onClick={() => { setTestTab(tid); setSelected(null); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[15px] font-bold transition"
              style={active
                ? { background: t.color, color: "white", border: `1.5px solid ${t.color}` }
                : { background: "transparent", border: `1.5px solid ${t.color}55`, color: t.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: active ? "white" : t.color }} />
              {t.title}
            </button>
          );
        })}
      </div>

      {/* تنسيق الاختبارات — يظهر في «الكل» عند وجود مسارين فأكثر */}
      {testTab === "all" && (
        <ExamCoordPanel tracks={activeTrackIds.map((tid) => TRACKS.find((t) => t.id === tid)?.title ?? String(tid))} />
      )}

      {/* بطاقة خريطة المهارات الشاملة */}
      <div className="px-5 mb-4">
        <Link href="/skills" className="flex items-center justify-between rounded-2xl px-4 py-3 transition active:scale-[0.98]"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)" }}>
          <div className="flex items-center gap-2.5">
            <span className="text-[23px]">🧠</span>
            <div>
              <p className="text-[16px] font-black" style={{ color: "var(--accent-light)" }}>خريطة مهاراتي الشاملة</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>قيّم مستواك في كل مهارة وتتبّع تقدمك</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* ══ الاختبارات: «الكل» = إحصائيات كل المواد مدمجة · أو اختبار واحد ══ */}
      {testTab === "all" ? (
        <div className="px-5 mb-5">
          {/* شريط التقدم المدمج — كل اختبار له برواز، وكل مادة شريحة بنسبة تقدمها */}
          {activeTrackIds.length > 0 && (() => {
            // المواد التي لها محتوى فعلي (دروس أو تمارين) لكل اختبار
            const tracksWithContent = activeTrackIds.map((tid) => {
              const t = TRACKS.find((tr) => tr.id === tid);
              if (!t) return null;
              const subjects = t.subjects.filter((s) => statsForSubject(t, s.name).total > 0);
              return subjects.length > 0 ? { t, subjects } : null;
            }).filter((x): x is { t: (typeof TRACKS)[number]; subjects: (typeof TRACKS)[number]["subjects"] } => x !== null);

            const allSegs = tracksWithContent.flatMap(({ t, subjects }) =>
              subjects.map((s) => statsForSubject(t, s.name).pct)
            );
            const overall = allSegs.length ? Math.round(allSegs.reduce((a, p) => a + p, 0) / allSegs.length) : 0;

            if (tracksWithContent.length === 0) return null;

            return (
              <>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="eyebrow">تقدّمك في كل المواد</p>
                  <span className="font-mono-nums text-[15px] font-black" style={{ color: "var(--accent-light)" }}>{overall}%</span>
                </div>
                {/* الشريط: برواز مستقل لكل اختبار */}
                <div className="flex mb-4" style={{ height: "18px", gap: "4px" }}>
                  {tracksWithContent.map(({ t, subjects }) => (
                    <div key={t.id} className="flex overflow-hidden"
                      style={{
                        flex: subjects.length,
                        borderRadius: "6px",
                        border: `2px solid ${t.color}`,
                        gap: "1px",
                        background: "var(--surface2)",
                      }}>
                      {subjects.map((s) => {
                        const pct = statsForSubject(t, s.name).pct;
                        return (
                          <div key={`${t.id}-${s.name}`} className="relative" style={{ flex: 1, background: `color-mix(in srgb, ${s.color} 22%, transparent)` }}>
                            <div className="absolute inset-y-0" style={{ insetInlineStart: 0, width: `${pct}%`, background: s.color }} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
          <p className="eyebrow mb-2.5 px-1">اختباراتك — اضغط اختبار فوق لفتح خريطته</p>
          <div className="flex flex-col gap-3">
            {activeTrackIds.map((tid) => renderTestCard(tid))}
          </div>
        </div>
      ) : (
        <div className="px-5 mb-5">
          {renderTestRow(testTab)}
        </div>
      )}

      {/* ══ المراحل — تظهر فقط عند اختيار اختبار محدد ══ */}
      {testTab !== "all" && (<>
      {/* ══ التأسيس ══ */}
      <PhaseSection title="التأسيس" num={1} pct={taseesPct} complete={taseesComplete}
        unlocked={true} color="var(--accent)" accentText="var(--accent-light)"
        open={isPhaseOpen(1)} onToggle={() => togglePhase(1)}>
        {TASEES_CHECKPOINTS.map((cp) =>
          taseesPct >= cp.pct && !stageReviews[cp.key]
            ? <ReviewBanner key={cp.key} label={cp.label} onDismiss={() => updReviews({ [cp.key]: true })} />
            : null
        )}
        {taseesComplete && (
          <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, #10B981 10%, var(--surface))", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
            <span>✓</span>
            <span className="font-bold text-[19px]" style={{ color: "#10B981" }}>التأسيس مكتمل — انتقلت للتدريب</span>
          </div>
        )}
        <div className="grid grid-cols-2 desk-grid-3 gap-3">
          {track.subjects.map((s) => {
            const ls = lessonsOf(s.name);
            const dc = ls.filter((l) => doneSet.has(l.key)).length;
            const p  = ls.length === 0 ? 0 : Math.round((dc / ls.length) * 100);
            return (
              <button key={s.name} onClick={() => { setSelected(s.name); setDrillPhase("tasees"); }}
                className="rounded-2xl p-4 flex flex-col gap-3 text-right transition active:scale-[0.97]"
                style={{ background: "var(--surface2)", border: `2px solid ${s.color}44`, minHeight: "120px" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <p className="font-black text-sm text-[var(--text)]">{s.name}</p>
                </div>
                <div className="w-full">
                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full" style={{ width: p + "%", background: s.color }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{dc}/{ls.length}</span>
                    <span className="font-mono-nums font-black text-xs" style={{ color: s.color }}>{p}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PhaseSection>

      {/* ══ التدريب ══ */}
      <PhaseSection title="التدريب" num={2} pct={tadreebPct} complete={tadreebComplete}
        unlocked={tadreebUnlocked} color="#8B5CF6" accentText="#A78BFA"
        lockedMsg="يُفتح بعد إكمال التأسيس 100%"
        open={isPhaseOpen(2)} onToggle={() => togglePhase(2)}>
        {TADREEB_CHECKPOINTS.map((cp) =>
          tadreebPct >= cp.pct && !stageReviews[cp.key]
            ? <ReviewBanner key={cp.key} label={cp.label} onDismiss={() => updReviews({ [cp.key]: true })} />
            : null
        )}
        {tadreebComplete && (
          <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, #10B981 10%, var(--surface))", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
            <span>✓</span>
            <span className="font-bold text-[19px]" style={{ color: "#10B981" }}>التدريب مكتمل — انتقلت للتسريبات</span>
          </div>
        )}
        <div className="grid grid-cols-2 desk-grid-3 gap-3 mb-3">
          {track.subjects.map((s) => {
            const items = trainingOf(s.name);
            const dc = items.filter((t) => tadreebDoneSet.has(t.id)).length;
            const p  = items.length === 0 ? 0 : Math.round((dc / items.length) * 100);
            return (
              <button key={s.name} onClick={() => { setSelected(s.name); setDrillPhase("tadreeb"); }}
                className="rounded-2xl p-4 flex flex-col gap-3 text-right transition active:scale-[0.97]"
                style={{ background: "var(--surface2)", border: `2px solid ${s.color}44`, minHeight: "120px" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <p className="font-black text-sm text-[var(--text)]">{s.name}</p>
                </div>
                <div className="w-full">
                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full" style={{ width: p + "%", background: s.color }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{items.length === 0 ? "أضف +" : `${dc}/${items.length}`}</span>
                    <span className="font-mono-nums font-black text-xs" style={{ color: s.color }}>{p}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {allTraining.length === 0 && !examFlow.skippedTadreeb && (
          <button onClick={() => updFlow({ skippedTadreeb: true })}
            className="w-full py-3 rounded-2xl font-bold text-[19px] min-h-[44px]"
            style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
            تخطي التدريب والانتقال للتسريبات
          </button>
        )}
      </PhaseSection>

      {/* ══ التسريبات ══ */}
      <PhaseSection title="التسريبات" num={3} pct={displayTasreebatPct}
        complete={displayTasreebatPct === 100}
        unlocked={tasreebatUnlocked} color="var(--gold)" accentText="var(--gold-light)"
        lockedMsg="يُفتح بعد إكمال التدريب 100%"
        open={isPhaseOpen(3)} onToggle={() => togglePhase(3)}>

        {/* مخطّط التسريبات: ملف PDF ← صفحات/يوم */}
        {!examPast && (
          <LeaksPlanner color="var(--gold)" daysLeft={examDate ? daysLeftOf(examDate) : null} />
        )}

        {/* تتبع الأوراق */}
        {!examPast && (
          <div className="mb-4">
            <p className="text-[19px] mb-3" style={{ color: "var(--text-muted)" }}>
              سجّل تقدمك في حل الاختبارات السابقة (0–99%)
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setTasreebat(tasreebatPct - 5)}
                className="w-11 h-11 rounded-xl font-black text-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>−</button>
              <div className="flex-1">
                <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: tasreebatPct + "%", background: "var(--gold)" }} />
                </div>
                <p className="text-center font-mono-nums font-black text-lg" style={{ color: "var(--gold)" }}>{tasreebatPct}%</p>
              </div>
              <button onClick={() => setTasreebat(tasreebatPct + 5)}
                className="w-11 h-11 rounded-xl font-black text-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>+</button>
            </div>
            <p className="text-[19px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
              الـ 1% الأخير يكتمل بإدخال درجتك بعد الاختبار
            </p>
          </div>
        )}

        {/* إدخال الدرجة */}
        {examPast && !hasGrade && !skipped && (
          <div className="rounded-2xl p-5 mb-3"
            style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)" }}>
            <p className="font-black text-[19px] mb-1" style={{ color: "var(--gold)" }}>يوم الاختبار وصل!</p>
            <p className="text-[19px] mb-4" style={{ color: "var(--text-muted)" }}>أدخل درجتك لتكمل الـ 1% الأخير</p>
            <div className="flex gap-2 mb-3">
              <input type="number" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)}
                placeholder="الدرجة..." className="flex-1 rounded-xl px-4 py-3 text-[19px] font-bold outline-none min-h-[48px]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              <button
                onClick={() => {
                  const g = parseFloat(gradeInput);
                  if (!isNaN(g)) {
                    updFlow({ grade: g });
                    /* سجّل النتيجة في «نتائجي» تلقائياً */
                    const examName = primaryTrack?.title ?? "اختبار";
                    const prev = loadResults();
                    saveResults([
                      { id: `${Date.now()}`, exam: examName,
                        score: String(g), date: loadExamDate() ?? new Date().toISOString().slice(0, 10) },
                      ...prev,
                    ]);
                    /* حدث الاختبار (لوحة الأدمن) — إدخال درجة يوم الاختبار */
                    trackEvent("exam_completed", { exam: examName, attemptNumber: prev.filter((r) => r.exam.trim() === examName).length + 1 });
                    setShowNextStep(true);
                  }
                }}
                disabled={!gradeInput.trim() || isNaN(parseFloat(gradeInput))}
                className="px-5 rounded-xl font-black text-[19px] min-h-[48px]"
                style={{ background: "var(--gold)", color: "#1a1200", border: "none" }}>سجّل</button>
            </div>
            <button onClick={() => { updFlow({ skippedGrade: true }); setShowNextStep(true); }}
              className="w-full py-2.5 rounded-xl text-[19px] font-bold"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              ما أبي أقولها
            </button>
            <p className="text-[19px] mt-1.5 text-center" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              لا يُفضَّل هذا — اكتب درجتك الحقيقية لتستفيد من التوصيات
            </p>
          </div>
        )}

        {/* الخطة المحفوظة */}
        {gradeOrSkipped && examFlow.plan && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            <div className="flex-1">
              <p className="font-bold text-[19px]" style={{ color: "var(--text)" }}>الخطة المختارة</p>
              <p className="text-[19px]" style={{ color: "var(--text-muted)" }}>
                {examFlow.plan === "cpc"           && "مسار CPC — أرامكو"}
                {examFlow.plan === "qudrat"         && "اختبار القدرات"}
                {examFlow.plan === "other"          && "مادة جديدة"}
                {examFlow.plan === "rest"           && "استراحة مستحقة"}
                {examFlow.plan === "from_tasees"    && "إعادة التأسيس"}
                {examFlow.plan === "from_tadreeb"   && "إعادة التدريب"}
                {examFlow.plan === "diagnostic"     && "اختبار تشخيصي"}
              </p>
            </div>
            <button onClick={() => setShowNextStep(true)}
              className="text-[var(--accent-light)] text-[19px] font-bold px-2 min-h-[44px]">
              تغيير
            </button>
          </div>
        )}
      </PhaseSection>
      </>)}

      {/* تقويم الشهر + جدول اليوم — ملاصقان بدون فاصل */}
      <div className="px-5 mt-2 rise rise-4">
        <p className="eyebrow mb-3 px-1">تقويم الشهر</p>
        <Calendar
          flushBottom
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onDayClick={(date) => { setSchedTab("manual"); setSchedulerDate(date); }}
          getDayInfo={(date) =>
            getEventsForDate(date, events).map((ev) => ({
              id: ev.id,
              label: ev.type === "study" ? (ev.subject ?? "مذاكرة") : (ev.label ?? "مشغول"),
              color: ev.type === "study"
                ? (ev.subject ? subjectColor(track, ev.subject) : "var(--accent-light)")
                : "var(--danger)",
              from: ev.fromHour,
              to: ev.toHour,
            }))
          }
        />

        {/* جدول اليوم — ملاصق للتقويم بدون فاصل */}
        {(() => {
          const todayEvents = getEventsForDate(todayStr, events);
          return (
            <section className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="title-md" style={{ color: "var(--text)" }}>جدول اليوم</p>
              </div>

              {/* بانر «الآن/القادمة» — يبيّن وقتك الحالي وكم باقٍ ويبدأ أوربت بالمادة تلقائياً */}
              {(() => {
                const study = todayEvents.filter((e) => e.type === "study").sort((a, b) => a.fromHour - b.fromHour);
                if (study.length === 0) return null;
                const now = new Date();
                const nowH = now.getHours() + now.getMinutes() / 60;
                const current = study.find((e) => nowH >= e.fromHour && nowH < e.toHour);
                const next = study.find((e) => e.fromHour > nowH);
                if (!current && !next) {
                  return (
                    <div className="rounded-2xl px-4 py-3 mb-3 text-center"
                      style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}>
                      <p className="text-[17px] font-black" style={{ color: "var(--success)" }}>خلّصت جدول اليوم 🎉</p>
                    </div>
                  );
                }
                const subj = current?.subject ?? next?.subject;
                const c = subj ? subjectColor(track, subj) : "var(--accent-light)";
                let line1 = "";
                if (current) {
                  line1 = `الآن — حتى ${fmtHour(current.toHour)}`;
                } else if (next) {
                  const m = Math.max(1, Math.round((next.fromHour - nowH) * 60));
                  const when = m >= 60 ? `بعد ${Math.floor(m / 60)} ساعة${m % 60 ? ` و${m % 60} د` : ""}` : `بعد ${m} دقيقة`;
                  line1 = `القادمة ${when} — ${fmtHour(next.fromHour)}`;
                }
                return (
                  <div className="rounded-2xl px-4 py-3 mb-3 flex items-center gap-3"
                    style={{ background: `color-mix(in srgb, ${c} 12%, var(--surface2))`, border: `1px solid ${c}44` }}>
                    <span className="text-[25px]">{current ? "▶️" : "⏭️"}</span>
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>{line1}</p>
                      <p className="text-[18px] font-black truncate" style={{ color: c }}>{subj ?? "مذاكرة"}</p>
                    </div>
                    <Link href={`/orbit?subject=${encodeURIComponent(subj ?? "")}`}
                      className="text-[15px] font-black px-3 py-2 rounded-xl flex-shrink-0"
                      style={{ background: c, color: "#fff", textDecoration: "none" }}>
                      ابدأ أوربت ←
                    </Link>
                  </div>
                );
              })()}

              {/* التفاصيل تظهر بالتعديل فقط — هنا ملخّص بسيط لا يزحم الطالب */}
              {todayEvents.length === 0 ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl py-5"
                  style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", minHeight: "56px" }}>
                  <span className="text-[17px] font-bold" style={{ color: "var(--text-muted)" }}>
                    لا يوجد جدول اليوم — اضغط «مساعد دويرب» تحت
                  </span>
                </div>
              ) : (
                <button onClick={() => { setSchedTab("manual"); setSchedulerDate(todayStr); }}
                  className="w-full flex items-center justify-between gap-2 rounded-2xl px-4 py-3 transition active:scale-[0.99]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <span className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                    {todayEvents.filter((e) => e.type === "study").length} جلسة اليوم
                  </span>
                  <span className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>عرض وتعديل ←</span>
                </button>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setSchedTab("manual"); setSchedulerDate(todayStr); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-[19px]"
                  style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                  يدوي
                </button>
                <button onClick={() => { setSchedTab("ai"); setSchedulerDate(todayStr); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-[19px]"
                  style={{ background: "var(--accent)", color: "white", border: "none" }}>
                  مساعد دويرب
                </button>
              </div>
            </section>
          );
        })()}
      </div>

      <div className="h-6" />
      <PageFooter />
      </div>

      {/* لوحة تفاصيل المادة الجانبية (سطح المكتب فقط) */}
      {isWide && (
        <aside className="rm-detail">
          {selected && drillPhase ? (
            <>
              <div className="rm-detail-head">
                <span className="font-black text-[17px] flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{selected}</span>
                <span className="num-hero text-[15px]" style={{ color: "var(--text-muted)" }}>{detailCount()}</span>
                <button onClick={() => setSelected(null)} className="rm-detail-close" aria-label="إغلاق التفاصيل">✕</button>
              </div>
              <div className="rm-detail-scroll">{renderDetailBody()}</div>
            </>
          ) : (
            <div className="rm-detail-empty">
              <span className="text-[38px]">🗺️</span>
              <p className="font-bold text-[17px] mt-3" style={{ color: "var(--text)" }}>اختر مادة لعرض دروسها</p>
              <p className="text-[15px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                اضغط أي مادة من المراحل على اليمين لتتابع دروسها وتمارينها هنا.
              </p>
            </div>
          )}
        </aside>
      )}
      </div>

      {/* DayScheduler */}
      {schedulerDate && (
        <DayScheduler
          date={schedulerDate}
          events={events}
          subjects={track.subjects}
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onEventsChange={(updated) => { setEvents(updated); saveEvents(updated); }}
          onClose={() => setSchedulerDate(null)}
          initialTab={schedTab}
        />
      )}

      {/* NextStep Overlay */}
      {(showNextStep || shouldAutoOpenNextStep) && (
        <NextStepOverlay
          grade={examFlow.grade}
          skipped={skipped}
          currentPlan={examFlow.plan}
          canDismiss={!!examFlow.plan}
          examTitle={primaryTrack?.title ?? "الاختبار"}
          stats={(() => {
            const s = loadStats();
            const h = s.totalFocusMins < 60 ? `${s.totalFocusMins}د` : (s.totalFocusMins / 60).toFixed(1).replace(/\.0$/, "");
            return { days: s.sessionDays.length, hours: h, sessions: s.sessionsCount };
          })()}
          onPick={(plan) => {
            updFlow({ plan });
            switchTrack(plan);
            setShowNextStep(false);
          }}
          onResetTasees={resetTasees}
          onResetTadreeb={resetTadreeb}
          onClose={() => setShowNextStep(false)}
        />
      )}
    </div>
  );
}
