"use client";
import { useState, useEffect, type ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { RAKAN_SCHEDULE } from "@/lib/constants";
import { getTrack, subjectColor, type Track } from "@/lib/tracks";
import {
  loadUser, loadList, saveList, loadExamDate, saveExamDate,
  loadEvents, saveEvents, loadExamFlow, saveExamFlow,
  loadStageReviews, saveStageReviews,
  loadTadreebItems, saveTadreebItems, loadTadreebDone, saveTadreebDone,
  loadTasreebatPct, saveTasreebatPct,
  type ScheduleEvent, type ExamFlow, type StageReviews, type TrainingItem,
} from "@/lib/storage";
import Calendar from "@/components/Calendar";
import DayScheduler from "@/components/DayScheduler";

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

const TASEES_CHECKPOINTS: { key: keyof StageReviews; pct: number; label: string }[] = [
  { key: "tasees25", pct: 25, label: "ربع التأسيس 🏁 — خذ 10 دقائق للمراجعة" },
  { key: "tasees50", pct: 50, label: "نصف التأسيس! 💪 — راجع قبل المتابعة" },
  { key: "tasees75", pct: 75, label: "ثلاثة أرباع التأسيس 🌟 — آخر ربع" },
];
const TADREEB_CHECKPOINTS: { key: keyof StageReviews; pct: number; label: string }[] = [
  { key: "tadreeb25", pct: 25, label: "ربع التدريب 🏁 — راجع حلولك" },
  { key: "tadreeb50", pct: 50, label: "نصف التدريب! 💪 — مرحلة ممتازة" },
  { key: "tadreeb75", pct: 75, label: "ثلاثة أرباع التدريب 🌟 — اقتربت" },
];

/* ── مكوّنات مساعدة ── */
function ReviewBanner({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-3"
      style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 32%, transparent)" }}>
      <p className="flex-1 font-bold text-[13px]" style={{ color: "var(--text)" }}>{label}</p>
      <button onClick={onDismiss}
        className="px-3 py-2 rounded-xl font-bold text-[12px] min-h-[40px] flex-shrink-0"
        style={{ background: "var(--accent)", color: "white", border: "none" }}>
        تمت ✓
      </button>
    </div>
  );
}

