"use client";
/* ─── مخطط الدراسة الذكي ───
   يعرض توزيع ساعات المواد من محرّك الاستراتيجية، ويتيح التعديل اليدوي
   مع إعادة الموازنة التلقائية. مصدر القرار: دويرب + الخطة + الخريطة + تقرير المدرّب. */
import { useState, useEffect, useCallback } from "react";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import Link from "next/link";
import { getStrategy, majorSubjectBoost, subjectPriorityOrder } from "@/lib/strategy";
import { loadStudyPlan, saveStudyPlan, clearStudyPlan, loadGoals, loadUser } from "@/lib/storage";
import { findMajor } from "@/lib/university";
import { colorForSubject, type TrackId } from "@/lib/tracks";
import type { StudyPlanSubject } from "@/lib/storage";

const STEP = 0.5;
const round1 = (n: number) => Math.round(n * 10) / 10;
const ar = (n: number) => n.toLocaleString("ar-SA");

/* يحوّل perSubject من الاستراتيجية + تعديلات المستخدم → قائمة العرض */
function mergedSubjects(
  strategySubjects: { name: string; hoursPerWeek: number }[],
  override: StudyPlanSubject[] | null,
): StudyPlanSubject[] {
  if (!override || override.length === 0) {
    return strategySubjects.map((s, i) => ({ name: s.name, hoursPerWeek: s.hoursPerWeek, order: i }));
  }
  /* الدمج: الاحتفاظ بترتيب المستخدم + ساعاته، وإضافة مواد جديدة في الاستراتيجية */
  const overrideMap = new Map(override.map((s) => [s.name, s]));
  const result: StudyPlanSubject[] = [];
  /* مواد موجودة في override (احتفظ بترتيب المستخدم) */
  for (const o of override) {
    if (strategySubjects.some((s) => s.name === o.name)) result.push(o);
  }
  /* مواد جديدة في الاستراتيجية لا توجد في override */
  for (const s of strategySubjects) {
    if (!overrideMap.has(s.name)) {
      result.push({ name: s.name, hoursPerWeek: s.hoursPerWeek, order: result.length });
    }
  }
  return result.map((s, i) => ({ ...s, order: i }));
}

