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
      "StudentFinishedSession", "SessionTaskSkipped", "VaultErrorAdded",
      "UniversityPhaseEntered", "CareerPhaseEntered", "StudentPhaseChanged",
      "DuwairbConversationFinished", "CoachInteractionUsed",
      "StudentProfileCorrected", "ResultDeleted",
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
        /* التخطّي إشارةُ ضعفٍ في المادّة — لا حكمٌ على الطالب. `severity` منخفضة
           لأنّ سببَ التخطّي قد يكون الوقتَ لا الصعوبة؛ والتكرارُ يرفع الثقةَ
           بتراكم الأدلّة لا برفعنا الرقمَ يدوياً. */
        case "SessionTaskSkipped":
          if (e.metadata.subject) {
            mem.remember({ type: "learning.weakSubject", value: { subject: e.metadata.subject, severity: 0.3 },
              source: "inferred", educationalStage: stage, evidence: evidence(e) });
          }
          break;
        /* خطأٌ مسجَّلٌ بيد الطالب — أقوى دليلٍ على ضعف مادّة، وهو فعلٌ لا رأي. */
        case "VaultErrorAdded":
          mem.remember({ type: "learning.weakSubject", value: { subject: e.metadata.subject, severity: 0.5 },
            source: "event", educationalStage: stage, evidence: evidence(e) });
          break;
        /* ▓ تغيّرُ المرحلة — الذاكرةُ تُحدَّث في مكانها لا تُبنى من جديد:
           `identity.studyLevel` و`identity.grade` لهما `naturalKey: "self"`
           فمعرّفُهما ثابت، و`remember` يدمج ويرفع النسخة بلا سجلٍّ ثانٍ.
           والصفُّ الذي لم يعد صحيحاً (ثالث ← خريج) يُبطَل لا يُحذَف: يبقى
           بتاريخه ودليله ويخرج من القراءة — فلا يظنّ دويربُ خرّيجاً ثالثَ ثانوي. */
        case "StudentPhaseChanged": {
          const m = e.metadata;
          if (m.studyLevel) {
            mem.remember({ type: "identity.studyLevel", value: { level: m.studyLevel },
              source: "event", educationalStage: stage, evidence: evidence(e) });
          }
          if (m.grade) {
            mem.remember({ type: "identity.grade", value: { grade: m.grade },
              source: "event", educationalStage: stage, evidence: evidence(e) });
          } else if (m.clearedGrade) {
            mem.invalidateMemory("identity.grade:self", `انتقل إلى ${m.to} — لم يعد له صفٌّ دراسيّ`);
          }
          break;
        }
        /* ▓ تصحيحُ بياناتٍ في ملفٍّ قائم — **الهويةُ وحدَها**. قِسنا العطل: طالبٌ
           يصحّح صفَّه من «أول» إلى «ثالث» فيقول ملفُّه ثالثاً ويقول برومبت دويرب
           «الهوية: … (أول ثانوي)» إلى الأبد (بذرةُ الذاكرة محروسةٌ بعلَمٍ فلا تُعاد).
           والمفاتيحُ الطبيعيةُ تجعله متماثلاً: ألفُ تصحيحٍ بنفس القيمة = سجلٌّ واحد.
           ولا يمسّ هدفاً ولا درجةً ولا مرحلةً ولا وحدة. */
        case "StudentProfileCorrected": {
          const m = e.metadata;
          if (m.name) mem.remember({ type: "identity.name", value: { name: m.name }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          if (typeof m.age === "number") mem.remember({ type: "identity.age", value: { age: m.age }, source: "explicit", evidence: evidence(e) });
          if (m.region) mem.remember({ type: "identity.region", value: { region: m.region }, source: "explicit", evidence: evidence(e) });
          if (m.school) mem.remember({ type: "identity.school", value: { school: m.school }, source: "explicit", evidence: evidence(e) });
          if (m.studyLevel) mem.remember({ type: "identity.studyLevel", value: { level: m.studyLevel }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          if (m.grade) mem.remember({ type: "identity.grade", value: { grade: m.grade }, source: "explicit", educationalStage: stage, evidence: evidence(e) });
          else if (m.clearedGrade) mem.invalidateMemory("identity.grade:self", "صحّح ملفَّه — لم يعد له صفٌّ دراسيّ");
          break;
        }
        /* ▓ حذفُ نتيجة: السجلُّ append-only فلا يُمحى حدثُ التسجيل — يبقى تاريخاً
           صادقاً، ويُلحَق الحذفُ بعده فيصير هو **الأحدث** في «آخر النشاط».
           وتُبطَل الذاكرةُ التي تعتمد على النتيجة بمعرّفٍ حتميٍّ مشتقٍّ من اسم
           الاختبار — لا مطابقةَ لنصّ عرض. (الإبطالُ لا يحذف: يبقى بتاريخه ودليله
           ويخرج من كلّ قراءةٍ حيّة.) */
        case "ResultDeleted": {
          mem.invalidateMemory(`learning.subjectMastery:${e.metadata.exam}`,
            `حذف الطالبُ نتيجةَ ${e.metadata.exam}`);
          break;
        }
        case "UniversityPhaseEntered":
          mem.remember({ type: "identity.studyLevel", value: { level: "جامعي" }, source: "event", educationalStage: "university", evidence: evidence(e) });
          mem.remember({ type: "relationship.milestone", value: { text: "دخل المرحلة الجامعية" }, source: "event", educationalStage: "university", dedupeKey: e.id, evidence: evidence(e) });
          break;
        case "CareerPhaseEntered":
          mem.remember({ type: "relationship.milestone", value: { text: "دخل مرحلة العمل" }, source: "event", educationalStage: "career", dedupeKey: e.id, evidence: evidence(e) });
          break;
        /* ▓ ذاكرةُ المدرّب كانت مخزناً ثانياً مستقلاً (`darb_coach_memory`) تكتبه
           أربعةُ مكوّناتٍ بيدها ويقرؤه `DuirbHub` — ذاكرتان لدويرب لا تعرف
           إحداهما الأخرى. صارت ذاكرةً واحدة، ومَعبرُها هذا المُتفاعِلُ كغيره:
           سجلٌّ واحدٌ بمفتاحٍ طبيعيٍّ ثابت يُدمج في مكانه بلا تكديس. */
        case "CoachInteractionUsed": {
          const m = e.metadata;
          mem.remember({
            type: "conversation.coachInteraction",
            value: { mode: m.mode, summary: m.summary, date: m.date, subjects: m.subjects, goalLine: m.goalLine, recommendation: m.recommendation },
            source: "duwairb", educationalStage: stage, evidence: evidence(e),
          });
          break;
        }
        case "DuwairbConversationFinished":
          // المحادثات السابقة تُحفظ كحقيقة بارزة (معرّف حتميّ للاستعادة)
          if (e.metadata.topic && (e.metadata.messages ?? 0) > 0) {
            mem.remember({ type: "conversation.salientFact", value: { text: `سأل دويرب عن: ${e.metadata.topic}` }, source: "duwairb", educationalStage: stage, dedupeKey: e.id, evidence: evidence(e) });
          }
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
