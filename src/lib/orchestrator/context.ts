/* ═══════════════════════════════════════════════════════════════════════
   Duwairb Orchestration — السياق الموحّد
   ───────────────────────────────────────────────────────────────────────
   قبل الإجابة، يستشير دويرب كل المحرّكات ويبني سياقاً موحّداً يُسلَّم للنموذج.
   النموذج طبقة توليد لغة فقط — الذكاء الحقيقي داخل درب. حتميّ، مستقل عن المزوّد.
   ═══════════════════════════════════════════════════════════════════════ */
import { buildEducationalProfile } from "../darbKnowledge";
import { loadUser } from "../storage";
import { memory } from "../memory";
import { events } from "../events";
import { notifications, inQuietWindow } from "../notifications";
import { loadRecommendations } from "../recommendationClient";
import type { StudentContext } from "../memory/types";

/* السياق الموحّد — حصيلة استشارة المحرّكات الخمسة */
export interface DuwairbContext {
  knowledge: {
    phaseLabel: string;
    stage?: string;
    eligibility: { qudurat: boolean; tahsili: boolean; earlyTahsili: boolean; universityAdmission: boolean; recommendSTEP: boolean };
  } | null;
  memory: StudentContext;
  recentEvents: string[];                                  // ملخّصات أحدث الأحداث
  recommendations: { title: string; reason: string; priority: number; source: string }[];
  timing: { goodTimeNow: boolean; fatigue: number; note: string } | null;
}

/* يجمع السياق الموحّد من المحرّكات (عميل) */
export function buildDuwairbContext(opts: { now?: number } = {}): DuwairbContext {
  const now = opts.now ?? Date.now();

  // ٣) ذاكرة طويلة المدى
  const mem = memory().buildStudentContext();

  // ٤) أحداث حديثة
  const recentEvents = events().buildTimeline({ limit: 6 }).map((t) => t.summary);

  // ٥) توصيات نشطة (نفس مصدر اللوحة ⇒ اتساق تام)
  const recommendations = loadRecommendations(now).slice(0, 4)
    .map((r) => ({ title: r.title, reason: r.reason, priority: r.priority, source: r.source }));

  // ٢) معرفة تعليمية
  const u = loadUser();
  const knowledge = u ? (() => {
    const ep = buildEducationalProfile(u, { university: mem.currentGoal.university, stepTarget: undefined });
    return { phaseLabel: ep.phaseLabel, stage: ep.stage, eligibility: ep.eligibility };
  })() : null;

  // ٦) سياق التوقيت (إن كان التوقيت يهمّ)
  const nctx = notifications().gatherContext(now);
  const quiet = inQuietWindow(nctx.hour, nctx.quietWindows);
  const timing = {
    goodTimeNow: !quiet && !nctx.inApp && nctx.fatigue < 0.6,
    fatigue: nctx.fatigue,
    note: quiet ? `وقت هدوء (${quiet.label})` : nctx.fatigue >= 0.6 ? "إرهاق إشعارات مرتفع" : "وقت مناسب للتفاعل",
  };

  return { knowledge, memory: mem, recentEvents, recommendations, timing };
}

/* ينسّق السياق ككتلة عربية تُحقن في النموذج — «الذكاء المُسلَّم للّغة» (نقيّ) */
export function formatDuwairbContext(ctx: DuwairbContext): string {
  const lines: string[] = ["سياق الطالب من محرّكات درب (اعتمده مصدراً للحقيقة قبل معرفتك العامة، ولا تطلب من الطالب تكرار ما هو معروف هنا):"];

  const m = ctx.memory;
  if (m.identity.name) lines.push(`- الهوية: ${m.identity.name}${m.identity.studyLevel ? ` — ${m.identity.studyLevel}` : ""}${m.identity.grade ? ` (${m.identity.grade})` : ""}`);
  if (ctx.knowledge) {
    const e = ctx.knowledge.eligibility;
    const elig = [e.qudurat && "قدرات", e.tahsili && "تحصيلي", e.earlyTahsili && "تحصيلي مبكر", e.universityAdmission && "القبول الجامعي", e.recommendSTEP && "STEP"].filter(Boolean).join("، ");
    lines.push(`- المرحلة التعليمية: ${ctx.knowledge.phaseLabel}${elig ? ` — مؤهَّل لـ: ${elig}` : ""}`);
  }
  const goal = m.currentGoal;
  if (goal.university || goal.major || goal.targets.length) {
    const parts = [goal.major && `التخصص: ${goal.major}`, goal.university && `الجامعة: ${goal.university}`,
      goal.targets.length && `الأهداف: ${goal.targets.map((t) => `${t.exam} ${t.target}`).join("، ")}`].filter(Boolean);
    lines.push(`- الأهداف: ${parts.join(" · ")}`);
  }
  if (m.weakSubjects.length) lines.push(`- أحوج المواد: ${m.weakSubjects.slice(0, 3).join("، ")}`);
  if (m.strongSubjects.length) lines.push(`- أقوى المواد: ${m.strongSubjects.slice(0, 3).join("، ")}`);
  if (m.preferredStyle) lines.push(`- أسلوب التعلّم المفضّل: ${m.preferredStyle}`);
  if (m.bestStudyWindow) lines.push(`- وقت المذاكرة المعتاد: ${m.bestStudyWindow}`);
  if (m.recentLifeEvents.length) lines.push(`- أحداث مهمّة: ${m.recentLifeEvents.slice(0, 2).join("؛ ")}`);
  if (m.openThreads.length) lines.push(`- نقاش سابق مفتوح: ${m.openThreads[0]}`);

  if (ctx.recommendations.length) {
    const top = ctx.recommendations[0];
    lines.push(`- أولوية الطالب الآن (محرّك التوصيات — كن متّسقاً معها): ${top.title} — ${top.reason}`);
  }
  if (ctx.recentEvents.length) lines.push(`- آخر النشاط: ${ctx.recentEvents.slice(-3).join("؛ ")}`);
  if (ctx.timing && !ctx.timing.goodTimeNow) lines.push(`- ملاحظة توقيت: ${ctx.timing.note} — كن موجزاً ولا تُثقِل.`);

  lines.push("القاعدة: اعتمد هذا السياق، واتّسق مع أولوية محرّك التوصيات، ولا تكرّر أسئلة معلومة إجاباتها أعلاه.");
  return lines.join("\n");
}
