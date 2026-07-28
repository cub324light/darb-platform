"use client";
/* ─── ملخّص الأهداف — بطاقة عرض مصغّرة في «نظرة عامة» ───
   لا تكرّر منطق ProfileGoals: عرض فقط من props (العدّ التنازلي من insights.daysLeft
   والوجهة من goals)، والتعديل كله يتم من تبويب الأهداف. */
import { memo } from "react";
import { n } from "@/lib/format";

interface Props {
  daysLeft: number | null;   // من insights.daysLeft — null إن لم يُحدَّد موعد
  examTitle: string;         // عنوان مسار الطالب الرئيسي
  university?: string;       // الوجهة من goals (إن وُجدت)
  major?: string;
  onOpenGoals: () => void;   // تبديل لتبويب الأهداف
}

function ProfileGoalsSummaryBase({ daysLeft, examTitle, university, major, onOpenGoals }: Props) {
  const hasCountdown = daysLeft !== null && daysLeft >= 0;
  const destination = [university, major].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="label">🎯 وجهتك</p>
        <button onClick={onOpenGoals} className="text-[14px] font-bold transition active:scale-95"
          style={{ color: "var(--accent-light)" }}>
          عدّل أهدافك ←
        </button>
      </div>

      {hasCountdown ? (
        daysLeft === 0 ? (
          <p className="text-[17px] font-black" style={{ color: "var(--gold)" }}>اختبار {examTitle} اليوم! 🚀</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-mono-nums font-black text-[29px] leading-none" style={{ color: "var(--gold)" }}>
              {n(daysLeft)}
            </span>
            <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>يوم على اختبار {examTitle}</span>
          </div>
        )
      ) : (
        <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>حدّد موعد اختبارك ليبدأ العدّ التنازلي.</p>
      )}

      {destination ? (
        <p className="text-[15px] font-bold mt-2 truncate" style={{ color: "var(--text)" }}>
          <span aria-hidden="true">🎓 </span>{destination}
        </p>
      ) : (
        <p className="text-[14px] mt-2" style={{ color: "var(--text-muted)" }}>حدّد جامعتك وتخصّصك المستهدفَين من الأهداف.</p>
      )}
    </div>
  );
}

export default memo(ProfileGoalsSummaryBase);