function PhaseSection({
  title, num, pct, complete, unlocked, color, accentText, lockedMsg, children,
}: {
  title: string; num: number; pct: number; complete: boolean;
  unlocked: boolean; color: string; accentText: string;
  lockedMsg?: string; children?: ReactNode;
}) {
  return (
    <div className="px-5 mb-5">
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={complete
            ? { background: "#10B981", color: "white" }
            : unlocked
            ? { background: color, color: "white" }
            : { background: "var(--surface2)", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
          {complete ? "✓" : num}
        </div>
        <p className="font-black text-base flex-1" style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}>{title}</p>
        <span className="font-mono-nums font-black text-[15px]"
          style={{ color: unlocked ? accentText : "var(--text-muted)" }}>
          {unlocked ? `${pct}%` : "🔒"}
        </span>
      </div>
      <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: (unlocked ? pct : 0) + "%", background: color }} />
      </div>
      {!unlocked ? (
        <div className="rounded-2xl py-5 flex items-center justify-center"
          style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
          <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>🔒 {lockedMsg}</span>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════ */
export default function RoadmapPage() {
  const [track, setTrack]           = useState<Track | null>(null);
  const [done, setDone]             = useState<string[]>([]);
  const [custom, setCustom]         = useState<CustomLesson[]>([]);
  const [loaded, setLoaded]         = useState(false);

  const [selected, setSelected]     = useState<string | null>(null);
  const [drillPhase, setDrillPhase] = useState<"tasees" | "tadreeb">("tasees");
  const [newLesson, setNewLesson]   = useState("");
  const [newTraining, setNewTraining] = useState("");

  const [examDate, setExamDate]         = useState<string | null>(null);
  const [events, setEvents]             = useState<ScheduleEvent[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<string | null>(null);

  const [examFlow, setExamFlow]         = useState<ExamFlow>({});
  const [stageReviews, setStageReviews] = useState<StageReviews>({});
  const [gradeInput, setGradeInput]     = useState("");

  const [tadreebItems, setTadreebItems] = useState<TrainingItem[]>([]);
  const [tadreebDone, setTadreebDone]   = useState<string[]>([]);
  const [tasreebatPct, setTasreebatPct] = useState(0);

  useEffect(() => {
    setTrack(getTrack(loadUser()?.track));
    setDone(loadList<string>(DONE_KEY));
    setCustom(loadList<CustomLesson>(CUSTOM_KEY));
    setExamDate(loadExamDate());
    setEvents(loadEvents());
    setExamFlow(loadExamFlow());
    setStageReviews(loadStageReviews());
    setTadreebItems(loadTadreebItems());
    setTadreebDone(loadTadreebDone());
    setTasreebatPct(loadTasreebatPct());
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveList(DONE_KEY, done); }, [done, loaded]);
  useEffect(() => { if (loaded) saveList(CUSTOM_KEY, custom); }, [custom, loaded]);
  useEffect(() => { if (loaded) saveTadreebItems(tadreebItems); }, [tadreebItems, loaded]);
  useEffect(() => { if (loaded) saveTadreebDone(tadreebDone); }, [tadreebDone, loaded]);

  if (!track) return <div className="min-h-dvh" />;

  const isTahsili = track.id === "تحصيلي";
  const doneSet = new Set(done);
  const tadreebDoneSet = new Set(tadreebDone);

  const lessonsOf = (subj: string): { key: string; title: string; meta?: string; diff?: string }[] => {
    if (isTahsili && subj in RAKAN_SCHEDULE) {
      return RAKAN_SCHEDULE[subj as TahsiliSubject].map((l) => ({
        key: `${subj}-${l.lesson}`, title: l.lesson,
        meta: `اليوم ${l.day} · ${l.hours} ساعة · ص ${l.pages}`, diff: l.difficulty,
      }));
    }
    return custom.filter((c) => c.subject === subj)
      .map((c) => ({ key: `custom-${c.id}`, title: c.title }));
  };

  const trainingOf = (subj: string) =>
    tadreebItems.filter((t) => t.subject === subj);

  /* ── حسابات التقدم ── */
  const allLessons     = track.subjects.flatMap((s) => lessonsOf(s.name));
  const taseesDone     = allLessons.filter((l) => doneSet.has(l.key)).length;
  const taseesPct      = allLessons.length === 0 ? 0 : Math.round((taseesDone / allLessons.length) * 100);
  const taseesComplete = taseesPct === 100;

  const allTraining    = track.subjects.flatMap((s) => trainingOf(s.name));
  const tadreebDoneCount = allTraining.filter((t) => tadreebDoneSet.has(t.id)).length;
  const tadreebPct     = allTraining.length === 0 ? 0 : Math.round((tadreebDoneCount / allTraining.length) * 100);
  const tadreebUnlocked = taseesComplete;
  const tadreebComplete = tadreebUnlocked && (
    examFlow.skippedTadreeb === true ||
    (allTraining.length > 0 && tadreebPct === 100)
  );

  const tasreebatUnlocked = tadreebComplete;
  const todayStr  = new Date().toISOString().slice(0, 10);
  const examPast  = examDate !== null && examDate <= todayStr;
  const hasGrade  = examFlow.grade !== undefined;

  const displayTasreebatPct = examPast && hasGrade ? 100 : tasreebatPct;

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

  /* ══ Drill-down: التأسيس ══ */
  if (selected && drillPhase === "tasees") {
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
      <div className="min-h-dvh pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="dome-chip text-[14px] font-bold" style={{ color: "var(--text)" }}>← رجوع</button>
            <h1 className="title-lg" style={{ color: "var(--text)" }}>{selected}</h1>
            <span className="dome-chip num-hero text-[14px]" style={{ color: "var(--text)" }}>{dc}/{lessons.length}</span>
          </div>
        </Dome>
        <div className="h-5" />

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
              {totals && <span className="text-sm text-[var(--text-muted)]">{totals.hours} ساعة</span>}
              {totals && <span className="text-sm text-[var(--text-muted)]">ص {totals.pages}</span>}
            </div>
          </div>
        </div>

        {!isTahsili && (
          <div className="px-5 mb-6 flex gap-2.5">
            <input value={newLesson} onChange={(e) => setNewLesson(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder={`درس جديد في ${selected}...`}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[54px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
            <button onClick={addCustom} className="px-6 rounded-2xl font-black text-lg min-h-[54px]"
              style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
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
        <div className="h-6" /><BottomNav />
      </div>
    );
  }

  /* ══ Drill-down: التدريب ══ */
  if (selected && drillPhase === "tadreeb") {
    const color = subjectColor(track, selected);
    const items = trainingOf(selected);
    const dc    = items.filter((t) => tadreebDoneSet.has(t.id)).length;
    const pct   = items.length === 0 ? 0 : Math.round((dc / items.length) * 100);

    const addTraining = () => {
      if (!newTraining.trim()) return;
      setTadreebItems((p) => [...p, { id: Date.now().toString() + Math.random().toString(36).slice(2), subject: selected, title: newTraining.trim() }]);
      setNewTraining("");
    };
    const toggleTraining = (id: string) =>
      setTadreebDone((p) => p.includes(id) ? p.filter((k) => k !== id) : [...p, id]);

    return (
      <div className="min-h-dvh pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="dome-chip text-[14px] font-bold" style={{ color: "var(--text)" }}>← رجوع</button>
            <h1 className="title-lg" style={{ color: "var(--text)" }}>{selected}</h1>
            <span className="dome-chip num-hero text-[14px]" style={{ color: "var(--text)" }}>{dc}/{items.length}</span>
          </div>
        </Dome>
        <div className="h-5" />

        <div className="px-5 mb-5 rise rise-1">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: `1.5px solid ${color}55` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-base text-[var(--text)]">التدريب — {selected}</p>
              <span className="font-mono-nums font-black text-2xl" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", background: color }} />
            </div>
          </div>
        </div>

        <div className="px-5 mb-6 flex gap-2.5">
          <input value={newTraining} onChange={(e) => setNewTraining(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTraining()}
            placeholder={`تمرين جديد في ${selected}...`}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[54px]"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
          <button onClick={addTraining} className="px-6 rounded-2xl font-black text-lg min-h-[54px]"
            style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
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
              <div key={item.id} onClick={() => toggleTraining(item.id)}
                className="rounded-2xl p-5 cursor-pointer transition active:scale-[0.98]"
                style={{ background: isDone ? color + "10" : "var(--surface)", border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}`, minHeight: "68px" }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                    {isDone && <span className="text-white text-lg font-black">✓</span>}
                  </div>
                  <p className={`flex-1 font-black text-base leading-snug ${isDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{item.title}</p>
                  <button onClick={(e) => { e.stopPropagation(); setTadreebItems((p) => p.filter((t) => t.id !== item.id)); setTadreebDone((p) => p.filter((k) => k !== item.id)); }}
                    className="text-[var(--text-muted)] text-lg px-2 min-h-[44px]" aria-label="حذف">✕</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-6" /><BottomNav />
      </div>
    );
  }

  /* ══ الصفحة الرئيسية ══ */
  return (
    <div className="min-h-dvh pb-nav relative z-[1]">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>خريطة الطريق</h1>
          <span className="dome-chip text-[13px] font-bold" style={{ color: "var(--text-dim)" }}>{track.icon} {track.title}</span>
        </div>
      </Dome>
      <div className="h-5" />

      {/* ══ المرحلة 1: التأسيس ══ */}
      <PhaseSection title="التأسيس" num={1} pct={taseesPct} complete={taseesComplete}
        unlocked={true} color="var(--accent)" accentText="var(--accent-light)">

        {TASEES_CHECKPOINTS.map((cp) =>
          taseesPct >= cp.pct && !stageReviews[cp.key]
            ? <ReviewBanner key={cp.key} label={cp.label} onDismiss={() => updReviews({ [cp.key]: true })} />
            : null
        )}

        {taseesComplete && (
          <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, #10B981 10%, var(--surface))", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
            <span>✅</span>
            <span className="font-bold text-[13px]" style={{ color: "#10B981" }}>التأسيس مكتمل — انتقلت للتدريب</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
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

      {/* ══ المرحلة 2: التدريب ══ */}
      <PhaseSection title="التدريب" num={2} pct={tadreebPct} complete={tadreebComplete}
        unlocked={tadreebUnlocked} color="#8B5CF6" accentText="#A78BFA"
        lockedMsg="يُفتح بعد إكمال التأسيس 100%">

        {TADREEB_CHECKPOINTS.map((cp) =>
          tadreebPct >= cp.pct && !stageReviews[cp.key]
            ? <ReviewBanner key={cp.key} label={cp.label} onDismiss={() => updReviews({ [cp.key]: true })} />
            : null
        )}

        {tadreebComplete && (
          <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, #10B981 10%, var(--surface))", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
            <span>✅</span>
            <span className="font-bold text-[13px]" style={{ color: "#10B981" }}>التدريب مكتمل — انتقلت للتسريبات</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
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

        {/* تخطي التدريب إذا ما فيه تمارين */}
        {allTraining.length === 0 && !examFlow.skippedTadreeb && (
          <button onClick={() => updFlow({ skippedTadreeb: true })}
            className="w-full py-3 rounded-2xl font-bold text-[13px] min-h-[44px]"
            style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
            تخطي التدريب والانتقال للتسريبات
          </button>
        )}
      </PhaseSection>

      {/* ══ المرحلة 3: التسريبات ══ */}
      <PhaseSection title="التسريبات" num={3} pct={displayTasreebatPct}
        complete={displayTasreebatPct === 100}
        unlocked={tasreebatUnlocked} color="var(--gold)" accentText="var(--gold-light)"
        lockedMsg="يُفتح بعد إكمال التدريب 100%">

        {/* تتبع التقدم في الأوراق */}
        {!examPast && (
          <div className="mb-4">
            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
              سجّل تقدمك في حل أوراق الاختبارات السابقة (0–99%)
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setTasreebat(tasreebatPct - 5)}
                className="w-11 h-11 rounded-xl font-black text-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>−</button>
              <div className="flex-1">
                <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: tasreebatPct + "%", background: "var(--gold)" }} />
                </div>
                <p className="text-center font-mono-nums font-black text-lg" style={{ color: "var(--gold)" }}>
                  {tasreebatPct}%
                </p>
              </div>
              <button onClick={() => setTasreebat(tasreebatPct + 5)}
                className="w-11 h-11 rounded-xl font-black text-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>+</button>
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
              الـ 1% الأخير يكتمل بإدخال درجتك بعد الاختبار
            </p>
          </div>
        )}

        {/* إدخال الدرجة */}
        {examPast && !hasGrade && !examFlow.skippedGrade && (
          <div className="rounded-2xl p-5 mb-3"
            style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)" }}>
            <p className="font-black text-[16px] mb-1" style={{ color: "var(--gold)" }}>🎓 يوم الاختبار وصل!</p>
            <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>أدخل درجتك لتكمل الـ 1% الأخير</p>
            <div className="flex gap-2 mb-3">
              <input type="number" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)}
                placeholder="الدرجة..." className="flex-1 rounded-xl px-4 py-3 text-[15px] font-bold outline-none min-h-[48px]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              <button onClick={() => { const g = parseFloat(gradeInput); if (!isNaN(g)) updFlow({ grade: g }); }}
                disabled={!gradeInput.trim() || isNaN(parseFloat(gradeInput))}
                className="px-5 rounded-xl font-black text-[14px] min-h-[48px]"
                style={{ background: "var(--gold)", color: "#1a1200", border: "none" }}>سجّل</button>
            </div>
            <button onClick={() => updFlow({ skippedGrade: true })}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              ما أبي أقولها
            </button>
            <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              لا يُفضَّل هذا — اكتب درجتك الحقيقية لتستفيد من التوصيات
            </p>
          </div>
        )}

        {/* أعجبتك الدرجة؟ */}
        {examPast && hasGrade && examFlow.happy === undefined && (
          <div className="rounded-2xl p-5 mb-3" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
            <p className="font-black text-[16px] mb-1" style={{ color: "var(--text)" }}>
              درجتك: <span style={{ color: "var(--gold)" }}>{examFlow.grade}</span>
            </p>
            <p className="text-[14px] mb-4" style={{ color: "var(--text-muted)" }}>أعجبتك الدرجة؟</p>
            <div className="flex gap-2">
              <button onClick={() => updFlow({ happy: true })}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] min-h-[48px]"
                style={{ background: "#10B981", color: "white", border: "none" }}>نعم 🎉</button>
              <button onClick={() => updFlow({ happy: false })}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] min-h-[48px]"
                style={{ background: "transparent", border: "1.5px solid var(--danger)", color: "var(--danger)" }}>لا 😔</button>
            </div>
          </div>
        )}

        {/* راضٍ */}
        {examPast && hasGrade && examFlow.happy === true && examFlow.plan === undefined && (
          <div className="rounded-2xl p-5 mb-3" style={{ background: "var(--surface2)", border: "1.5px solid color-mix(in srgb, #10B981 40%, transparent)" }}>
            <p className="font-black text-[15px] mb-3" style={{ color: "#10B981" }}>ممتاز! ماذا تريد بعدها؟</p>
            <div className="flex flex-col gap-2">
              {[
                { id: "cpc",     label: "🏭 مسار CPC — أرامكو" },
                { id: "qudrat",  label: "🧠 اختبار القدرات" },
                { id: "other",   label: "📖 مادة أخرى / تخصص جديد" },
                { id: "rest",    label: "😴 استراحة مستحقة" },
              ].map((opt) => (
                <button key={opt.id} onClick={() => updFlow({ plan: opt.id })}
                  className="w-full py-3 rounded-xl font-bold text-[13px] min-h-[48px] text-right px-4"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* غير راضٍ */}
        {examPast && hasGrade && examFlow.happy === false && examFlow.plan === undefined && (
          <div className="rounded-2xl p-5 mb-3" style={{ background: "var(--surface2)", border: "1.5px solid color-mix(in srgb, var(--danger) 35%, transparent)" }}>
            <p className="font-black text-[15px] mb-1" style={{ color: "var(--danger)" }}>لا بأس — كل إعادة فرصة</p>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>من أين تبدأ المراجعة؟</p>
            <div className="flex flex-col gap-2">
              {[
                { id: "from_tasees",  label: "🔄 من التأسيس — إعادة البناء" },
                { id: "from_tadreeb", label: "⚡ من التدريب — تعمّق في التمارين" },
                { id: "diagnostic",   label: "🔍 اختبار تشخيصي — أحدد النقص" },
              ].map((opt) => (
                <button key={opt.id} onClick={() => updFlow({ plan: opt.id })}
                  className="w-full py-3 rounded-xl font-bold text-[13px] min-h-[48px] text-right px-4"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* الخطة محفوظة */}
        {examPast && hasGrade && examFlow.plan !== undefined && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-bold text-[14px]" style={{ color: "var(--text)" }}>الخطة محفوظة</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {examFlow.plan === "cpc"          && "CPC — أرامكو"}
                {examFlow.plan === "qudrat"        && "اختبار القدرات"}
                {examFlow.plan === "other"         && "مادة جديدة"}
                {examFlow.plan === "rest"          && "استراحة مستحقة"}
                {examFlow.plan === "from_tasees"   && "إعادة من التأسيس"}
                {examFlow.plan === "from_tadreeb"  && "من التدريب"}
                {examFlow.plan === "diagnostic"    && "اختبار تشخيصي"}
              </p>
            </div>
            <button onClick={() => updFlow({ plan: undefined })}
              className="text-[var(--text-muted)] text-sm px-2 min-h-[44px]">تغيير</button>
          </div>
        )}
      </PhaseSection>

      {/* تقويم الشهر */}
      <div className="px-5 mt-2 rise rise-4">
        <p className="eyebrow mb-3 px-1">تقويم الشهر</p>
        <Calendar
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onDayClick={(date) => setSchedulerDate(date)}
        />
      </div>

      <div className="h-6" />
      <BottomNav />

      {schedulerDate && (
        <DayScheduler
          date={schedulerDate}
          events={events}
          subjects={track.subjects}
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onEventsChange={(updated) => { setEvents(updated); saveEvents(updated); }}
          onClose={() => setSchedulerDate(null)}
        />
      )}
    </div>
  );
}
