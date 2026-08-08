"use client";
/* ─── 🎓 هدفي الجامعي — بطاقة القرار في «خطتي» ───
   «أنا»، لا «الجامعات»: أُعلن وجهتي (جامعة + تخصص)، وأرى «هل أنا قريب؟» (مؤشر
   الوصول) و«ماذا ينقصني للوصول؟» (تحليل الفجوة). البحث/المقارنة/الموزونة/
   المتطلبات المرجعية ليست هنا — بيتها «القبول الجامعي» (نُحيل إليها برابط).
   كل القرارات من محرّكات مركزية في university.ts (لا منطق مكرّر). */
import { useMemo, useState } from "react";
import {
  UNIVERSITIES, MAJORS, findUniversity, findMajor, universityReadiness, gapAnalysis, requirementsText,
} from "@/lib/university";
import { collegesAt, majorsIn, categoryOfMajor, collegeOfMajor, hasColleges } from "@/lib/universityColleges";
import { loadGoals, saveGoals, currentScoreMap, activeExamTrackIds, loadTrackExamDates, type DarbGoals } from "@/lib/storage";
import { getStrategy } from "@/lib/strategy";
import { daysUntil } from "@/lib/insights";
import { getTrack, type TrackId } from "@/lib/tracks";
import Link from "next/link";
import { n as ar } from "@/lib/format";


/* أحدث درجة من خريطة النتائج حسب كلمات مفتاحية */
function scoreOf(map: Record<string, { score: number }>, ...keys: string[]): number | null {
  for (const k of keys) for (const mk of Object.keys(map)) if (mk.includes(k)) return map[mk].score;
  return null;
}

/* أقرب اختبار من المسارات النشطة */
function nearestExamDays(): { days: number; label: string } | null {
  const dates = loadTrackExamDates();
  /* المصدر الواحد: اختبارات الطالب من Workspace (لا activeTracks) */
  const ids = activeExamTrackIds() as TrackId[];
  let best: { days: number; label: string } | null = null;
  for (const id of ids) {
    const d = dates[id];
    if (!d) continue;
    const days = daysUntil(d);
    if (days != null && days >= 0 && (!best || days < best.days)) {
      best = { days, label: getTrack(id)?.title ?? id };
    }
  }
  return best;
}

/* استيرادٌ ديناميّ كما في بقية مُطلِقي الأحداث — لا يُدخل محرّكَ الأحداث في حزمة الصفحة */
const fire = (ev: Parameters<typeof import("@/lib/events")["emit"]>[0]) => {
  import("@/lib/events").then(({ emit }) => emit(ev)).catch(() => {});
};

