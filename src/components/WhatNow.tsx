"use client";
/* ─── «ماذا أفعل الآن؟» — أول ما يراه الطالب: إجابة واحدة تبدأ من مشكلته ───
   ليست لوحة ولا قائمة؛ سؤالٌ واحد جوابه يتغيّر بمرحلته والتقويم: عدّاد الاختبار
   الأقرب، أو خطوة التخرّج، أو «رتّب رغباتك». عنوانٌ + إجراءٌ رئيسٌ واحد + سلسلة
   خطوات مرتّبة، كلٌّ يقود لوجهة حقيقية داخل درب. المنطق كلّه في whatNow.ts النقي.
   قراءة كسولة واحدة (بلا setState في effect — قاعدة React Compiler). */
import { useState } from "react";
import Link from "next/link";
import { loadUser, loadGoals, loadTrackExamDates, loadCalendarConfig } from "@/lib/storage";
import { phaseExperience } from "@/lib/experience";
import { resolveCalendar, type CalendarConfig } from "@/lib/academicCalendar";
import { semesterInfo, uniStage } from "@/lib/uniJourney";
import { findMajor } from "@/lib/university";
import { hasMajorWorld } from "@/lib/majors";
import { whatNow, type NowAnswer } from "@/lib/whatNow";

/* لونٌ بمعنى لكل نبرة إجابة */
const ACCENT_VAR: Record<NowAnswer["accent"], string> = {
  danger: "var(--danger)",
  gold: "var(--gold)",
  accent: "var(--accent)",
  success: "var(--success)",
};

/* حساب الإجابة مرّة واحدة من التخزين (كسول، بلا IO متكرّر). كل المُحمِّلات آمنة
   على الخادم (تُعيد فراغاً)، وphaseExperience يقبل null — فتُرسَم بنيةٌ ثابتة على
   الطرفين (كنمط DashUniWorld) بلا تباين hydration، والقيم تُدقّق على العميل. */
function computeAnswer(): NowAnswer {
  const user = loadUser();
  const goals = loadGoals();
  const exp = phaseExperience(user);
  const now = new Date();
  const cal = resolveCalendar(now, {
    examDates: loadTrackExamDates(),
    config: loadCalendarConfig<CalendarConfig>(),
  });

  let uni = null;
  if (exp.stage === "university") {
    const sem = semesterInfo(now);
    const major = findMajor(goals.majorId ?? undefined);
    uni = {
      stage: uniStage(user?.universityYear, user?.creditHoursCompleted),
      finalsInDays: sem?.daysToFinals ?? null,
      termLabel: sem?.termLabel ?? null,
      majorName: hasMajorWorld(goals.majorId) && major ? major.name : null,
      coopDone: !!user?.coopDone,
      gpa: user?.universityGpa ?? null,
      gradInterest: !!user?.gradSchoolInterest,
    };
  }
  return whatNow({ exp, cal, uni });
}

/* خطوة واحدة في السلسلة — رقم مرتّب + نص + سهم يقود للوجهة */
function StepChip({ n, icon, text, href, last }: {
  n: number; icon: string; text: string; href: string; last: boolean;
}) {
  return (
    <>
      <Link href={href}
        className="flex items-center gap-2 rounded-xl px-3 py-2 no-underline transition active:scale-[0.98] flex-shrink-0"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>
          {n}
        </span>
        <span className="text-[13px]" aria-hidden="true">{icon}</span>
        <span className="t-caption font-black whitespace-nowrap" style={{ color: "var(--text)" }}>{text}</span>
      </Link>
      {!last && (
        <span className="text-[13px] flex-shrink-0 self-center" style={{ color: "var(--text-muted)" }} aria-hidden="true">←</span>
      )}
    </>
  );
}

export default function WhatNow() {
  const [answer] = useState<NowAnswer>(() => computeAnswer());
  const c = ACCENT_VAR[answer.accent];
  const urgent = answer.urgency === "high";

  return (
    <section className="rounded-2xl p-4 sm:p-5 mb-3 text-right flex flex-col gap-3"
      style={{
        background: `linear-gradient(150deg, color-mix(in srgb, ${c} ${urgent ? 16 : 10}%, var(--surface)) 0%, var(--surface) 78%)`,
        border: `1px solid color-mix(in srgb, ${c} ${urgent ? 40 : 26}%, var(--border))`,
      }}>
      {/* العنوان: تأطير المشكلة + الحالة بلغة الطالب */}
      <div className="flex flex-col gap-1">
        <span className="eyebrow" style={{ color: c }}>
          {urgent ? "⏳ " : "✦ "}{answer.eyebrow}
        </span>
        <h2 className="t-h2 leading-tight" style={{ color: "var(--text)" }}>{answer.headline}</h2>
        <p className="t-body" style={{ color: "var(--text-dim)" }}>{answer.sub}</p>
      </div>

      {/* الإجراء الأهمّ الآن — زرٌّ واحد بارز */}
      <Link href={answer.primary.href}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 no-underline font-black transition active:scale-[0.98] self-start"
        style={{
          height: "var(--btn-h)",
          background: c,
          color: answer.accent === "gold" ? "#1a1400" : "#fff",
          boxShadow: `0 4px 16px color-mix(in srgb, ${c} 32%, transparent)`,
        }}>
        <span aria-hidden="true">{answer.primary.icon}</span>
        {answer.primary.label}
        <span aria-hidden="true">←</span>
      </Link>

      {/* السلسلة: خطوات مرتّبة كلٌّ يقود للذي بعده (تمرير أفقي على الجوال) */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 -mb-1" style={{ scrollbarWidth: "thin" }}>
        {answer.steps.map((s, i) => (
          <StepChip key={i} n={i + 1} icon={s.icon} text={s.text} href={s.href}
            last={i === answer.steps.length - 1} />
        ))}
      </div>
    </section>
  );
}
