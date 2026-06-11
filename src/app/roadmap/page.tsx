"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";
import { getTrack, subjectColor, subjectIcon, type Track } from "@/lib/tracks";
import { loadUser, loadList, saveList } from "@/lib/storage";

/* درس مخصص يضيفه الطالب (لمسارات قدرات و CPC) */
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

export default function RoadmapPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [custom, setCustom] = useState<CustomLesson[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState("");

  useEffect(() => {
    setTrack(getTrack(loadUser()?.track));
    setDone(loadList<string>(DONE_KEY));
    setCustom(loadList<CustomLesson>(CUSTOM_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveList(DONE_KEY, done); }, [done, loaded]);
  useEffect(() => { if (loaded) saveList(CUSTOM_KEY, custom); }, [custom, loaded]);

  if (!track) return <div className="min-h-dvh" />;

  const isTahsili = track.id === "تحصيلي";
  const doneSet = new Set(done);

  const toggle = (key: string) =>
    setDone((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  /* ── دروس كل مادة حسب المسار ── */
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

  /* التقدم الكلي */
  const allLessons = track.subjects.flatMap((s) => lessonsOf(s.name));
  const totalDone = allLessons.filter((l) => doneSet.has(l.key)).length;
  const overallPct = allLessons.length === 0 ? 0 : Math.round((totalDone / allLessons.length) * 100);
  const currentStage =
    ROADMAP_STAGES.find((s) => overallPct >= s.range[0] && overallPct < s.range[1]) ??
    ROADMAP_STAGES[ROADMAP_STAGES.length - 1];

  const OverallBar = () => (
    <div className="px-5 mb-6">
      <div className="rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg,color-mix(in srgb, var(--accent) 15%, transparent),color-mix(in srgb, var(--accent) 5%, transparent)), var(--surface)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] mb-1">التقدم الكلي — {track.title}</p>
            <p className="text-xl font-black text-[var(--text)]">
              {currentStage.icon} مرحلة {currentStage.name}
            </p>
          </div>
          <p className="font-mono-nums font-black text-5xl text-[var(--accent-light)]">{overallPct}%</p>
        </div>
        <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: overallPct + "%", background: "linear-gradient(90deg,var(--accent-2),var(--accent-light))" }} />
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

        {/* تقدم المادة */}
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

        {/* إضافة درس — للمسارات غير التحصيلي */}
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

        {/* قائمة الدروس */}
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

  /* ══════ الواجهة الرئيسية — مواد المسار ══════ */
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 subject-dot" style={{ background: s.color, boxShadow: `0 0 7px ${s.color}99` }} />
                  <p className="font-black text-xl text-[var(--text)]">{s.name}</p>
                </div>
                <span className="font-mono-nums font-black text-xl flex-shrink-0" style={{ color: s.color }}>{pct}%</span>
              </div>

              <div>
                <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: pct + "%", background: s.color }} />
                </div>
                <span className="text-sm text-[var(--text-muted)] font-semibold">{doneCount}/{lessons.length} درس</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-6" />
      <BottomNav />
    </div>
  );
}
