"use client";
/* ─── لوحة الأهداف — مكتفية ذاتياً (لتُستعمل في «خطتي») ───
   تلفّ ProfileGoals (الدرجات المستهدفة + النتائج + مؤشّر الرضا/الإعادة) مع إدارة
   حالتها الخاصة (goals/results) قراءةً وحفظاً. نُقلت من البروفايل إلى «خطتي» لأن
   الأهداف والقرارات ليست إحصاءات حساب. قراءة كسولة SSR-safe (بلا setState في effect). */
import { useState } from "react";
import { loadGoals, saveGoals, loadResults, saveResults, type DarbGoals, type ExamResult } from "@/lib/storage";
import ProfileGoals from "@/components/profile/ProfileGoals";

export default function GoalsPanel() {
  const [goals, setGoals] = useState<DarbGoals>(() => (typeof window !== "undefined" ? loadGoals() : {}));
  const [results, setResults] = useState<ExamResult[]>(() => (typeof window !== "undefined" ? loadResults() : []));

  const updateGoals = (partial: Partial<DarbGoals>) =>
    setGoals((prev) => { const next = { ...prev, ...partial }; saveGoals(next); return next; });
  const addResult = (r: ExamResult) =>
    setResults((prev) => { const next = [r, ...prev]; saveResults(next); return next; });
  const deleteResult = (id: string) =>
    setResults((prev) => { const next = prev.filter((x) => x.id !== id); saveResults(next); return next; });

  return (
    <ProfileGoals goals={goals} onGoalsChange={updateGoals}
      results={results} onAddResult={addResult} onDeleteResult={deleteResult} />
  );
}