export default function StudyPlanPage() {
  const [activeIds] = useState<TrackId[]>(() => {
    if (typeof window === "undefined") return ["تحصيلي"] as TrackId[];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return ids.length ? ids : (["تحصيلي"] as TrackId[]);
  });

  const [strategy] = useState(() => typeof window !== "undefined" ? getStrategy() : null);
  const [goals] = useState(() => typeof window !== "undefined" ? loadGoals() : null);
  const major = goals?.majorId ? findMajor(goals.majorId) : null;
  const majorBoost = major ? majorSubjectBoost(major.category) : {};

  const [subjects, setSubjects] = useState<StudyPlanSubject[]>(() => {
    if (typeof window === "undefined") return [];
    const strat = getStrategy();
    const override = loadStudyPlan();
    return mergedSubjects(strat.perSubject, override?.subjects ?? null);
  });

  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isModified, setIsModified] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadStudyPlan() !== null;
  });

  const colorOf = useCallback((name: string) => colorForSubject(activeIds, name), [activeIds]);

  /* حفظ تلقائي بعد كل تعديل */
  useEffect(() => {
    if (!isModified) return;
    const plan = { subjects, lastModified: new Date().toISOString() };
    saveStudyPlan(plan);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [subjects, isModified]);

  /* ── ضبط ساعات مادة مع إعادة الموازنة ── */
  const adjustHours = (name: string, delta: number) => {
    setIsModified(true);
    setSubjects((prev) => {
      const next = prev.map((s) => ({ ...s }));
      const idx = next.findIndex((s) => s.name === name);
      if (idx < 0) return prev;
      const newHours = round1(Math.max(0.5, next[idx].hoursPerWeek + delta));
      const actualDelta = newHours - next[idx].hoursPerWeek;
      if (Math.abs(actualDelta) < 0.01) return prev; // لا تغيير
      next[idx].hoursPerWeek = newHours;
      /* إعادة الموازنة: أخذ من / إضافة إلى أقل أولوية */
      const others = next.filter((_, i) => i !== idx);
      if (others.length > 0 && Math.abs(actualDelta) > 0.01) {
        /* خذ من الأعلى ساعات (أكثر مرونة) */
        others.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
        const target = delta > 0 ? others[0] : others[others.length - 1];
        const tIdx = next.findIndex((s) => s.name === target.name);
        if (tIdx >= 0) {
          next[tIdx].hoursPerWeek = round1(Math.max(0.5, next[tIdx].hoursPerWeek - actualDelta));
        }
      }
      return next;
    });
  };

  /* ── إعادة ترتيب المواد ── */
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setIsModified(true);
    setSubjects((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };
  const moveDown = (idx: number) => {
    setSubjects((prev) => {
      if (idx >= prev.length - 1) return prev;
      setIsModified(true);
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  /* ── إعادة بناء من الاستراتيجية ── */
  const rebuild = () => {
    if (!strategy) return;
    clearStudyPlan();
    setIsModified(false);
    setSubjects(mergedSubjects(strategy.perSubject, null));
  };

  const totalHours = round1(subjects.reduce((s, x) => s + x.hoursPerWeek, 0));
  const stratTotal = strategy?.weeklyHoursTotal ?? totalHours;
  const priorityOrder = strategy ? subjectPriorityOrder(strategy) : [];

  /* سبب الأولوية لكل مادة */
  const whyReason = (name: string): string => {
    const parts: string[] = [];
    if (strategy?.weakest === name) parts.push("هي أضعف مادة لديك حالياً");
    if (strategy?.strongest === name) parts.push("هي أقوى مادة لديك — وقتها مخفَّض قليلاً");
    const boost = majorBoost[name];
    if (boost && boost > 1 && major) {
      parts.push(`تخصص ${major.name} يتطلب تركيزاً إضافياً عليها`);
    }
    const rank = priorityOrder.indexOf(name);
    if (rank === 0) parts.push("أعلى أولوية في استراتيجيتك");
    else if (rank > 0) parts.push(`أولويتها رقم ${ar(rank + 1)} هذا الأسبوع`);
    if (!parts.length) parts.push("موزّعة بالتساوي حسب عدد مواد مسارك");
    return parts.join("، ");
  };

  if (!strategy) return (
    <div className="page flex items-center justify-center">
      <p style={{ color: "var(--text-muted)" }}>يرجى تسجيل الدخول أولاً</p>
    </div>
  );

  return (
    <div className="page">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">مخطط الدراسة</h1>
          {saved && (
            <span className="text-[12px] font-bold px-2 py-1 rounded-full"
              style={{ background: "color-mix(in srgb, var(--success) 14%, var(--surface))", color: "var(--success)" }}>
              ✓ حُفظ
            </span>
          )}
        </div>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
          وزّع ساعاتك الأسبوعية — التعديلات تنعكس على دويرب وتقرير المدرّب
        </p>
      </Dome>
      <div className="h-4" />

      {/* ── بطاقة الملخص ── */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
          <div>
            <p className="text-[22px] font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{ar(totalHours)}</p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>ساعة أسبوعياً</p>
          </div>
          <div className="text-center">
            <p className="text-[16px] font-black" style={{ color: "var(--text)" }}>{ar(strategy.studyDaysPerWeek)} أيام</p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>مذاكرة أسبوعياً</p>
          </div>
          <div className="text-left">
            <p className="text-[16px] font-black" style={{ color: strategy.labels.intensity === "مكثّفة" ? "var(--danger)" : strategy.labels.intensity === "متوازنة" ? "var(--gold)" : "var(--success)" }}>
              {strategy.labels.intensity}
            </p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>كثافة الدراسة</p>
          </div>
        </div>
        {major && (
          <div className="mt-2 rounded-xl px-3 py-2 text-[12px]"
            style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)" }}>
            <span style={{ color: "var(--accent-light)" }}>🎓 تخصص {major.name}</span>
            <span className="mr-2" style={{ color: "var(--text-muted)" }}>يُعزّز مواد ذات الصلة تلقائياً</span>
          </div>
        )}
      </div>

      {/* ── قائمة المواد ── */}
      <div className="px-5 mb-5 flex flex-col gap-3">
        {subjects.map((subj, idx) => {
          const color = colorOf(subj.name);
          const boost = majorBoost[subj.name];
          const hasPriorityBoost = boost && boost > 1;
          const pct = Math.round((subj.hoursPerWeek / totalHours) * 100);

          return (
            <div key={subj.name} className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", border: `1px solid var(--border)` }}>
              {/* شريط التقدم */}
              <div className="h-1.5 w-full" style={{ background: "var(--surface2)" }}>
                <div className="h-full transition-all duration-300 rounded-full"
                  style={{ width: `${pct}%`, background: color }} />
              </div>

              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* أزرار إعادة الترتيب */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="w-6 h-5 flex items-center justify-center rounded text-[10px] transition disabled:opacity-30"
                      style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>▲</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === subjects.length - 1}
                      className="w-6 h-5 flex items-center justify-center rounded text-[10px] transition disabled:opacity-30"
                      style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>▼</button>
                  </div>

                  {/* اسم المادة */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>{subj.name}</span>
                      {hasPriorityBoost && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                          🎓 معزَّز
                        </span>
                      )}
                      {strategy.weakest === subj.name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>
                          الأحوج
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {ar(pct)}٪ من الوقت الأسبوعي
                    </p>
                  </div>

                  {/* ضبط الساعات */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => adjustHours(subj.name, -STEP)}
                      className="w-8 h-8 rounded-lg text-[16px] font-black flex items-center justify-center transition active:scale-95"
                      style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
                    <div className="text-center w-14">
                      <p className="text-[18px] font-black font-mono-nums" style={{ color }}>
                        {ar(subj.hoursPerWeek)}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ساعة/أسبوع</p>
                    </div>
                    <button onClick={() => adjustHours(subj.name, STEP)}
                      className="w-8 h-8 rounded-lg text-[16px] font-black flex items-center justify-center transition active:scale-95"
                      style={{ background: "var(--accent)", color: "#fff" }}>+</button>
                  </div>
                </div>

                {/* زر «لماذا هذه المادة؟» */}
                <div className="mt-2">
                  <button onClick={() => setWhyOpen(whyOpen === subj.name ? null : subj.name)}
                    className="text-[12px] font-bold px-2.5 py-1 rounded-lg transition"
                    style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                    {whyOpen === subj.name ? "إخفاء ▲" : "لماذا هذه المادة؟ ▼"}
                  </button>
                  {whyOpen === subj.name && (
                    <p className="mt-2 text-[12.5px] leading-relaxed px-1" style={{ color: "var(--text)" }}>
                      {whyReason(subj.name)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── زر إعادة البناء ── */}
      <div className="px-5 mb-5">
        <button onClick={rebuild}
          className="w-full rounded-2xl py-3.5 font-black text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1.5px dashed var(--border)" }}>
          <span>🔄</span>
          <span>إعادة بناء الجدول من الاستراتيجية</span>
        </button>
        <p className="text-[12px] text-center mt-1.5" style={{ color: "var(--text-muted)" }}>
          يُعيد الحساب التلقائي بناءً على موعدك وهدفك وجاهزيتك وتخصصك
        </p>
      </div>

      {/* ── ملاحظة الاستراتيجية ── */}
      <div className="px-5 mb-5 rise rise-3">
        <div className="rounded-2xl px-4 py-3.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-[13px] font-black mb-1.5" style={{ color: "var(--text)" }}>مبرّر الاستراتيجية</p>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {strategy.rationale}
          </p>
          {strategy.schoolFinalsNote && (
            <p className="text-[12px] mt-2 font-bold" style={{ color: "var(--gold)" }}>
              ⚠️ {strategy.schoolFinalsNote}
            </p>
          )}
        </div>
      </div>

      {/* ── روابط سريعة ── */}
      <div className="px-5 mb-5 rise rise-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/plan",    icon: "📅", label: "خطتي",    desc: "الجدول اليومي والأسبوعي" },
            { href: "/roadmap", icon: "🗺️", label: "مساري",   desc: "خريطة دروس المادة" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-2xl p-4 flex flex-col gap-1.5 transition active:scale-[0.97]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", textDecoration: "none" }}>
              <span className="text-[22px]">{item.icon}</span>
              <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>{item.label}</span>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
