"use client";
/* ─── فضاء المذاكرة داخل وحدة (Study) — التأسيس + التدريب على مواد الواصف ───
   مكوّن واحد يُشغّل رحلة أي وحدة study؛ يأخذ موادها من الواصف (لا Track). يحفظ
   الدروس/التمارين بالاسم في التخزين القائم (استمرارية بيانات كاملة). قابل لإعادة
   الاستخدام لكل وحدة/عضو دون نسخ صفحات. */
import { useState, useEffect } from "react";
import { RAKAN_SCHEDULE } from "@/lib/constants";
import {
  loadList, saveList, loadTadreebItems, saveTadreebItems, loadTadreebDone, saveTadreebDone,
  type TrainingItem,
} from "@/lib/storage";
import type { SubjectDef } from "@/lib/modules";
import SubjectSources from "@/components/roadmap/SubjectSources";
import dynamic from "next/dynamic";
const TopicExtractor = dynamic(() => import("@/components/TopicExtractor"), { ssr: false });

interface CustomLesson { id: string; subject: string; title: string; }
const DONE_KEY = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";
type TahsiliSubject = keyof typeof RAKAN_SCHEDULE;
const hasPreset = (subj: string): subj is TahsiliSubject => subj in RAKAN_SCHEDULE;

/* دروس مادةٍ ما: تحصيلية (جدول رَكان) أو مضافة يدوياً */
function lessonsOf(subj: string, custom: CustomLesson[]): { key: string; title: string; meta?: string; diff?: string }[] {
  if (hasPreset(subj)) {
    return RAKAN_SCHEDULE[subj].map((l) => ({
      key: `${subj}-${l.lesson}`, title: l.lesson,
      meta: `اليوم ${l.day} · ${l.hours} ساعة · ص ${l.pages}`, diff: l.difficulty,
    }));
  }
  return custom.filter((c) => c.subject === subj).map((c) => ({ key: `custom-${c.id}`, title: c.title }));
}

/* `selected`/`phase` مرفوعان إلى الأعلى: وسومُ «ماذا ستذاكر» في رأس الصفحة
   يجب أن تفتح مادّتها هنا مباشرةً بدل أن تكون قائمةُ الدروس مكدّسةً في الأسفل.
   يبقيان اختياريين، فمن يستعمل المكوّن بلا تحكّمٍ يعمل كما كان. */