export default function UniversityFuture() {
  const [goals, setGoals] = useState<DarbGoals>(() => loadGoals());
  const [uniQuery, setUniQuery] = useState("");
  const [otherUni, setOtherUni] = useState(() => (loadGoals().universityId === "other" ? loadGoals().university ?? "" : ""));

  /* ▓ الحدثُ القائم — بنفس دلالات «نتائجي» حرفاً بحرف. كانت هذه الشاشةُ تكتب
     الهدفَ الجديد في `darb_goals` وتصمت، فتعرض الواجهةُ جامعةً ويظلّ دويربُ
     يخاطب الطالبَ بجامعةٍ تركها — قِسناه. ولا حدثَ جديد: `GoalChanged` مسجَّلٌ
     وله مُتفاعِلٌ يكتب `goal.targetUniversity` و`goal.targetMajor`. */
  const update = (partial: Partial<DarbGoals>) => {
    setGoals((prev) => {
      const next = { ...prev, ...partial }; saveGoals(next);
      if (partial.university && partial.university !== prev.university) {
        fire({ eventType: "GoalChanged", metadata: { field: "university", value: partial.university, prev: prev.university }, actor: { kind: "student" }, source: "ui" });
      }
      if (partial.major && partial.major !== prev.major) {
        fire({ eventType: "GoalChanged", metadata: { field: "major", value: partial.major, prev: prev.major }, actor: { kind: "student" }, source: "ui" });
      }
      return next;
    });
  };

  const selectedUni = findUniversity(goals.universityId);
  const selectedMajor = findMajor(goals.majorId);

  /* اختيار الجامعة → يحفظ المعرّف + الاسم المحلول (SSoT لدويرب).
     السلسلة تنهار من أعلاها: جامعةٌ جديدة ⇒ كليةٌ وتخصّصٌ جديدان، فلا يبقى هدفٌ
     مستحيلٌ محفوظاً بلا أن يراه أحد. */
  const pickUniversity = (id: string) => {
    const u = findUniversity(id);
    if (!u) return;
    const cleared = { college: undefined, major: undefined, majorId: undefined };
    if (id === "other") {
      update({ universityId: "other", university: otherUni.trim() || "أخرى", ...cleared });
    } else {
      update({ universityId: id, university: u.name, ...cleared });
    }
    setUniQuery("");
  };
  const pickCollege = (name: string) =>
    update({ college: name || undefined, major: undefined, majorId: undefined });
  /* التخصص الدقيق هو تخصّص الطالب، والتصنيف الخشن جسرٌ للمتطلّبات وقد يغيب */
  const pickMajor = (name: string) =>
    update({ major: name || undefined, majorId: categoryOfMajor(goals.universityId, name) });

  /* الكلية المحفوظة، أو المشتقّة من تخصّصٍ حُفظ قبل وجود خطوة الكلية */
  const college = goals.college ?? (goals.major ? collegeOfMajor(goals.universityId, goals.major) : undefined) ?? "";

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
  }), [scoreMap]);

  /* «المطلوب» = ما كتبه الطالبُ هدفاً في «أهدافي». بلا هدفٍ لا فجوة — ولا
     نشتقّ له عتبةً من مستوى التخصّص النوعيّ (كان ذاك رقمَنا لا رقمَ جهةِ قبول). */
  const targets = useMemo(() => ({
    qudurat: goals.quduratTarget, tahsili: goals.tahsiliTarget, step: goals.stepTarget,
  }), [goals.quduratTarget, goals.tahsiliTarget, goals.stepTarget]);

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
      targets,
      readinessPct: strategy.readinessPct,
      quduratScore: have.qudurat,
      tahsiliScore: have.tahsili,
      stepScore: have.step,
      weeklyHours: strategy.weeklyHoursTotal,
      planProgressPct: null,
      /* الاسم الدقيق هو الذي يراه الطالب («العمارة» لا «هندسة مدنية») */
      majorName: goals.major ?? selectedMajor?.name,
    });
  }, [targets, have, goals.major, selectedMajor?.name]);

  /* تحليل الفجوة — «ماذا ينقصني للوصول؟» */
  const gap = useMemo(
    () => gapAnalysis(targets, have, weeksUntilExam),
    [targets, have, weeksUntilExam],
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

      {/* الكلية ثم التخصص الدقيق — كما في التسجيل: جامعة ← كلية ← تخصّص */}
      {hasColleges(goals.universityId) && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="t-title font-black" style={{ color: "var(--text)" }}>🏫 الكلية</p>
          <div className="flex flex-wrap gap-2">
            {collegesAt(goals.universityId).map((k) => {
              const on = college === k.name;
              return (
                <button key={k.name} onClick={() => pickCollege(on ? "" : k.name)} aria-pressed={on}
                  className="px-3 py-2 rounded-full t-small font-bold transition active:scale-95"
                  style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text)",
                           border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
                  {k.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* اختيار التخصص المستهدف */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="t-title font-black" style={{ color: "var(--text)" }}>📚 التخصص المستهدف</p>
        {hasColleges(goals.universityId) ? (
          college ? (
            <div className="flex flex-wrap gap-2">
              {majorsIn(goals.universityId, college).map((m) => {
                const on = goals.major === m.name;
                return (
                  <button key={m.name} onClick={() => pickMajor(on ? "" : m.name)} aria-pressed={on}
                    className="px-3 py-2 rounded-full t-small font-bold transition active:scale-95"
                    style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text)",
                             border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
                    {m.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="t-small" style={{ color: "var(--text-muted)" }}>اختر كليتك أوّلاً لتظهر تخصصاتها.</p>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            {MAJORS.map((m) => {
              const on = goals.majorId === m.id;
              return (
                <button key={m.id} onClick={() => update({ majorId: on ? undefined : m.id, major: on ? undefined : m.name })} aria-pressed={on}
                  className="px-3 py-2 rounded-full t-small font-bold transition active:scale-95"
                  style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text)",
                           border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
                  {m.name}
                </button>
              );
            })}
          </div>
        )}
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

          {/* ما نعرفه عن التخصّص فعلاً: وصفٌ نوعيٌّ لا رقم */}
          {requirementsText(selectedMajor.requirements) && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
              <p className="text-[13px] font-black mb-0.5" style={{ color: "var(--text)" }}>ما يحتاجه هذا التخصص</p>
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>{requirementsText(selectedMajor.requirements)}</p>
            </div>
          )}

          {!gap.hasData ? (
            <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
              حدّد درجاتك المستهدفة في «أهدافي» أعلاه، وأقيس لك كم بقي بينك وبينها.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {gap.items.map((it) => {
                  const color = it.met ? "var(--success)" : it.current == null ? "var(--text-muted)" : "var(--gold)";
                  const pct = Math.max(0, Math.min(100, it.current == null ? 0 : (it.current / it.target) * 100));
                  return (
                    <div key={it.label} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>{it.label}</span>
                        <span className="text-[14px] font-bold" style={{ color }}>
                          {it.current == null ? `هدفك ${ar(it.target)}` :
                            it.met ? `✅ ${ar(it.current)} (هدفك ${ar(it.target)})` :
                            `${ar(it.current)} / ${ar(it.target)} — ينقص ${ar(it.gap)}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      {!it.met && it.weeklyNeed != null && it.weeklyNeed > 0 && (
                        <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                          ≈ {ar(it.weeklyNeed)} نقطة/أسبوع لبلوغ هدفك قبل اختبارك
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
                    ? "بلغتَ درجاتك المستهدفة — ركّز على إتمام التقديم."
                    : `إجمالي ما تحتاج رفعه ≈ ${ar(gap.remainingTotal)} نقطة لبلوغ أهدافك.`}
                </p>
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                هذه أهدافُك أنت. ونِسَب القبول الفعلية تُعلنها الجامعاتُ سنوياً وتختلف بالتخصص والمنافسة.
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
