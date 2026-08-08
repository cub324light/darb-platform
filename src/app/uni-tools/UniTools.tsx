"use client";
/* ─── أدوات الجامعة (client): أربع حاسبات كبطاقات دخول مستقلة ───
   عرض فقط — الحساب كله في src/lib/uniTools النقي. المدخلات تُحفظ محلياً في
   darb_uni_tools (بلا مزامنة سحابية) حتى لا يعيد الطالب إدخال مواده كل مرة.
   نقطة الدخول لوحة بطاقات (ToolTile) لا شريط علوي: عند الفتح يرى المستخدم
   أربع بطاقات كبيرة، والضغط على واحدة يعرض أداتها مع زر «رجوع للأدوات».
   قراءة التخزين بتهيئة كسولة والحفظ في معالجات الأحداث — لا setState في effect. */
import { useState } from "react";
import ToolTile from "@/components/ToolTile";
import BackButton from "@/components/BackButton";
import dynamic from "next/dynamic";
const DayJournal = dynamic(() => import("@/components/journal/DayJournal"), { ssr: false });
const MemoriesAlbum = dynamic(() => import("@/components/journal/MemoriesAlbum"), { ssr: false });
import { CardGrid } from "@/components/ds";
import {
  loadUser, loadUniTools, saveUniTools,
  type UniToolsState, type UniToolsCourseRow,
} from "@/lib/storage";
import {
  GRADE_SCALE, GPA_MAX, UNI_TOOLS_DISCLAIMER,
  gradePoints, semesterGpa, cumulativeAfter, requiredSemesterGpa,
  convertGpa, absenceBudget, neededOnFinal,
  type GpaSystem, type GpaScaleId, type GradeLetter,
} from "@/lib/uniTools";

/* تنسيق الأرقام بالعربية مع حد كسور */
const ar = (n: number, d = 2) => n.toLocaleString("ar-u-nu-latn", { maximumFractionDigits: d });
/* قراءة رقم من حقل نصي — غير الصالح ⇒ null */
const num = (s?: string): number | null => {
  const n = parseFloat(s ?? "");
  return Number.isFinite(n) ? n : null;
};

type ToolId = "gpa" | "absence" | "final" | "convert";
/* بطاقات الدخول الأربع — كل واحدة أيقونة + اسم + وصف سطر واحد + لون مميز.
   الوصف والأيقونة يُشتقّان منها للعنوان داخل الأداة أيضاً (مصدر واحد). */
/* ▓ الترتيبُ بترتيب **فصل** الطالب لا بترتيب كتابة الحاسبات
   (`UNI_TOOL_ORDER` في `lib/journeyOrder`): الغيابُ أوّلاً لأنه الخطرُ الوحيد
   الذي **لا يُعوَّض** — يتراكم أسبوعاً بأسبوع، ومَن بلغ سقفَ الحرمان لا حاسبةَ
   تُرجعه. ثم الفاينل (سؤالُ آخر الفصل وله فعلٌ ممكن)، ثم المعدل (حصيلةٌ تُحسب
   بعد النتائج)، ثم التحويل (يُحتاج عند تقديمٍ أو ابتعاثٍ فقط). */
const TOOLS: { id: ToolId; label: string; desc: string; icon: string; color: string }[] = [
  { id: "absence", label: "حاسبة الغياب",  desc: "سقف الحرمان والمتبقي لك",      icon: "📅", color: "var(--gold)" },
  { id: "final",   label: "حاسبة الفاينل", desc: "كم تحتاج في الاختبار النهائي", icon: "📝", color: "var(--success)" },
  { id: "gpa",     label: "حاسبة المعدل",  desc: "فصلي وتراكمي وكم تحتاج لهدفك", icon: "🧮", color: "var(--accent)" },
  { id: "convert", label: "تحويل المعدل",  desc: "بين سلالم 4 و5 و100",          icon: "🔄", color: "var(--danger)" },
];

const SCALES: { id: GpaScaleId; label: string }[] = [
  { id: 5, label: "من 5" },
  { id: 4, label: "من 4" },
  { id: 100, label: "من 100" },
];

/* صف مادة افتراضي لبداية لطيفة */
const STARTER_ROW: UniToolsCourseRow = { name: "", hours: "3", letter: "A" };

/* حقل رقمي موحّد بنمط حقول درب */
function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 flex-1 min-w-[120px]">
      <span className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>{label}</span>
      <input type="number" inputMode="decimal" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-[16px] font-bold font-mono-nums outline-none"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
    </label>
  );
}

