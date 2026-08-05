/* ═══════════════════════════════════════════════════════════════════════
   Event Engine — الأنواع (الجهاز العصبي لدرب)
   ───────────────────────────────────────────────────────────────────────
   كل فعل ذي معنى يصبح حدثاً مجالياً (domain event). المحرّك لا يعرف الواجهة
   ولا الصفحات ولا المكوّنات — يعرف الأحداث المجالية فقط. سجلّ الأحداث
   (append-only) هو مصدر الحقيقة الوحيد لـ«ما الذي حدث». الذاكرة والتوصيات
   والإشعارات والتحليلات كلّها «مُتفاعلات» (reactors) مشتركة منفصلة.

   Typed Registry (اتساقاً مع محرّك الذاكرة): لكل نوع حدث مخطّط بيانات وصفية
   مُلزَم بـ TypeScript. إضافة نوع حدث تُجبر على إدخاله في السجلّ.
   حتميّ ومستقل عن أي مزوّد — يدعم replay وتدقيقاً وتصحيحاً وتحليلات مستقبلية.
   ═══════════════════════════════════════════════════════════════════════ */
import type { EduStage } from "../memory/types";

export type { EduStage };

/* الفاعل — من أحدث الحدث (لا علاقة له بالواجهة) */
export interface EventActor { kind: "student" | "system" | "duwairb"; id?: string }

/* المصدر — أصل خشن فقط (ليس صفحة/مكوّناً — المحرّك لا يعرف الواجهة) */
export type EventSource = "ui" | "engine" | "migration" | "system";

/* تصنيف الأحداث (للجدول الزمني والتحليلات) */
export type EventCategory =
  | "lifecycle" | "session" | "learning" | "exam" | "goal"
  | "recommendation" | "notification" | "conversation"
  | "community" | "document" | "system";

/* لقطة استيراد بيانات الطالب (لحدث التسجيل/الترحيل — تجعل replay مكتفياً ذاتياً) */
export interface ImportSnapshot {
  name?: string; age?: number; region?: string; school?: string;
  studyLevel?: "ثانوي" | "جامعي" | "خريج"; grade?: string; studyHours?: number;
  targets?: { exam: string; target: number }[];
  university?: string; major?: string;
}

/* ════════════════════════════════════════════════════════════
   خريطة البيانات الوصفية لكل نوع حدث (Typed Registry)
   ════════════════════════════════════════════════════════════ */
export interface EventMetaMap {
  /* ── دورة الحياة ── */
  "StudentRegistered":      { snapshot: ImportSnapshot };
  "UniversityPhaseEntered": { from?: string };
  "CareerPhaseEntered":     { from?: string };
  /* تغيّرُ المرحلة — الحدثُ العامُّ الذي تُكتب به الذاكرة. أُنشئ لأن ترقيةَ
     الصفوف ومخرجَها إلى «خريج ثانوي» **لا حدثَ لهما إطلاقاً**، ومعمارُ الذاكرة
     صارم: لا تُكتب مباشرة. فبلا حدثٍ تبقى `identity.studyLevel` تقول «ثانوي»
     عن خرّيج — وهي `pinned` بلا اضمحلال، أي كذبةٌ أبدية.
     `from`/`to` معرّفا المرحلة في `transition/registry`، و`studyLevel`/`grade`
     قيمتاها كما تُحفظان في ملفّ الطالب (لا اشتقاقَ في المُتفاعِل). */
  "StudentPhaseChanged": {
    from?: string; to: string;
    studyLevel?: "ثانوي" | "جامعي" | "خريج";
    grade?: string;
    clearedGrade?: boolean;
  };

  /* ── الجلسات ── */
  "StudentStartedSession":  { sessionKind?: string; subject?: string };
  "StudentFinishedSession": { minutes: number; subject?: string };
  /* تخطّي مهمّةٍ من خطّة اليوم — كان يُسجَّل في التحليلات وحدها، فلا تعرفه الذاكرة
     ولا دويرب. والتخطّي إشارةٌ عن الطالب أصدقُ من كثيرٍ ممّا ينجزه. */
  "SessionTaskSkipped":     { taskKind: string; subject?: string; reason: string };

  /* ── التعلّم ── */
  "QuestionAnswered":  { subject?: string; correct: boolean; topic?: string };
  "LessonCompleted":   { subject: string; lessonKey: string; phase?: string };
  "FlashcardReviewed": { cardId?: string; grade?: number; subject?: string };
  "OrbitNodeUnlocked": { node: string };

  /* ── الاختبارات والدرجات ── */
  "ExamCompleted": { exam: string; score?: number };
  "ScoreUpdated":  { exam: string; score: number; prev?: number };
  "STEPStarted":   Record<string, never>;
  "STEPCompleted": { score?: number };

  /* ── الأهداف ── */
  "GoalChanged":       { field: "university" | "major" | "targetScore" | "general"; value: string; exam?: string; target?: number; prev?: string };
  "UniversitySelected":{ university: string };
  "StudyPlanUpdated":  { totalHours?: number };

  /* ── التوصيات والإشعارات ── */
  "RecommendationAccepted":  { recId: string; source: string; targetPage?: string };
  "RecommendationDismissed": { recId: string; source: string };

