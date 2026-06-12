"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";
import { getTrack, subjectColor, subjectIcon, type Track } from "@/lib/tracks";
import {
  loadUser, loadList, saveList, loadExamDate, saveExamDate,
  loadEvents, saveEvents, loadExamFlow, saveExamFlow, loadStageReviews, saveStageReviews,
  type ScheduleEvent, type ExamFlow, type StageReviews,
} from "@/lib/storage";
import Calendar from "@/components/Calendar";
import DayScheduler, { getEventsForDate } from "@/components/DayScheduler";

interface CustomLesson {
  id: string;
  subject: string;
  title: string;
}

const DONE_KEY = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";

type TahsiliSubject = keyof typeof RAKAN_SCHEDULE;

const TAHSILI_TOTALS: Record<TahsiliSubject, { hours: number; pages: string }> = {
  فيزياء: { hours: 30, pages: "8-90" },
  رياضيات: { hours: 42, pages: "92-157" },
  كيمياء: { hours: 30, pages: "180-263" },
  أحياء: { hours: 37, pages: "266-353" },
};

const STAGE_THRESHOLDS = [
  { key: "التأسيس" as const, pct: 25, label: "أكملت مرحلة التأسيس 🏁", sub: "وقت مراجعة سريعة قبل الانتقال" },
  { key: "التدريب" as const, pct: 50, label: "أكملت مرحلة التدريب 📚", sub: "جهّز التسريبات والمراجعة النهائية" },
  { key: "التعزيز" as const, pct: 75, label: "أكملت مرحلة التعزيز 🌟", sub: "المراجعة النهائية قبل الاختبار" },
];