export default function StudyBody({ subjects, examKey, selected: selectedProp, phase: phaseProp, onSelect, detailOnly = false }: {
  subjects: SubjectDef[];
  examKey?: string;
  selected?: string | null;
  phase?: "tasees" | "tadreeb";
  onSelect?: (name: string | null, phase: "tasees" | "tadreeb") => void;
  /** داخل ورقةٍ منبثقة: تفاصيلُ المادة وحدها بلا شبكة المواد ولا زرّ إغلاقٍ
      داخليّ (الورقةُ نفسُها تُغلق). */
  detailOnly?: boolean;
}) {
  const [done, setDone] = useState<string[]>(() => (typeof window !== "undefined" ? loadList<string>(DONE_KEY) : []));
  const [custom, setCustom] = useState<CustomLesson[]>(() => (typeof window !== "undefined" ? loadList<CustomLesson>(CUSTOM_KEY) : []));
  const [tItems, setTItems] = useState<TrainingItem[]>(() => (typeof window !== "undefined" ? loadTadreebItems() : []));
  const [tDone, setTDone] = useState<string[]>(() => (typeof window !== "undefined" ? loadTadreebDone() : []));
  const [selfSelected, setSelfSelected] = useState<string | null>(null);
  const [selfPhase, setSelfPhase] = useState<"tasees" | "tadreeb">("tasees");
  /* محكومٌ من الأعلى إن مُرِّر، وإلا فحالتُه الخاصّة */
  const controlled = onSelect !== undefined;
  const selected = controlled ? (selectedProp ?? null) : selfSelected;
  const phase = controlled ? (phaseProp ?? "tasees") : selfPhase;
  const pick = (name: string | null, ph: "tasees" | "tadreeb") => {
    if (controlled) onSelect(name, ph);
    else { setSelfSelected(name); setSelfPhase(ph); }
  };
  const [newLesson, setNewLesson] = useState("");
  const [newTraining, setNewTraining] = useState("");

  useEffect(() => { saveList(DONE_KEY, done); }, [done]);
  useEffect(() => { saveList(CUSTOM_KEY, custom); }, [custom]);
  useEffect(() => { saveTadreebItems(tItems); }, [tItems]);
  useEffect(() => { saveTadreebDone(tDone); }, [tDone]);

  const doneSet = new Set(done);
  const tDoneSet = new Set(tDone);
  const trainingOf = (subj: string) => tItems.filter((t) => t.subject === subj);

  const subjColor = (name: string) => subjects.find((s) => s.name === name)?.color ?? "var(--accent)";

  /* نِسَب التأسيس/التدريب لهذه المواد فقط */
  const allLessons = subjects.flatMap((s) => lessonsOf(s.name, custom));
  const taseesPct = allLessons.length === 0 ? 0 : Math.round((allLessons.filter((l) => doneSet.has(l.key)).length / allLessons.length) * 100);
  const allTraining = subjects.flatMap((s) => trainingOf(s.name));
  const tadreebPct = allTraining.length === 0 ? 0 : Math.round((allTraining.filter((t) => tDoneSet.has(t.id)).length / allTraining.length) * 100);

  /* ── تفاصيل المادة المختارة ── */
  const renderDetail = () => {
    if (!selected) return null;
    const color = subjColor(selected);

    if (phase === "tasees") {
      const lessons = lessonsOf(selected, custom);
      const addCustom = () => {
        if (!newLesson.trim()) return;
        setCustom((p) => [...p, { id: Date.now().toString(), subject: selected, title: newLesson.trim() }]);
        setNewLesson("");
      };
      return (
        <div className="flex flex-col gap-3">
          {!hasPreset(selected) && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2.5">
                <input value={newLesson} onChange={(e) => setNewLesson(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder={`درس جديد في ${selected}...`}
                  className="flex-1 min-w-0 rounded-2xl px-4 py-3 t-body outline-none min-h-[50px]"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                <button onClick={addCustom} className="px-5 rounded-2xl font-black text-lg min-h-[50px]"
                  style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
              </div>
              <TopicExtractor subject={selected} color={color}
                onAdd={(titles) => setCustom((p) => [...p, ...titles.map((t, i) => ({ id: `${Date.now()}-${i}`, subject: selected, title: t }))])} />
            </div>
          )}
          {lessons.length === 0 && (
            <p className="t-caption text-center py-6" style={{ color: "var(--text-muted)" }}>أضف دروسك وتابع تقدّمك درساً بدرس.</p>
          )}
          {lessons.map((l) => {
            const isDone = doneSet.has(l.key);
            const diffColor = l.diff === "سهل" ? "#10B981" : l.diff === "متوسط" ? "#F59E0B" : "#EF4444";
            return (
              <div key={l.key} onClick={() => setDone((p) => (p.includes(l.key) ? p.filter((k) => k !== l.key) : [...p, l.key]))}
                className="rounded-2xl p-4 cursor-pointer transition active:scale-[0.98]"
                style={{ background: isDone ? color + "10" : "var(--surface)", border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                    {isDone && <span className="text-white text-base font-black">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black t-body leading-snug ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "var(--text-muted)" : "var(--text)" }}>{l.title}</p>
                    {l.meta && <p className="t-caption mt-1" style={{ color: "var(--text-muted)" }}>{l.meta}</p>}
                  </div>
                  {l.diff && <span className="t-caption font-bold flex-shrink-0" style={{ color: diffColor }}>{l.diff}</span>}
                  {!hasPreset(selected) && (
                    <button onClick={(e) => { e.stopPropagation(); setCustom((p) => p.filter((c) => `custom-${c.id}` !== l.key)); setDone((p) => p.filter((k) => k !== l.key)); }}
                      className="text-lg px-2 min-h-[40px]" style={{ color: "var(--text-muted)" }} aria-label="حذف">✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    /* تدريب */
    const items = trainingOf(selected);
    const addTraining = () => {
      if (!newTraining.trim()) return;
      setTItems((p) => [...p, { id: Date.now().toString() + Math.random().toString(36).slice(2), subject: selected, title: newTraining.trim() }]);
      setNewTraining("");
    };
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <input value={newTraining} onChange={(e) => setNewTraining(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTraining()}
              placeholder={`تمرين جديد في ${selected}...`}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3 t-body outline-none min-h-[50px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
            <button onClick={addTraining} className="px-5 rounded-2xl font-black text-lg min-h-[50px]"
              style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>+</button>
          </div>
          <TopicExtractor subject={selected} color={color}
            onAdd={(titles) => setTItems((p) => [...p, ...titles.map((t, i) => ({ id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`, subject: selected, title: t }))])} />
        </div>
        {items.length === 0 && (
          <p className="t-caption text-center py-6" style={{ color: "var(--text-muted)" }}>أضف التمارين اللي تبي تحلّها في {selected}.</p>
        )}
        {items.map((item) => {
          const isDone = tDoneSet.has(item.id);
          return (
            <div key={item.id} onClick={() => setTDone((p) => (p.includes(item.id) ? p.filter((k) => k !== item.id) : [...p, item.id]))}
              className="rounded-2xl p-4 cursor-pointer transition active:scale-[0.98]"
              style={{ background: isDone ? color + "10" : "var(--surface)", border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={isDone ? { background: color } : { border: "2px solid var(--border)" }}>
                  {isDone && <span className="text-white text-base font-black">✓</span>}
                </div>
                <p className={`flex-1 font-black t-body ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "var(--text-muted)" : "var(--text)" }}>{item.title}</p>
                <button onClick={(e) => { e.stopPropagation(); setTItems((p) => p.filter((t) => t.id !== item.id)); setTDone((p) => p.filter((k) => k !== item.id)); }}
                  className="text-lg px-2 min-h-[40px]" style={{ color: "var(--text-muted)" }} aria-label="حذف">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* شبكة المواد لمرحلةٍ ما */
  const subjectGrid = (which: "tasees" | "tadreeb") => (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((s) => {
        const list = which === "tasees" ? lessonsOf(s.name, custom).map((l) => l.key) : trainingOf(s.name).map((t) => t.id);
        const doneN = which === "tasees" ? list.filter((k) => doneSet.has(k)).length : list.filter((k) => tDoneSet.has(k)).length;
        const p = list.length === 0 ? 0 : Math.round((doneN / list.length) * 100);
        const on = selected === s.name && phase === which;
        return (
          <button key={s.name} onClick={() => pick(on ? null : s.name, which)}
            className="rounded-2xl p-3.5 flex flex-col gap-2.5 text-right transition active:scale-[0.97]"
            style={{ background: "var(--surface2)", border: `2px solid ${on ? s.color : s.color + "44"}` }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <p className="font-black t-small" style={{ color: "var(--text)" }}>{s.name}</p>
            </div>
            <div className="w-full">
              <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full" style={{ width: p + "%", background: s.color }} />
              </div>
              <div className="flex justify-between">
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{list.length === 0 && which === "tadreeb" ? "أضف +" : `${doneN}/${list.length}`}</span>
                <span className="font-mono-nums font-black t-caption" style={{ color: s.color }}>{p}%</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  /* داخل الورقة: التفاصيل وحدها — الشبكةُ والعناوين تكرارٌ لا يفيد هناك */
  if (detailOnly) {
    if (!selected) return null;
    return (
      <div className="flex flex-col">
        <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <SubjectSources subject={selected} examKey={examKey} color={subjColor(selected)} />
        </div>
        {/* تبديلُ التأسيس/التدريب داخل الورقة */}
        <div className="flex items-center gap-1.5 mb-3" role="group" aria-label="مرحلة المذاكرة">
          {([["tasees", "التأسيس"], ["tadreeb", "التدريب"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => pick(selected, v)} aria-pressed={phase === v}
              className="flex-1 rounded-xl py-2 t-caption font-black transition active:scale-[0.98]"
              style={phase === v
                ? { background: subjColor(selected), color: "#fff" }
                : { background: "var(--surface2)", color: "var(--text-dim)" }}>
              {label}
            </button>
          ))}
        </div>
        {renderDetail()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* التأسيس */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="t-title" style={{ color: "var(--text)" }}>التأسيس — تعلّم الأساسيات</p>
          <span className="font-mono-nums font-black t-body" style={{ color: "var(--accent-light)" }}>{taseesPct}%</span>
        </div>
        {subjectGrid("tasees")}
      </div>
      {/* التدريب */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="t-title" style={{ color: "var(--text)" }}>التدريب — حلّ التجميعات</p>
          <span className="font-mono-nums font-black t-body" style={{ color: "#A78BFA" }}>{tadreebPct}%</span>
        </div>
        {subjectGrid("tadreeb")}
      </div>
      {/* تفاصيل المادة المختارة */}
      {selected && (
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: `1.5px solid ${subjColor(selected)}55` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="t-title" style={{ color: "var(--text)" }}>{phase === "tasees" ? "دروس" : "تمارين"} {selected}</p>
            <button onClick={() => pick(null, phase)} className="t-caption font-bold px-2 min-h-[40px]" style={{ color: "var(--text-muted)" }}>إغلاق ✕</button>
          </div>
          {/* المصادر أوّلاً: «من أين أذاكر؟» يسبق «ماذا أذاكر؟» */}
          <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <SubjectSources subject={selected} examKey={examKey} color={subjColor(selected)} />
          </div>
          {renderDetail()}
        </div>
      )}
    </div>
  );
}
