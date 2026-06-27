/* ═══════════════════════════════════════════════════════════════════════
   Reactors — المُتفاعلات (مشتركون منفصلون يشتقّون الحالة من الأحداث)
   لا تعرف الواجهة. تستهلك الأحداث وتكتب الذاكرة/التحليلات. كل ذاكرة مشتقّة
   من حدث تستخدم معرّفاً حتمياً (مفتاح طبيعي أو dedupeKey = معرّف الحدث) كي
   تكون الاستعادة (replay) متطابقة. لا شيء يحدّث الذاكرة مباشرة — فقط هنا.
   ═══════════════════════════════════════════════════════════════════════ */
import type { AnyEvent, EventType, EventHandler, AnalyticsSink } from "./types";
import type { MemoryEngine } from "../memory/engine";
import type { EduStage, MemoryEvidence } from "../memory/types";

export interface Reactor {
  name: string;
  handles?: EventType[];   // undefined = كل الأنواع
  react: EventHandler;
}

/* ════════════════════════════════════════════════════════════
   MemoryReactor — الأحداث ← الذاكرة (المصدر الوحيد لكتابة الذاكرة)
   ════════════════════════════════════════════════════════════ */
export function makeMemoryReactor(mem: MemoryEngine): Reactor {
  const evidence = (e: AnyEvent): MemoryEvidence[] => [{ kind: "event", ref: e.id, at: e.timestamp }];

  return {
    name: "MemoryReactor",
    handles: [
      "StudentRegistered", "GoalChanged", "UniversitySelected",
      "ScoreUpdated", "ExamCompleted", "STEPCompleted",
      "StudentFinishedSession", "UniversityPhaseEntered", "CareerPhaseEntered",
    ],
    react: (e) => {
      const stage = e.educationalStage as EduStage;
      switch (e.eventType) {
        case "StudentRegistered": {
          const s = e.metadata.snapshot;
          if (s.name) mem.remember({ type: "identity.name", value: { name: s.name }, source: "onboarding", educationalStage: stage, evidence: evidence(e) });
          if (typeof s.age === "number") mem.remember({ type: "identity.age", value: { age: s.age }, source: "onboarding", evidence: evidence(e) });
          if (s.region) mem.remember({ type: "identity.region", value: { region: s.region }, source: "onboarding", evidence: evidence(e) });
          if (s.school) mem.remember({ type: "identity.school", value: { school: s.school }, source: "onboarding", evidence: evidence(e) });
          if (s.studyLevel) mem.remember({ type: "identity.studyLevel", value: { level: s.studyLevel }, source: "onboarding", educationalStage: stage, evidence: evidence(e) });
          if (s.grade) mem.remember({ type: "identity.grade", value: { grade: s.grade }, source: "onboarding", educationalStage: stage, evidence: evidence(e) });
          if (typeof s.studyHours === "number") mem.remember({ type: "behavior.studyHoursPerDay", value: { hours: s.studyHours }, source: "onboarding", evidence: evidence(e) });
          for (const t of s.targets ?? []) mem.remember({ type: "goal.targetScore", value: { exam: t.exam, target: t.target }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          if (s.university) mem.remember({ type: "goal.targetUniversity", value: { university: s.university }, source: "explicit", evidence: evidence(e) });
          if (s.major) mem.remember({ type: "goal.targetMajor", value: { major: s.major }, source: "explicit", evidence: evidence(e) });
          break;
        }
        case "GoalChanged": {
          const m = e.metadata;
          if (m.field === "university") mem.remember({ type: "goal.targetUniversity", value: { university: m.value }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          else if (m.field === "major") mem.remember({ type: "goal.targetMajor", value: { major: m.value }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          else if (m.field === "targetScore" && m.exam && typeof m.target === "number") mem.remember({ type: "goal.targetScore", value: { exam: m.exam, target: m.target }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          else mem.remember({ type: "goal.ambition", value: { text: m.value, horizon: "long" }, source: "explicit", educationalStage: stage, dedupeKey: e.id, evidence: evidence(e) });
          break;
        }
        case "UniversitySelected":
          mem.remember({ type: "goal.targetUniversity", value: { university: e.metadata.university }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          break;
        case "ScoreUpdated":
          // درجة فعلية → إتقان المادة (تقدير)
          mem.remember({ type: "learning.subjectMastery", value: { subject: e.metadata.exam, mastery: clamp01(e.metadata.score / 100) }, source: "event", educationalStage: stage, evidence: evidence(e) });
          break;
        case "ExamCompleted":
          mem.remember({ type: "relationship.milestone", value: { text: `أكمل اختبار ${e.metadata.exam}` }, source: "event", educationalStage: stage, dedupeKey: e.id, evidence: evidence(e) });
          break;
        case "STEPCompleted":
          mem.remember({ type: "relationship.milestone", value: { text: "أكمل اختبار STEP" }, source: "event", educationalStage: stage, dedupeKey: e.id, evidence: evidence(e) });
          break;
        case "StudentFinishedSession":
          mem.remember({ type: "behavior.sessionLength", value: { minutes: e.metadata.minutes }, source: "inferred", educationalStage: stage, evidence: evidence(e) });
          break;
        case "UniversityPhaseEntered":
          mem.remember({ type: "identity.studyLevel", value: { level: "جامعي" }, source: "event", educationalStage: "university", evidence: evidence(e) });
          mem.remember({ type: "relationship.milestone", value: { text: "دخل المرحلة الجامعية" }, source: "event", educationalStage: "university", dedupeKey: e.id, evidence: evidence(e) });
          break;
        case "CareerPhaseEntered":
          mem.remember({ type: "relationship.milestone", value: { text: "دخل مرحلة العمل" }, source: "event", educationalStage: "career", dedupeKey: e.id, evidence: evidence(e) });
          break;
      }
    },
  };
}

/* ════════════════════════════════════════════════════════════
   RecommendationReactor — تغذية راجعة للتوصيات ← ذاكرة السلوك
   (يغلق الحلقة: قبول/تجاهل التوصية يُحدّث acceptedRate لمصدرها)
   ════════════════════════════════════════════════════════════ */
export function makeRecommendationReactor(mem: MemoryEngine): Reactor {
  const update = (source: string, accepted: boolean, e: AnyEvent) => {
    const id = `behavior.nudgeResponse:${source}`;
    const prev = mem.all().find((m) => m.id === id);
    const prevRate = (prev?.value as { acceptedRate?: number })?.acceptedRate ?? 0;
    const prevN = (prev?.value as { samples?: number })?.samples ?? 0;
    const samples = prevN + 1;
    const acceptedRate = (prevRate * prevN + (accepted ? 1 : 0)) / samples;
    mem.remember({
      type: "behavior.nudgeResponse",
      value: { source, acceptedRate, samples },
      source: "event",
      evidence: [{ kind: "event", ref: e.id, at: e.timestamp }],
    });
  };
  return {
    name: "RecommendationReactor",
    handles: ["RecommendationAccepted", "RecommendationDismissed"],
    react: (e) => {
      if (e.eventType === "RecommendationAccepted") update(e.metadata.source, true, e);
      else if (e.eventType === "RecommendationDismissed") update(e.metadata.source, false, e);
    },
  };
}

/* ════════════════════════════════════════════════════════════
   AnalyticsReactor — يمرّر كل حدث إلى مغذٍّ قابل للتوصيل (لا مزوّد محدّد)
   ════════════════════════════════════════════════════════════ */
export function makeAnalyticsReactor(sink: AnalyticsSink): Reactor {
  return {
    name: "AnalyticsReactor",
    react: (e) => {
      if (e.eventType === "ReactorFailed") return; // لا نُرسل أخطاء التفاعل للتحليلات
      sink.capture(e.eventType, {
        stage: e.educationalStage,
        actor: e.actor.kind,
        source: e.source,
        correlationId: e.correlationId,
        ...flatten(e.metadata),
      });
    },
  };
}

/* مُغذٍّ صامت افتراضي — يُبقي المحرّك مستقلاً عن أي مزوّد */
export const NoopAnalyticsSink: AnalyticsSink = { capture: () => {} };

/* مساعدات */
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function flatten(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object") return meta as Record<string, unknown>;
  return {};
}