export default function RoadmapPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [custom, setCustom] = useState<CustomLesson[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState("");
  const [examDate, setExamDate] = useState<string | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<string | null>(null);
  const [examFlow, setExamFlow] = useState<ExamFlow>({});
  const [stageReviews, setStageReviews] = useState<StageReviews>({});
  const [gradeInput, setGradeInput] = useState("");

  useEffect(() => {
    setTrack(getTrack(loadUser()?.track));
    setDone(loadList<string>(DONE_KEY));
    setCustom(loadList<CustomLesson>(CUSTOM_KEY));
    setExamDate(loadExamDate());
    setEvents(loadEvents());
    setExamFlow(loadExamFlow());
    setStageReviews(loadStageReviews());
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveList(DONE_KEY, done); }, [done, loaded]);
  useEffect(() => { if (loaded) saveList(CUSTOM_KEY, custom); }, [custom, loaded]);

  if (!track) return <div className="min-h-dvh" />;

  const isTahsili = track.id === "تحصيلي";
  const doneSet = new Set(done);

  const toggle = (key: string) =>
    setDone((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const lessonsOf = (subj: string): { key: string; title: string; meta?: string; diff?: string }[] => {
    if (isTahsili && subj in RAKAN_SCHEDULE) {
      return RAKAN_SCHEDULE[subj as TahsiliSubject].map((l) => ({
        key: `${subj}-${l.lesson}`,
        title: l.lesson,
        meta: `اليوم ${l.day} · ${l.hours} ساعة · ص ${l.pages}`,
        diff: l.difficulty,
      }));
    }
    return custom
      .filter((c) => c.subject === subj)
      .map((c) => ({ key: `custom-${c.id}`, title: c.title }));
  };

  const allLessons = track.subjects.flatMap((s) => lessonsOf(s.name));
  const totalDone = allLessons.filter((l) => doneSet.has(l.key)).length;
  const overallPct = allLessons.length === 0 ? 0 : Math.round((totalDone / allLessons.length) * 100);
  const currentStage =
    ROADMAP_STAGES.find((s) => overallPct >= s.range[0] && overallPct < s.range[1]) ??
    ROADMAP_STAGES[ROADMAP_STAGES.length - 1];

  const todayStr = new Date().toISOString().slice(0, 10);
  const examPast = examDate !== null && examDate <= todayStr;
  const hasGrade = examFlow.grade !== undefined;
  const skipped = examFlow.skippedGrade === true;

  // displayPct: 99 if exam passed with no grade, 100 if grade entered
  const displayPct = examPast
    ? hasGrade ? 100 : 99
    : overallPct;

  const updateExamFlow = (patch: Partial<ExamFlow>) => {
    const updated = { ...examFlow, ...patch };
    setExamFlow(updated);
    saveExamFlow(updated);
  };

  const updateStageReviews = (patch: Partial<StageReviews>) => {
    const updated = { ...stageReviews, ...patch };
    setStageReviews(updated);
    saveStageReviews(updated);
  };

  const OverallBar = () => (
    <div className="px-5 mb-6">
      <div className="rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg,color-mix(in srgb, var(--accent) 15%, transparent),color-mix(in srgb, var(--accent) 5%, transparent)), var(--surface)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] mb-1">التقدم الكلي — {track.title}</p>
            <p className="text-xl font-black text-[var(--text)]">
              {examPast && hasGrade
                ? "✅ اكتمل المشوار"
                : examPast
                ? "🎓 يوم الاختبار"
                : `${currentStage.icon} مرحلة ${currentStage.name}`}
            </p>
          </div>
          <p className="font-mono-nums font-black text-5xl text-[var(--accent-light)]">{displayPct}%</p>
        </div>
        <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: displayPct + "%",
              background: hasGrade
                ? "linear-gradient(90deg, var(--gold), var(--gold-light))"
                : "linear-gradient(90deg,var(--accent-2),var(--accent-light))",
            }} />
        </div>
        <div className="flex justify-between">
          {ROADMAP_STAGES.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <span className="text-base">{s.icon}</span>
              <span className={`text-xs font-bold ${s.id === currentStage.id ? "text-[var(--accent-light)]" : "text-[var(--text-muted)]"}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-3 text-center">
          {allLessons.length === 0
            ? "أضف دروسك وابدأ التتبع"
            : `${totalDone} درس منجز من أصل ${allLessons.length}`}
        </p>
      </div>
    </div>
  );

  /* ══════ واجهة دروس المادة المختارة ══════ */
  if (selected) {
    const color = subjectColor(track, selected);
    const lessons = lessonsOf(selected);
    const doneCount = lessons.filter((l) => doneSet.has(l.key)).length;
    const pct = lessons.length === 0 ? 0 : Math.round((doneCount / lessons.length) * 100);
    const totals = isTahsili ? TAHSILI_TOTALS[selected as TahsiliSubject] : null;

    const addCustom = () => {
      if (!newLesson.trim()) return;
      setCustom((p) => [...p, { id: Date.now().toString(), subject: selected, title: newLesson.trim() }]);
      setNewLesson("");
    };

    return (
      <div className="min-h-dvh pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)}
              className="dome-chip text-[14px] font-bold" style={{ color: "var(--text)" }}>← رجوع</button>
            <h1 className="title-lg" style={{ color: "var(--text)" }}>{selected}</h1>
            <span className="dome-chip num-hero text-[14px]" style={{ color: "var(--text)" }}>{doneCount}/{lessons.length}</span>
          </div>
        </Dome>
        <div className="h-5" />

        <OverallBar />

        <div className="px-5 mb-6 rise rise-1">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: `1.5px solid ${color}`, boxShadow: `0 0 14px ${color}25` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-base text-[var(--text)]">تقدم {selected}</p>
              <span className="font-mono-nums font-black text-2xl" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: pct + "%", background: color }} />
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
            <input
              value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder={`درس جديد في ${selected}...`}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[54px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            />
            <button onClick={addCustom}
              className="px-6 rounded-2xl font-black text-lg min-h-[54px]"
              style={{ background: "transparent", border: `1.5px solid ${color}`, color: color }}>
              +
            </button>
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
            const diffColor = lesson.diff === "سهل" ? "#10B981"
              : lesson.diff === "متوسط" ? "#F59E0B" : "#EF4444";

            return (
              <div key={lesson.key}
                className="rounded-2xl p-5 cursor-pointer transition active:scale-[0.98]"
                style={{
                  background: isDone ? color + "10" : "var(--surface)",
                  border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}`,
                  minHeight: "76px",
                }}
                onClick={() => toggle(lesson.key)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                    {isDone && <span className="text-white text-lg font-black">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-base leading-snug ${isDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                      {lesson.title}
                    </p>
                    {lesson.meta && (
                      <p className="text-sm text-[var(--text-muted)] mt-1.5">{lesson.meta}</p>
                    )}
                  </div>

                  {lesson.diff && (
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: diffColor }}>
                      {lesson.diff}
                    </span>
                  )}
                  {!isTahsili && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustom((p) => p.filter((c) => `custom-${c.id}` !== lesson.key));
                        setDone((p) => p.filter((k) => k !== lesson.key));
                      }}
                      className="text-[var(--text-muted)] text-lg px-2 min-h-[44px]"
                      aria-label="حذف الدرس"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-6" />
        <BottomNav />
      </div>
    );
  }

  /* ══════ الواجهة الرئيسية ══════ */
  return (
    <div className="min-h-dvh pb-nav relative z-[1]">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>خريطة الطريق</h1>
          <span className="dome-chip text-[13px] font-bold" style={{ color: "var(--text-dim)" }}>{track.icon} {track.title}</span>
        </div>
      </Dome>
      <div className="h-5" />

      <OverallBar />

      {/* شبكة المواد */}
      <div className="px-5 grid grid-cols-2 gap-4 rise rise-1">
        {track.subjects.map((s) => {
          const lessons = lessonsOf(s.name);
          const doneCount = lessons.filter((l) => doneSet.has(l.key)).length;
          const pct = lessons.length === 0 ? 0 : Math.round((doneCount / lessons.length) * 100);

          return (
            <button key={s.name} onClick={() => setSelected(s.name)}
              className="rounded-3xl p-6 flex flex-col gap-4 text-right subject-card"
              style={{
                background: "var(--surface)",
                border: `2px solid ${s.color}55`,
                boxShadow: `0 0 14px ${s.color}18`,
                minHeight: "140px",
              }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0 subject-dot" style={{ background: s.color, boxShadow: `0 0 7px ${s.color}99` }} />
                <p className="font-black text-base text-[var(--text)]">{s.name}</p>
              </div>

              <div>
                <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: pct + "%", background: s.color }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)] font-semibold">{doneCount}/{lessons.length} درس</span>
                  <span className="font-mono-nums font-black text-sm" style={{ color: s.color }}>{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ══ نقاط تفتيش المراحل ══ */}
      {STAGE_THRESHOLDS.map((st) => {
        if (overallPct < st.pct) return null;
        if (stageReviews[st.key]) return null;
        return (
          <div key={st.key} className="px-5 mt-4 rise rise-2">
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: "color-mix(in srgb, var(--accent) 12%, var(--surface))",
                border: "1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              }}>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[14px]" style={{ color: "var(--text)" }}>{st.label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{st.sub}</p>
              </div>
              <button
                onClick={() => updateStageReviews({ [st.key]: true })}
                className="px-4 py-2.5 rounded-xl font-bold text-[13px] min-h-[44px] flex-shrink-0"
                style={{ background: "var(--accent)", color: "white", border: "none" }}
              >
                تمت ✓
              </button>
            </div>
          </div>
        );
      })}

      {/* ══ يوم الاختبار — إدخال الدرجة ══ */}
      {examPast && !hasGrade && !skipped && (
        <div className="px-5 mt-4 rise rise-3">
          <div className="rounded-2xl p-5"
            style={{
              background: "color-mix(in srgb, var(--gold) 10%, var(--surface))",
              border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            }}>
            <p className="font-black text-[16px] mb-1" style={{ color: "var(--gold)" }}>🎓 يوم الاختبار وصل!</p>
            <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>كيف كانت نتيجتك؟</p>

            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                placeholder="الدرجة..."
                className="flex-1 rounded-xl px-4 py-3 text-[15px] font-bold outline-none min-h-[48px]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
              />
              <button
                onClick={() => {
                  const g = parseFloat(gradeInput);
                  if (!isNaN(g)) updateExamFlow({ grade: g });
                }}
                disabled={!gradeInput.trim() || isNaN(parseFloat(gradeInput))}
                className="px-5 rounded-xl font-black text-[14px] min-h-[48px]"
                style={{ background: "var(--gold)", color: "#1a1200", border: "none" }}
              >
                سجّل
              </button>
            </div>

            <button
              onClick={() => updateExamFlow({ skippedGrade: true })}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}
            >
              ما أبي أقولها
            </button>
            <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              لا يُفضَّل هذا — اكتب درجتك الحقيقية لتستفيد من التوصيات
            </p>
          </div>
        </div>
      )}

      {/* ══ بعد الدرجة — "أعجبتك؟" ══ */}
      {examPast && hasGrade && examFlow.happy === undefined && (
        <div className="px-5 mt-4 rise rise-3">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <p className="font-black text-[16px] mb-1" style={{ color: "var(--text)" }}>
              درجتك: <span style={{ color: "var(--gold)" }}>{examFlow.grade}</span>
            </p>
            <p className="text-[14px] mb-4" style={{ color: "var(--text-muted)" }}>أعجبتك الدرجة؟</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateExamFlow({ happy: true })}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] min-h-[48px]"
                style={{ background: "var(--success)", color: "white", border: "none", opacity: 0.9 }}
              >
                نعم 🎉
              </button>
              <button
                onClick={() => updateExamFlow({ happy: false })}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] min-h-[48px]"
                style={{ background: "transparent", border: "1.5px solid var(--danger)", color: "var(--danger)" }}
              >
                لا 😔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ راضٍ عن درجته ══ */}
      {examPast && hasGrade && examFlow.happy === true && examFlow.plan === undefined && (
        <div className="px-5 mt-4 rise rise-3">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--success) 40%, transparent)" }}>
            <p className="font-black text-[15px] mb-3" style={{ color: "var(--success)" }}>ممتاز! ماذا تريد بعدها؟</p>
            <div className="flex flex-col gap-2">
              {[
                { id: "cpc", label: "🏭 مسار CPC — أرامكو" },
                { id: "qudrat", label: "🧠 اختبار القدرات" },
                { id: "other", label: "📖 مادة أخرى / تخصص جديد" },
                { id: "rest", label: "😴 أخذ استراحة مستحقة" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateExamFlow({ plan: opt.id })}
                  className="w-full py-3 rounded-xl font-bold text-[13px] min-h-[48px] text-right px-4"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ غير راضٍ عن درجته ══ */}
      {examPast && hasGrade && examFlow.happy === false && examFlow.plan === undefined && (
        <div className="px-5 mt-4 rise rise-3">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--danger) 35%, transparent)" }}>
            <p className="font-black text-[15px] mb-1" style={{ color: "var(--danger)" }}>لا بأس — كل إعادة فرصة</p>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>من أين تبدأ المراجعة؟</p>
            <div className="flex flex-col gap-2">
              {[
                { id: "from_tasees", label: "🔄 من التأسيس — إعادة البناء" },
                { id: "from_tadreeb", label: "⚡ من التدريب — تعمّق في التمارين" },
                { id: "diagnostic", label: "🔍 اختبار تشخيصي — أحدد النقص" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateExamFlow({ plan: opt.id })}
                  className="w-full py-3 rounded-xl font-bold text-[13px] min-h-[48px] text-right px-4"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ بعد اختيار الخطة ══ */}
      {examPast && hasGrade && examFlow.plan !== undefined && (
        <div className="px-5 mt-4 rise rise-3">
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-bold text-[14px]" style={{ color: "var(--text)" }}>الخطة محفوظة</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {examFlow.plan === "cpc" && "CPC — أرامكو"}
                {examFlow.plan === "qudrat" && "اختبار القدرات"}
                {examFlow.plan === "other" && "مادة جديدة"}
                {examFlow.plan === "rest" && "استراحة مستحقة"}
                {examFlow.plan === "from_tasees" && "إعادة من التأسيس"}
                {examFlow.plan === "from_tadreeb" && "من التدريب"}
                {examFlow.plan === "diagnostic" && "اختبار تشخيصي"}
              </p>
            </div>
            <button
              onClick={() => updateExamFlow({ plan: undefined })}
              className="text-[var(--text-muted)] text-sm px-2 min-h-[44px]"
            >
              تغيير
            </button>
          </div>
        </div>
      )}

      {/* تقويم الشهر */}
      <div className="px-5 mt-6 rise rise-4">
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
