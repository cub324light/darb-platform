"use client";
/* ─── لوحة الأهداف — مكتفية ذاتياً (لتُستعمل في «خطتي») ───
   تلفّ ProfileGoals (الدرجات المستهدفة + النتائج + مؤشّر الرضا/الإعادة) مع إدارة
   حالتها الخاصة (goals/results) قراءةً وحفظاً. نُقلت من البروفايل إلى «خطتي» لأن
   الأهداف والقرارات ليست إحصاءات حساب. قراءة كسولة SSR-safe (بلا setState في effect). */
import { useState } from "react";
import { loadGoals, saveGoals, loadResults, saveResults, type DarbGoals, type ExamResult } from "@/lib/storage";
import ProfileGoals from "@/components/profile/ProfileGoals";
import DismissibleNote from "@/components/DismissibleNote";
import { duwairbMoment, type Intervention } from "@/lib/duwairb/moments";

export default function GoalsPanel() {
  const [goals, setGoals] = useState<DarbGoals>(() => (typeof window !== "undefined" ? loadGoals() : {}));
  const [results, setResults] = useState<ExamResult[]>(() => (typeof window !== "undefined" ? loadResults() : []));
  /* تدخّلُ دويرب بعد تغيير الهدف — لحظةَ التغيير لا عند فتح الصفحة. */
  const [goalNote, setGoalNote] = useState<Intervention | null>(null);

  /* أحداثُ السلوك: النوعان مسجَّلان في `events/registry` منذ البداية ولا يُطلقان
     من أيّ مكان، فلا تعرف الذاكرةُ أنّ الطالب غيّر هدفه أو سجّل درجة. */
  const fire = (ev: Parameters<typeof import("@/lib/events")["emit"]>[0]) => {
    import("@/lib/events").then(({ emit }) => emit(ev)).catch(() => {});
  };

  const updateGoals = (partial: Partial<DarbGoals>) => {
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
    /* خارج المُحدِّث عمداً: لا أثرَ جانبيّاً داخل دالّة الحالة. المقارنةُ بلقطة
       هذه الدورة — وهي التي يراها الطالبُ حين يغيّر. */
    const changed: ["university" | "major", string] | null =
      partial.university && partial.university !== goals.university ? ["university", partial.university]
      : partial.major && partial.major !== goals.major ? ["major", partial.major]
      : null;
    if (changed) setGoalNote(duwairbMoment({ kind: "goal-changed", field: changed[0], value: changed[1] }));
  };
  const addResult = (r: ExamResult) =>
    setResults((prev) => {
      const next = [r, ...prev]; saveResults(next);
      /* الدرجةُ نصٌّ في التخزين — لا نُطلق إلا إن كانت رقماً حقيقياً. */
      const score = r.score != null ? parseFloat(r.score) : NaN;
      if (r.exam && Number.isFinite(score)) {
        const before = prev.find((x) => x.exam === r.exam && x.score != null);
        const prevScore = before?.score != null ? parseFloat(before.score) : NaN;
        fire({ eventType: "ScoreUpdated", metadata: { exam: r.exam, score, prev: Number.isFinite(prevScore) ? prevScore : undefined }, actor: { kind: "student" }, source: "ui" });
        fire({ eventType: "ExamCompleted", metadata: { exam: r.exam, score }, actor: { kind: "student" }, source: "ui" });
      }
      return next;
    });
  /* الحذفُ واقعةٌ تُسجَّل ولا تمحو تاريخاً: حدثُ التسجيل يبقى، ويُلحَق `ResultDeleted`
     بعده — فيصير هو الأحدثَ في «آخر النشاط»، وتُبطَل الذاكرةُ المعتمدةُ على النتيجة. */
  const deleteResult = (id: string) =>
    setResults((prev) => {
      const gone = prev.find((x) => x.id === id);
      const next = prev.filter((x) => x.id !== id); saveResults(next);
      if (gone?.exam) {
        const score = gone.score != null ? parseFloat(gone.score) : NaN;
        fire({ eventType: "ResultDeleted",
          metadata: { resultId: gone.id, exam: gone.exam, score: Number.isFinite(score) ? score : undefined },
          actor: { kind: "student" }, source: "ui" });
      }
      return next;
    });

  return (
    <>
      {goalNote && (
        <DismissibleNote id={goalNote.id} title={goalNote.text}>{goalNote.why}</DismissibleNote>
      )}
      <ProfileGoals goals={goals} onGoalsChange={updateGoals}
        results={results} onAddResult={addResult} onDeleteResult={deleteResult} />
    </>
  );
}