/* سطر نتيجة موحّد داخل بطاقة النتائج */
function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[16px] font-black font-mono-nums" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </div>
  );
}

/* بطاقة نتائج بخلفية أهدأ */
function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-2"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

/* تنويه استرشادي موحّد */
function Disclaimer({ extra }: { extra?: string }) {
  return (
    <p className="text-[12px] font-bold leading-relaxed" style={{ color: "var(--text-muted)" }}>
      ⚖️ {UNI_TOOLS_DISCLAIMER}{extra ? ` — ${extra}` : ""}
    </p>
  );
}

/* شريحة اختيار موحّدة (بنمط شرائح درب) */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
      style={{
        background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
        color: active ? "var(--accent-light)" : "var(--text-muted)",
        border: active
          ? "1.5px solid color-mix(in srgb, var(--accent) 55%, transparent)"
          : "1.5px solid var(--border)",
      }}>
      {children}
    </button>
  );
}

export default function UniTools() {
  /* null = لوحة البطاقات (نقطة الدخول)؛ أي id = الأداة المفتوحة */
  const [tab, setTab] = useState<ToolId | null>(null);
  /* تهيئة كسولة: قراءة واحدة من التخزين + تعبئة مبدئية من ملف الطالب إن وُجد */
  const [state, setState] = useState<UniToolsState>(() => {
    if (typeof window === "undefined") return {};
    const s = loadUniTools();
    const u = loadUser();
    return {
      ...s,
      prevGpa: s.prevGpa ?? (u?.universityGpa != null ? String(u.universityGpa) : ""),
      prevHours: s.prevHours ?? (u?.creditHoursCompleted != null ? String(u.creditHoursCompleted) : ""),
    };
  });

  /* تحديث + حفظ فوري — يُستدعى من معالجات الأحداث فقط */
  const update = (patch: Partial<UniToolsState>) => {
    const next = { ...state, ...patch };
    setState(next);
    saveUniTools(next);
  };

  /* ═══ 1) حاسبة المعدل ═══ */
  const system: GpaSystem = state.system === 4 ? 4 : 5;
  const courses = state.courses ?? [STARTER_ROW];
  const setCourse = (i: number, patch: Partial<UniToolsCourseRow>) =>
    update({ courses: courses.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const addCourse = () => update({ courses: [...courses, { ...STARTER_ROW }] });
  const removeCourse = (i: number) => update({ courses: courses.filter((_, j) => j !== i) });

  const coursePts = courses
    .map((c) => ({ hours: num(c.hours) ?? 0, letter: c.letter as GradeLetter }))
    .filter((c) => c.hours > 0 && GRADE_SCALE.some((g) => g.letter === c.letter))
    .map((c) => ({ hours: c.hours, points: gradePoints(c.letter, system) }));
  const semHours = coursePts.reduce((s, c) => s + c.hours, 0);
  const sem = semesterGpa(coursePts);

  const prevGpa = num(state.prevGpa);
  const prevHours = num(state.prevHours);
  const prevValid = prevGpa != null && prevHours != null && prevGpa >= 0 && prevGpa <= GPA_MAX[system] && prevHours >= 0;
  const cum = sem != null && prevValid
    ? cumulativeAfter({ gpa: prevGpa, hours: prevHours }, { gpa: sem, hours: semHours })
    : null;

  const target = num(state.targetGpa);
  const req = target != null && prevValid && semHours > 0
    ? requiredSemesterGpa({ gpa: prevGpa, hours: prevHours }, target, semHours, system)
    : null;

  /* ═══ 2) حاسبة الغياب ═══ */
  const abIn = state.absence ?? {};
  const setAb = (patch: Partial<NonNullable<UniToolsState["absence"]>>) =>
    update({ absence: { ...abIn, ...patch } });
  const weekly = num(abIn.weeklyHours);
  const abRes = weekly != null
    ? absenceBudget({
        weeklyHours: weekly,
        weeks: num(abIn.weeks) ?? 15,
        limitPct: (num(abIn.limitPct) ?? 25) / 100,
        absent: num(abIn.absent) ?? 0,
      })
    : null;
  const abBarColor = abRes
    ? abRes.usedOfLimit >= 1 ? "var(--danger)" : abRes.usedOfLimit >= 0.6 ? "var(--gold)" : "var(--success)"
    : "var(--success)";

  /* ═══ 3) حاسبة الفاينل ═══ */
  const fiIn = state.final ?? {};
  const setFi = (patch: Partial<NonNullable<UniToolsState["final"]>>) =>
    update({ final: { ...fiIn, ...patch } });
  const cs = num(fiIn.currentScore);
  const co = num(fiIn.currentOutOf);
  const fw = num(fiIn.finalWeight);
  const tt = num(fiIn.targetTotal);
  const fin = cs != null && co != null && fw != null && tt != null
    ? neededOnFinal({ currentScore: cs, currentOutOf: co, finalWeight: fw, targetTotal: tt })
    : null;

  /* ═══ 4) تحويل المعدل ═══ */
  const cvIn = state.convert ?? {};
  const setCv = (patch: Partial<NonNullable<UniToolsState["convert"]>>) =>
    update({ convert: { ...cvIn, ...patch } });
  const cvFrom: GpaScaleId = cvIn.from ?? 5;
  const cvTo: GpaScaleId = cvIn.to ?? 4;
  const cvVal = num(cvIn.value);
  const cvOut = cvVal != null ? convertGpa(cvVal, cvFrom, cvTo) : null;

  return (
    <>
      {/* ── لوحة البطاقات: نقطة الدخول — أربع أدوات بحجم موحّد (CardGrid متساوي الارتفاع) ── */}
      {tab === null && (
        <CardGrid cols={2}>
          {TOOLS.map((t) => (
            <ToolTile key={t.id} icon={t.icon} title={t.label} desc={t.desc} color={t.color}
              ariaLabel={`افتح ${t.label}`} onClick={() => setTab(t.id)} />
          ))}
        </CardGrid>
      )}

      {/* دفترُ اليوم: محاضرةٌ تُرسم أو تُجدول أو تُكتب — نفسُ دفتر الثانوي،
          فالحاجةُ واحدة والنظامُ واحد. والصورُ في ألبوم الجوّال لا عندنا. */}
      {tab === null && (
        <>
          <DayJournal />
          <MemoriesAlbum />
        </>
      )}

      {/* ── زر الرجوع للوحة البطاقات عند فتح أداة ── */}
      {tab !== null && (
        <div className="self-start"><BackButton label="الأدوات" onBack={() => setTab(null)} /></div>
      )}

      {/* ═══ حاسبة المعدل ═══ */}
      {tab === "gpa" && (
        <section className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2">
            <span className="text-[20px]" aria-hidden="true">🧮</span>
            <p className="t-body font-black flex-1" style={{ color: "var(--text)" }}>حاسبة المعدل</p>
            <div className="flex gap-1.5">
              {([5, 4] as const).map((sys) => (
                <Chip key={sys} active={system === sys} onClick={() => update({ system: sys })}>
                  من {sys === 5 ? "5" : "4"}
                </Chip>
              ))}
            </div>
          </div>

          {/* صفوف المواد */}
          <div className="flex flex-col gap-2">
            {courses.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={c.name} placeholder={`مادة ${ar(i + 1, 0)} (اختياري)`}
                  onChange={(e) => setCourse(i, { name: e.target.value })}
                  className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-[15px] font-bold outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                <input type="number" inputMode="numeric" value={c.hours} placeholder="ساعات"
                  aria-label={`ساعات مادة ${ar(i + 1, 0)}`}
                  onChange={(e) => setCourse(i, { hours: e.target.value })}
                  className="w-[64px] rounded-xl px-2 py-2.5 text-[15px] font-bold font-mono-nums text-center outline-none flex-shrink-0"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <select value={c.letter} aria-label={`تقدير مادة ${ar(i + 1, 0)}`}
                  onChange={(e) => setCourse(i, { letter: e.target.value })}
                  className="w-[72px] rounded-xl px-2 py-2.5 text-[15px] font-black outline-none flex-shrink-0"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {GRADE_SCALE.map((g) => (
                    <option key={g.letter} value={g.letter}>{g.letter}</option>
                  ))}
                </select>
                <button onClick={() => removeCourse(i)} aria-label={`حذف مادة ${ar(i + 1, 0)}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] font-black flex-shrink-0 transition active:scale-95"
                  style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addCourse}
              className="rounded-xl px-3 py-2.5 text-[15px] font-black transition active:scale-95"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent-light)", border: "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)" }}>
              + أضف مادة
            </button>
          </div>

          {/* المعدل الفصلي */}
          <ResultCard>
            {sem != null ? (
              <ResultRow label={`المعدل الفصلي (${ar(semHours, 1)} ساعة)`} value={`${ar(sem)} من ${ar(GPA_MAX[system], 0)}`} color="var(--accent-light)" />
            ) : (
              <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
                أدخل ساعات موادك وتقديراتها ليظهر معدلك الفصلي.
              </p>
            )}
          </ResultCard>

          {/* التراكمي الجديد */}
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-black" style={{ color: "var(--text)" }}>تراكمي</p>
            <div className="flex flex-wrap gap-2">
              <Field label={`معدلك الحالي (من ${ar(GPA_MAX[system], 0)})`} value={state.prevGpa ?? ""}
                onChange={(v) => update({ prevGpa: v })} placeholder="مثال: 4.2" />
              <Field label="ساعاتك المنجزة" value={state.prevHours ?? ""}
                onChange={(v) => update({ prevHours: v })} placeholder="مثال: 90" />
            </div>
            {cum != null && (
              <ResultCard>
                <ResultRow label="تراكميك الجديد بعد هذا الفصل" value={`${ar(cum)} من ${ar(GPA_MAX[system], 0)}`}
                  color={prevGpa != null && cum >= prevGpa ? "var(--success)" : "var(--gold)"} />
              </ResultCard>
            )}
          </div>

          {/* وش أحتاج؟ */}
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-black" style={{ color: "var(--text)" }}>وش أحتاج؟</p>
            <Field label={`هدفك التراكمي (من ${ar(GPA_MAX[system], 0)})`} value={state.targetGpa ?? ""}
              onChange={(v) => update({ targetGpa: v })} placeholder="مثال: 4.5" />
            {target != null && !prevValid && (
              <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                أدخل معدلك الحالي وساعاتك المنجزة فوق أولاً.
              </p>
            )}
            {target != null && prevValid && semHours <= 0 && (
              <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                أضف مواد هذا الفصل بساعاتها فوق ليُحسب المطلوب.
              </p>
            )}
            {req && (
              <ResultCard>
                {req.status === "impossible" && (
                  <ResultRow label="المعدل الفصلي المطلوب" value="غير ممكن هذا الفصل ⚠️" color="var(--danger)" />
                )}
                {req.status === "achieved" && (
                  <ResultRow label="المعدل الفصلي المطلوب" value="هدفك محقق ✅" color="var(--success)" />
                )}
                {req.status === "possible" && (
                  <ResultRow label="المعدل الفصلي المطلوب"
                    value={`${ar(req.required)} من ${ar(req.max, 0)}`}
                    color={req.required > req.max * 0.9 ? "var(--gold)" : "var(--success)"} />
                )}
              </ResultCard>
            )}
          </div>

          <Disclaimer extra="سلم التقديرات يختلف قليلاً بين الجامعات" />
        </section>
      )}

      {/* ═══ حاسبة الغياب ═══ */}
      {tab === "absence" && (
        <section className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2">
            <span className="text-[20px]" aria-hidden="true">📅</span>
            <p className="t-body font-black flex-1" style={{ color: "var(--text)" }}>حاسبة الغياب</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Field label="ساعات المادة أسبوعياً" value={abIn.weeklyHours ?? ""}
              onChange={(v) => setAb({ weeklyHours: v })} placeholder="مثال: 3" />
            <Field label="أسابيع الفصل" value={abIn.weeks ?? "15"}
              onChange={(v) => setAb({ weeks: v })} placeholder="15" />
            <Field label="حد الحرمان ٪" value={abIn.limitPct ?? "25"}
              onChange={(v) => setAb({ limitPct: v })} placeholder="25" />
            <Field label="كم ساعة غبت؟" value={abIn.absent ?? ""}
              onChange={(v) => setAb({ absent: v })} placeholder="مثال: 4" />
          </div>

          {abRes ? (
            <ResultCard>
              <ResultRow label="إجمالي ساعات المادة" value={`${ar(abRes.totalHours, 1)} ساعة`} />
              <ResultRow label="سقف الغياب"
                value={`${ar(abRes.maxAbsenceHours, 1)} ساعة ≈ ${ar(abRes.maxAbsenceLectures, 0)} محاضرة`} />
              <ResultRow label="المتبقي لك" value={`${ar(abRes.remainingHours, 1)} ساعة`}
                color={abRes.exceeded ? "var(--danger)" : abBarColor} />
              {/* شريط استهلاك السقف: أخضر → ذهبي → أحمر */}
              <div className="h-2.5 rounded-full overflow-hidden" role="progressbar"
                aria-label="نسبة استهلاك سقف الغياب"
                aria-valuenow={Math.round(Math.min(1, abRes.usedOfLimit) * 100)} aria-valuemin={0} aria-valuemax={100}
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(1, abRes.usedOfLimit) * 100}%`, background: abBarColor }} />
              </div>
              {abRes.exceeded && (
                <p className="text-[14px] font-black" style={{ color: "var(--danger)" }}>
                  ⛔ تجاوزت حد الحرمان — راجع أستاذ المادة وعمادة كليتك فوراً.
                </p>
              )}
            </ResultCard>
          ) : (
            <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
              أدخل ساعات المادة الأسبوعية ليظهر سقفك.
            </p>
          )}

          <Disclaimer extra="الحد النهائي بيد جامعتك، وبعض الجامعات تحسب الغياب بالمحاضرات لا بالساعات" />
        </section>
      )}

      {/* ═══ حاسبة الفاينل ═══ */}
      {tab === "final" && (
        <section className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2">
            <span className="text-[20px]" aria-hidden="true">📝</span>
            <p className="t-body font-black flex-1" style={{ color: "var(--text)" }}>حاسبة الفاينل</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Field label="درجتي الحالية" value={fiIn.currentScore ?? ""}
              onChange={(v) => setFi({ currentScore: v })} placeholder="مثال: 52" />
            <Field label="من (مجموع الأعمال)" value={fiIn.currentOutOf ?? ""}
              onChange={(v) => setFi({ currentOutOf: v })} placeholder="مثال: 60" />
            <Field label="وزن الفاينل من 100" value={fiIn.finalWeight ?? ""}
              onChange={(v) => setFi({ finalWeight: v })} placeholder="مثال: 40" />
            <Field label="هدفي النهائي من 100" value={fiIn.targetTotal ?? ""}
              onChange={(v) => setFi({ targetTotal: v })} placeholder="مثال: 85" />
          </div>

          {fin ? (
            <ResultCard>
              <ResultRow label={`أعمالك تعادل (من ${ar(fin.courseworkWeight, 0)})`} value={ar(fin.earned, 1)} />
              {fin.status === "guaranteed" && (
                <ResultRow label="المطلوب في الفاينل" value="مضمون ✅ حتى بصفر" color="var(--success)" />
              )}
              {fin.status === "impossible" && (
                <ResultRow label="المطلوب في الفاينل"
                  value={`مستحيل ⚠️ (يحتاج ${ar(fin.neededPct, 1)} من 100)`} color="var(--danger)" />
              )}
              {fin.status === "possible" && (
                <ResultRow label="المطلوب في الفاينل" value={`${ar(fin.neededPct, 1)} من 100`}
                  color={fin.neededPct > 85 ? "var(--gold)" : "var(--success)"} />
              )}
            </ResultCard>
          ) : (
            <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
              عبّئ الحقول الأربعة ليظهر المطلوب في الفاينل.
            </p>
          )}

          <Disclaimer />
        </section>
      )}

      {/* ═══ تحويل المعدل ═══ */}
      {tab === "convert" && (
        <section className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2">
            <span className="text-[20px]" aria-hidden="true">🔄</span>
            <p className="t-body font-black flex-1" style={{ color: "var(--text)" }}>تحويل المعدل</p>
          </div>

          <Field label="معدلك" value={cvIn.value ?? ""} onChange={(v) => setCv({ value: v })} placeholder="مثال: 4.3" />

          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>من سلم</p>
            <div className="flex gap-1.5 flex-wrap">
              {SCALES.map((s) => (
                <Chip key={s.id} active={cvFrom === s.id} onClick={() => setCv({ from: s.id })}>{s.label}</Chip>
              ))}
            </div>
            <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>إلى سلم</p>
            <div className="flex gap-1.5 flex-wrap">
              {SCALES.map((s) => (
                <Chip key={s.id} active={cvTo === s.id} onClick={() => setCv({ to: s.id })}>{s.label}</Chip>
              ))}
            </div>
          </div>

          {cvOut != null && (
            <ResultCard>
              <ResultRow label={`${ar(Math.min(Math.max(cvVal ?? 0, 0), cvFrom))} من ${ar(cvFrom, 0)} تعادل تقريباً`}
                value={`${ar(cvOut)} من ${ar(cvTo, 0)}`} color="var(--accent-light)" />
              {cvVal != null && (cvVal > cvFrom || cvVal < 0) && (
                <p className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>
                  قيمتك خارج حدود السلم المصدر — قُصّت إلى حده.
                </p>
              )}
            </ResultCard>
          )}

          <Disclaimer extra="تحويل خطي تقريبي، والجامعات تعتمد جداول تحويل خاصة بها" />
        </section>
      )}
    </>
  );
}
