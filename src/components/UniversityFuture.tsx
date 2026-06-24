"use client";
/* ─── 🎓 مستقبلي الجامعي — القسم المستقل ───
   اختيار الجامعة والتخصص، عرض المتطلبات الإرشادية، ومؤشر الوصول الجامعي.
   كل القرارات من محرّكات مركزية:
     • بيانات الجامعات/المتطلبات → university.ts (مصدر واحد).
     • مؤشر الوصول → universityReadiness() (نقي).
     • الجاهزية/الساعات → getStrategy() (محرّك الاستراتيجية).
   لا منطق مكرّر ولا قرار مستقل هنا. */
import { useMemo, useState } from "react";
import {
  UNIVERSITIES, MAJORS, findUniversity, findMajor, requirementsText, universityReadiness,
} from "@/lib/university";
import { loadGoals, saveGoals, currentScoreMap, loadUser, loadTrackExamDates, type DarbGoals } from "@/lib/storage";
import { getStrategy } from "@/lib/strategy";
import { daysUntil } from "@/lib/insights";
import { getTrack, type TrackId } from "@/lib/tracks";
import WeightedCalculator from "./WeightedCalculator";
import Link from "next/link";

const ar = (n: number) => n.toLocaleString("ar");

/* أقرب اختبار من المسارات النشطة */
function nearestExamDays(): { days: number; label: string } | null {
  const u = loadUser();
  if (!u) return null;
  const dates = loadTrackExamDates();
  const ids = (u.activeTracks?.length ? u.activeTracks : (u.track ? [u.track] : [])) as TrackId[];
  let best: { days: number; label: string } | null = null;
  for (const id of ids) {
    const d = dates[id] ?? (id === u.track ? u.examDate : undefined);
    if (!d) continue;
    const days = daysUntil(d);
    if (days != null && days >= 0 && (!best || days < best.days)) {
      best = { days, label: getTrack(id)?.title ?? id };
    }
  }
  return best;
}

