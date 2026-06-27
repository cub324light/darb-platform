/* ═══════════════════════════════════════════════════════════════════════
   Event Registry — سجلّ أنواع الأحداث (تصنيف + معالم + تسميات)
   النوع EventRegistry مُربَط على EventType، فإضافة نوع حدث تُحدِث خطأ
   TypeScript هنا حتى يُضاف إدخاله — لا حدث بلا تعريف.
   ═══════════════════════════════════════════════════════════════════════ */
import type { EventRegistry, EventType, EventCategory } from "./types";

export const EVENT_REGISTRY: EventRegistry = {
  /* دورة الحياة */
  StudentRegistered:      { type: "StudentRegistered", category: "lifecycle", milestone: true, label: () => "انضمّ إلى درب" },
  UniversityPhaseEntered: { type: "UniversityPhaseEntered", category: "lifecycle", milestone: true, label: () => "دخل المرحلة الجامعية" },
  CareerPhaseEntered:     { type: "CareerPhaseEntered", category: "lifecycle", milestone: true, label: () => "دخل مرحلة العمل" },

  /* الجلسات */
  StudentStartedSession:  { type: "StudentStartedSession", category: "session", milestone: false, label: () => "بدأ جلسة تركيز" },
  StudentFinishedSession: { type: "StudentFinishedSession", category: "session", milestone: false,
    label: (e) => `أنهى جلسة ${e.metadata.minutes} دقيقة${e.metadata.subject ? ` — ${e.metadata.subject}` : ""}`,
    validate: (m) => Number.isFinite(m.minutes) && m.minutes >= 0 },

  /* التعلّم */
  QuestionAnswered:  { type: "QuestionAnswered", category: "learning", milestone: false },
  LessonCompleted:   { type: "LessonCompleted", category: "learning", milestone: false,
    label: (e) => `أكمل درس ${e.metadata.subject}`,
    validate: (m) => !!m.subject && !!m.lessonKey },
  FlashcardReviewed: { type: "FlashcardReviewed", category: "learning", milestone: false },
  OrbitNodeUnlocked: { type: "OrbitNodeUnlocked", category: "learning", milestone: true,
    label: (e) => `فتح ${e.metadata.node}` },

  /* الاختبارات والدرجات */
  ExamCompleted: { type: "ExamCompleted", category: "exam", milestone: true,
    label: (e) => `أكمل اختبار ${e.metadata.exam}${e.metadata.score != null ? ` (${e.metadata.score})` : ""}`,
    validate: (m) => !!m.exam },
  ScoreUpdated:  { type: "ScoreUpdated", category: "exam", milestone: true,
    label: (e) => `سجّل ${e.metadata.score} في ${e.metadata.exam}`,
    validate: (m) => !!m.exam && Number.isFinite(m.score) },
  STEPStarted:   { type: "STEPStarted", category: "exam", milestone: true, label: () => "بدأ STEP" },
  STEPCompleted: { type: "STEPCompleted", category: "exam", milestone: true, label: () => "أكمل STEP" },

  /* الأهداف */
  GoalChanged:       { type: "GoalChanged", category: "goal", milestone: true,
    label: (e) => `غيّر هدفه (${e.metadata.field}): ${e.metadata.value}`,
    validate: (m) => !!m.field && !!m.value },
  UniversitySelected:{ type: "UniversitySelected", category: "goal", milestone: true,
    label: (e) => `اختار ${e.metadata.university}` },
  StudyPlanUpdated:  { type: "StudyPlanUpdated", category: "goal", milestone: false },

  /* التوصيات والإشعارات */
  RecommendationAccepted:  { type: "RecommendationAccepted", category: "recommendation", milestone: false,
    validate: (m) => !!m.recId },
  RecommendationDismissed: { type: "RecommendationDismissed", category: "recommendation", milestone: false,
    validate: (m) => !!m.recId },
  NotificationOpened:      { type: "NotificationOpened", category: "notification", milestone: false },

  /* المحادثات */
  DuwairbConversationStarted:  { type: "DuwairbConversationStarted", category: "conversation", milestone: false },
  DuwairbConversationFinished: { type: "DuwairbConversationFinished", category: "conversation", milestone: false },

  /* المجتمع والتحديات */
  CommunityJoined:   { type: "CommunityJoined", category: "community", milestone: false,
    label: (e) => `انضمّ إلى ${e.metadata.group}` },
  ChallengeCompleted:{ type: "ChallengeCompleted", category: "community", milestone: true,
    label: (e) => `أكمل تحدي ${e.metadata.challenge}` },

  /* المستندات */
  DocumentUploaded: { type: "DocumentUploaded", category: "document", milestone: false },

  /* ملاحظات الذاكرة */
  MemoryCreated: { type: "MemoryCreated", category: "system", milestone: false },
  MemoryUpdated: { type: "MemoryUpdated", category: "system", milestone: false },

  /* النظام */
  ReactorFailed: { type: "ReactorFailed", category: "system", milestone: false },
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_REGISTRY) as EventType[];
export function eventCategoryOf(type: EventType): EventCategory {
  return EVENT_REGISTRY[type].category;
}
