"use client";
/* ─── 🎓 هدفي الجامعي — بطاقة القرار في «خطتي» ───
   «أنا»، لا «الجامعات»: أُعلن وجهتي (جامعة + تخصص)، وأرى «هل أنا قريب؟» (مؤشر
   الوصول) و«ماذا ينقصني للوصول؟» (تحليل الفجوة). البحث/المقارنة/الموزونة/
   المتطلبات المرجعية ليست هنا — بيتها «القبول الجامعي» (نُحيل إليها برابط).
   كل القرارات من محرّكات مركزية في university.ts (لا منطق مكرّر). */
import { useMemo, useState } from "react";
import {
  UNIVERSITIES, MAJORS, findUniversity, findMajor, universityReadiness, gapAnalysis,
} from "@/lib/university";
import { loadGoals, saveGoals, currentScoreMap, loadUser, loadTrackExamDates, type DarbGoals } from "@/lib/storage";
import { getStrategy } from "@/lib/strategy";
import { daysUntil } from "@/lib/insights";
import { getTrack, type TrackId } from "@/lib/tracks";
import Link from "next/link";

const ar = (n: number) => n.toLocaleString("ar");

/* أحدث درجة من خريطة النتائج حسب كلمات مفتاحية */
function scoreOf(map: Record<string, { score: number }>, ...keys: string[]): number | null {
  for (const k of keys) for (const mk of Object.keys(map)) if (mk.includes(k)) return map[mk].score;
  return null;
}

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

  /* درجاتي الحالية — من «نتائجي» */
  const scoreMap = useMemo(() => currentScoreMap(), []);
  const have = useMemo(() => ({
    qudurat: scoreOf(scoreMap, "قدرات"),
    tahsili: scoreOf(scoreMap, "تحصيلي"),
    step: scoreOf(scoreMap, "STEP", "ستيب"),
    gpa: goals.highschoolPct ?? null,
  }), [scoreMap, goals.highschoolPct]);

  /* أسابيع حتى أقرب اختبار — لتقدير الحاجة الأسبوعية في الفجوة */
  const weeksUntilExam = useMemo(() => {
    const dates = loadTrackExamDates();
    let best: number | null = null;
    for (const d of Object.values(dates)) {
      const days = daysUntil(d);
      if (days != null && days >= 0 && (best == null || days < best)) best = days;
    }
    return best != null ? Math.max(1, Math.round(best / 7)) : null;
  }, []);

  /* مؤشر الوصول — «هل أنا قريب؟» (من المحرّك النقي + الاستراتيجية) */
  const readiness = useMemo(() => {
    const strategy = getStrategy();
    return universityReadiness({
      requirements: selectedMajor?.requirements,
      readinessPct: strategy.readinessPct,
      quduratScore: have.qudurat,
      tahsiliScore: have.tahsili,
      stepScore: have.step,
      weeklyHours: strategy.weeklyHoursTotal,
      planProgressPct: null,
      majorName: selectedMajor?.name,
    });
  }, [selectedMajor, have]);

  /* تحليل الفجوة — «ماذا ينقصني للوصول؟» */
  const gap = useMemo(
    () => (selectedMajor ? gapAnalysis(selectedMajor.requirements, have, weeksUntilExam) : null),
    [selectedMajor, have, weeksUntilExam],
  );

  const exam = useMemo(() => nearestExamDays(), []);

  const askDuwairb = () => {
    window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "progress" } }));
  };

  const levelColor =
    readiness.icon === "🟢" ? "var(--success)" :
    readiness.icon === "🟡" ? "var(--gold)" : "var(--danger)";

  return (
    <div className="flex flex-col gap-5">
      {/* مقدّمة القسم */}
      <div className="rounded-3xl p-5"
        style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
        <p className="t-h3 mb-1" style={{ color: "var(--text)" }}>🎓 هدفي الجامعي</p>
        <p className="t-body font-semibold" style={{ color: "var(--text-muted)" }}>
          قرارك: وين رايح؟ حدّد وجهتك، وشوف قربك منها وما ينقصك للوصول.
        </p>
      </div>

      {/* اختيار الجامعة المستهدفة */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[15px] font-black" style={{ color: "var(--text)" }}>🏛️ الجامعة المستهدفة</p>
        {selectedUni && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            <span className="text-[16px] font-black flex-1" style={{ color: "var(--accent-light)" }}>
              {selectedUni.id === "other" ? (goals.university || "أخرى") : selectedUni.name}
            </span>
            <button onClick={() => update({ universityId: undefined, university: undefined })}
              className="text-[14px] font-bold px-2" style={{ color: "var(--text-muted)" }}>تغيير ✕</button>
          </div>
        )}
        {!selectedUni && (
          <>
            <input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)}
              placeholder="🔎 ابحث عن جامعتك..."
              className="w-full rounded-xl px-3 py-2.5 text-[16px] text-[var(--text)] outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
              {filteredUnis.map((u) => (
                <button key={u.id} onClick={() => pickUniversity(u.id)}
                  className="px-3 py-2 rounded-full text-[14px] font-bold transition active:scale-95"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                  {u.name}
                </button>
              ))}
              {filteredUnis.length === 0 && (
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>لا نتائج — اختر «أخرى».</p>
              )}
            </div>
          </>
        )}
        {selectedUni?.id === "other" && (
          <input value={otherUni} onChange={(e) => setOtherUni(e.target.value)}
            onBlur={() => update({ university: otherUni.trim() || "أخرى" })}
            placeholder="اكتب اسم جامعتك" maxLength={60}
            className="w-full rounded-xl px-3 py-2.5 text-[16px] text-[var(--text)] outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
        )}
      </div>

      {/* اختيار التخصص المستهدف */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[15px] font-black" style={{ color: "var(--text)" }}>📚 التخصص المستهدف</p>
        <div className="flex flex-wrap gap-2">
          {MAJORS.map((m) => {
            const on = goals.majorId === m.id;
            return (
              <button key={m.id} onClick={() => pickMajor(m.id)} aria-pressed={on}
                className="px-3 py-2 rounded-full text-[14px] font-bold transition active:scale-95"
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

      {/* «هل أنا قريب؟» — مؤشر الوصول الجامعي */}
      {selectedMajor && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <span className="text-[29px]">{readiness.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>هل أنا قريب من هدفي؟</p>
              <p className="text-[20px] font-black" style={{ color: levelColor }}>{readiness.level}</p>
            </div>
            {readiness.hasData && (
              <span className="text-[15px] font-black px-3 py-1 rounded-full"
                style={{ background: `color-mix(in srgb, ${levelColor} 14%, transparent)`, color: levelColor }}>
                {ar(readiness.score)}٪
              </span>
            )}
          </div>
          {readiness.reasons.length > 0 && (
            <ul className="flex flex-col gap-1">
              {readiness.reasons.map((r, i) => (
                <li key={i} className="text-[14px] font-semibold flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <span aria-hidden="true">•</span>{r}
                </li>
              ))}
            </ul>
          )}
          {exam && (
            <p className="text-[14px] font-bold rounded-xl px-3 py-2"
              style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>
              ⏳ باقٍ {ar(exam.days)} يوماً على {exam.label}
            </p>
          )}
          <button onClick={askDuwairb}
            className="rounded-2xl py-3 text-[16px] font-black transition active:scale-[0.97]"
            style={{ background: "var(--accent)", color: "#fff" }}>
            🤖 كيف أصل لهذا التخصص؟
          </button>
        </div>
      )}

      {/* «ماذا ينقصني للوصول؟» — تحليل الفجوة */}
      {selectedMajor && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🎯</span>
            <p className="text-[16px] font-black flex-1" style={{ color: "var(--text)" }}>ماذا ينقصني للوصول إلى {selectedMajor.name}؟</p>
          </div>
          {!gap?.hasData ? (
            <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>لا تتوفّر متطلبات مُقدّرة لهذا التخصص — راجع «القبول الجامعي».</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {gap.items.map((it) => {
                  const color = it.met ? "var(--success)" : it.current == null ? "var(--text-muted)" : "var(--gold)";
                  const pct = Math.max(0, Math.min(100, it.current == null ? 0 : (it.current / it.required) * 100));
                  return (
                    <div key={it.label} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>{it.label}</span>
                        <span className="text-[14px] font-bold" style={{ color }}>
                          {it.current == null ? `المطلوب ${ar(it.required)}+` :
                            it.met ? `✅ ${ar(it.current)} (المطلوب ${ar(it.required)})` :
                            `${ar(it.current)} / ${ar(it.required)} — ينقص ${ar(it.gap)}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      {!it.met && it.weeklyNeed != null && it.weeklyNeed > 0 && (
                        <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                          ≈ {ar(it.weeklyNeed)} نقطة/أسبوع للوصول قبل اختبارك
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: gap.allMet ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
                <span className="text-[18px]">{gap.allMet ? "🟢" : "📈"}</span>
                <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  {gap.allMet
                    ? "درجاتك تلبّي المطلوب التقديري لهذا التخصص — ركّز على إتمام التقديم."
                    : `إجمالي ما تحتاج رفعه ≈ ${ar(gap.remainingTotal)} نقطة موزّعة على ما سبق.`}
                </p>
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                الدرجات المطلوبة تقديرية إرشادية — تختلف حسب الجامعة والسنة والمنافسة.
              </p>
            </>
          )}
        </div>
      )}

      {/* إحالة إلى المرجع — لا تتحول «خطتي» إلى دليل جامعات */}
      <Link href="/university"
        className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition active:scale-[0.99]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", textDecoration: "none" }}>
        <span className="text-[22px] flex-shrink-0">⚖️</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-black" style={{ color: "var(--text)" }}>قارن الجامعات واحسب موزونتك ←</span>
          <span className="block text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            الاستكشاف والمقارنة والموزونة والمتطلبات ومواسم القبول في «القبول الجامعي»
          </span>
        </span>
      </Link>
    </div>
  );
}