export default function UniversityFuture() {
  const [goals, setGoals] = useState<DarbGoals>(() => loadGoals());
  const [uniQuery, setUniQuery] = useState("");
  const [otherUni, setOtherUni] = useState(() => (loadGoals().universityId === "other" ? loadGoals().university ?? "" : ""));

  const update = (partial: Partial<DarbGoals>) => {
    setGoals((prev) => { const next = { ...prev, ...partial }; saveGoals(next); return next; });
  };

  const selectedUni = findUniversity(goals.universityId);
  const selectedMajor = findMajor(goals.majorId);

  /* اختيار الجامعة → يحفظ المعرّف + الاسم المحلول (SSoT لدويرب) */
  const pickUniversity = (id: string) => {
    const u = findUniversity(id);
    if (!u) return;
    if (id === "other") {
      update({ universityId: "other", university: otherUni.trim() || "أخرى" });
    } else {
      update({ universityId: id, university: u.name });
    }
    setUniQuery("");
  };
  const pickMajor = (id: string) => {
    const m = findMajor(id);
    if (!m) return;
    update({ majorId: id, major: m.name });
  };

  const filteredUnis = useMemo(() => {
    const q = uniQuery.trim();
    if (!q) return UNIVERSITIES;
    return UNIVERSITIES.filter((u) => u.name.includes(q) || (u.region ?? "").includes(q));
  }, [uniQuery]);

  /* مؤشر الوصول — من المحرّك النقي + محرّك الاستراتيجية + النتائج */
  const readiness = useMemo(() => {
    const strategy = getStrategy();
    const scoreMap = currentScoreMap();
    const scoreOf = (...keys: string[]) => {
      for (const k of keys) { for (const mk of Object.keys(scoreMap)) { if (mk.includes(k)) return scoreMap[mk].score; } }
      return null;
    };
    return universityReadiness({
      requirements: selectedMajor?.requirements,
      readinessPct: strategy.readinessPct,
      quduratScore: scoreOf("قدرات"),
      tahsiliScore: scoreOf("تحصيلي"),
      stepScore: scoreOf("STEP", "ستيب"),
      weeklyHours: strategy.weeklyHoursTotal,
      planProgressPct: null,
      majorName: selectedMajor?.name,
    });
  }, [selectedMajor, goals.majorId]);

  const exam = useMemo(() => nearestExamDays(), []);

  const askDuwairb = () => {
    window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "progress" } }));
  };

  const levelColor =
    readiness.icon === "🟢" ? "var(--success)" :
    readiness.icon === "🟡" ? "var(--gold)" : "var(--danger)";

  return (
    <div className="flex flex-col gap-5">
      {/* مقدّمة */}
      <div className="rounded-3xl p-5"
        style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
        <p className="text-[20px] font-black mb-1" style={{ color: "var(--text)" }}>🎓 مستقبلي الجامعي</p>
        <p className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
          حدّد وجهتك الجامعية ليخصّص دويرب خطتك وتوصياته نحوها.
        </p>
        <Link href="/university"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] font-black transition active:scale-95"
          style={{ background: "var(--accent)", color: "#fff" }}>
          ⚖️ لوحة القبول الكاملة — موزونة ومقارنة وتحليل فجوة ←
        </Link>
      </div>

      {/* اختيار الجامعة */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[13px] font-black" style={{ color: "var(--text)" }}>🏛️ الجامعة المستهدفة</p>
        {selectedUni && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            <span className="text-[14px] font-black flex-1" style={{ color: "var(--accent-light)" }}>
              {selectedUni.id === "other" ? (goals.university || "أخرى") : selectedUni.name}
            </span>
            <button onClick={() => update({ universityId: undefined, university: undefined })}
              className="text-[12px] font-bold px-2" style={{ color: "var(--text-muted)" }}>تغيير ✕</button>
          </div>
        )}
        {!selectedUni && (
          <>
            <input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)}
              placeholder="🔎 ابحث عن جامعتك..."
              className="w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
              {filteredUnis.map((u) => (
                <button key={u.id} onClick={() => pickUniversity(u.id)}
                  className="px-3 py-2 rounded-full text-[12.5px] font-bold transition active:scale-95"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                  {u.name}
                </button>
              ))}
              {filteredUnis.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>لا نتائج — اختر «أخرى».</p>
              )}
            </div>
          </>
        )}
        {selectedUni?.id === "other" && (
          <input value={otherUni} onChange={(e) => setOtherUni(e.target.value)}
            onBlur={() => update({ university: otherUni.trim() || "أخرى" })}
            placeholder="اكتب اسم جامعتك" maxLength={60}
            className="w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
        )}
      </div>

      {/* حاسبة الموزونة — تظهر بعد اختيار الجامعة */}
      {selectedUni && selectedUni.id !== "other" && (
        <WeightedCalculator universityId={selectedUni.id} />
      )}

      {/* اختيار التخصص */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[13px] font-black" style={{ color: "var(--text)" }}>📚 التخصص المستهدف</p>
        <div className="flex flex-wrap gap-2">
          {MAJORS.map((m) => {
            const on = goals.majorId === m.id;
            return (
              <button key={m.id} onClick={() => pickMajor(m.id)} aria-pressed={on}
                className="px-3 py-2 rounded-full text-[12.5px] font-bold transition active:scale-95"
                style={{
                  background: on ? "var(--accent)" : "var(--surface2)",
                  color: on ? "#fff" : "var(--text)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                }}>
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* بطاقة المتطلبات الإرشادية */}
      {selectedMajor && requirementsText(selectedMajor.requirements) && (
        <div className="rounded-2xl p-4 flex flex-col gap-2.5"
          style={{ background: "color-mix(in srgb, var(--gold) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--gold) 20%, transparent)" }}>
          <p className="text-[13px] font-black" style={{ color: "var(--text)" }}>
            📋 ماذا يحتاج {selectedMajor.name}{selectedUni && selectedUni.id !== "other" ? ` — ${selectedUni.name}` : ""}؟
          </p>
          <div className="flex flex-col gap-1.5">
            {([
              ["القدرات", selectedMajor.requirements.qudurat],
              ["التحصيلي", selectedMajor.requirements.tahsili],
              ["STEP", selectedMajor.requirements.step],
              ["المعدل", selectedMajor.requirements.gpa],
            ] as const).filter(([, v]) => v).map(([label, v]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="text-[12.5px] font-black px-2.5 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>{v}</span>
              </div>
            ))}
          </div>
          {selectedMajor.focusHint && (
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>💡 {selectedMajor.focusHint}</p>
          )}
          <p className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>
            معلومات إرشادية تعليمية فقط — ليست شروط قبول رسمية.
          </p>
        </div>
      )}

      {/* مؤشر الوصول الجامعي */}
      {selectedMajor && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <span className="text-[26px]">{readiness.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>مؤشر الوصول الجامعي</p>
              <p className="text-[18px] font-black" style={{ color: levelColor }}>{readiness.level}</p>
            </div>
            {readiness.hasData && (
              <span className="text-[13px] font-black px-3 py-1 rounded-full"
                style={{ background: `color-mix(in srgb, ${levelColor} 14%, transparent)`, color: levelColor }}>
                {ar(readiness.score)}٪
              </span>
            )}
          </div>
          {readiness.reasons.length > 0 && (
            <ul className="flex flex-col gap-1">
              {readiness.reasons.map((r, i) => (
                <li key={i} className="text-[12.5px] font-semibold flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <span aria-hidden="true">•</span>{r}
                </li>
              ))}
            </ul>
          )}
          {exam && (
            <p className="text-[12.5px] font-bold rounded-xl px-3 py-2"
              style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>
              ⏳ باقٍ {ar(exam.days)} يوماً على {exam.label}
            </p>
          )}
          <button onClick={askDuwairb}
            className="rounded-2xl py-3 text-[14px] font-black transition active:scale-[0.97]"
            style={{ background: "var(--accent)", color: "#fff" }}>
            🤖 كيف أصل لهذا التخصص؟
          </button>
        </div>
      )}
    </div>
  );
}