  /* دورة حياة الإشعار — كلها أحداث (لا حالة موازية) */
  "NotificationCreated":   { notificationId: string; notifType: string; recId?: string; composite: number };
  "NotificationScheduled": { notificationId: string; deliverAt: number };
  "NotificationSent":      { notificationId: string; notifType: string; transport: string };
  "NotificationDelivered": { notificationId: string };
  "NotificationOpened":    { notificationId: string };
  "NotificationDismissed": { notificationId: string };
  "NotificationCompleted": { notificationId: string };
  "NotificationMerged":    { notificationId: string; into: string };
  "NotificationCancelled": { notificationId: string; reason: string };

  /* ── المحادثات (دويرب) ── */
  "DuwairbConversationStarted":  { topic?: string; tab?: string };
  "DuwairbConversationFinished": { topic?: string; messages?: number };
  /* استعمالُ أداةٍ من أدوات دويرب (جدول · تقدّم · أسئلة · شرح) — الطريقُ الوحيد
     الذي تُكتب به «ذاكرةُ المدرّب» بعد دمجها في محرّك الذاكرة. */
  "CoachInteractionUsed": {
    mode: "schedule" | "progress" | "quiz" | "explain";
    summary: string;
    date: string;
    subjects?: string[];
    goalLine?: string;
    recommendation?: string;
  };

  /* ── المجتمع والتحديات ── */
  "CommunityJoined":   { group: string };
  "ChallengeCompleted":{ challenge: string; reward?: number };

  /* ── المستندات ── */
  "DocumentUploaded": { kind?: string; pages?: number };

  /* ── الخزنة (أخطائي) ── */
  "VaultErrorAdded": { subject: string; category?: string; difficulty?: string };

  /* ── ملاحظات الذاكرة (للتدقيق/التحليلات — لا تُغذّي الذاكرة تفادياً للحلقات) ── */
  "MemoryCreated": { memoryId: string; memoryType: string };
  "MemoryUpdated": { memoryId: string; memoryType: string };

  /* ── النظام ── */
  "ReactorFailed": { reactor: string; eventType: string; error: string };
}

export type EventType = keyof EventMetaMap;

/* ════════════════════════════════════════════════════════════
   الحدث المجالي — DomainEvent<T>
   ════════════════════════════════════════════════════════════ */
export interface DomainEvent<T extends EventType = EventType> {
  id: string;                 // مُرتَّب ومتزايد
  eventType: T;
  timestamp: number;
  actor: EventActor;
  educationalStage: EduStage;
  source: EventSource;
  metadata: EventMetaMap[T];
  correlationId: string;      // يربط أحداث تدفّق واحد (جلسة/محاولة اختبار)
  sessionId: string;
  version: number;
}

/* اتحاد مُميَّز على eventType — يُمكّن تضييق metadata في المُتفاعلين */
export type AnyEvent = { [K in EventType]: DomainEvent<K> }[EventType];

/* مدخل الإطلاق — الباقي يُملأ بقيم افتراضية */
export interface EmitInput<T extends EventType = EventType> {
  eventType: T;
  metadata: EventMetaMap[T];
  actor?: EventActor;
  educationalStage?: EduStage;
  source?: EventSource;
  correlationId?: string;
  sessionId?: string;
  timestamp?: number;
}

/* ════════════════════════════════════════════════════════════
   تعريف نوع الحدث في السجلّ
   ════════════════════════════════════════════════════════════ */
export interface EventTypeDef<T extends EventType = EventType> {
  type: T;
  category: EventCategory;
  /** حدث جدير بالجدول الزمني (معلَم في رحلة الطالب) */
  milestone: boolean;
  /** تسمية عربية للجدول الزمني (افتراضها نوع الحدث) */
  label?: (e: DomainEvent<T>) => string;
  /** تحقّق اختياري من البيانات الوصفية */
  validate?: (m: EventMetaMap[T]) => boolean;
}

/* السجلّ كنوع مُربَط — يُجبر على إدخال كل نوع حدث */
export type EventRegistry = { [K in EventType]: EventTypeDef<K> };

/* ════════════════════════════════════════════════════════════
   الاشتراك والاستعلام
   ════════════════════════════════════════════════════════════ */
export type EventHandler = (e: AnyEvent) => void;

export interface Subscription {
  handler: EventHandler;
  filter?: EventType[];   // undefined = كل الأنواع
  name?: string;          // لاسم المُتفاعل (للتشخيص)
}

export interface EventQuery {
  eventType?: EventType | EventType[];
  category?: EventCategory | EventCategory[];
  stage?: EduStage | EduStage[];
  actorKind?: EventActor["kind"];
  correlationId?: string;
  sessionId?: string;
  since?: number;
  until?: number;
  limit?: number;
}

export interface TimelineEntry {
  id: string;
  at: number;
  eventType: EventType;
  category: EventCategory;
  stage: EduStage;
  summary: string;
}

/* مغذّي التحليلات — واجهة قابلة للتوصيل (مستقلّة عن أي مزوّد) */
export interface AnalyticsSink {
  capture(eventType: EventType, props: Record<string, unknown>): void;
}
