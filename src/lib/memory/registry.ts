/* ═══════════════════════════════════════════════════════════════════════
   Memory Registry — سجلّ أنواع الذاكرة (سياسات لكل نوع)
   النوع MemoryRegistry مُربَط على MemoryType، فإضافة نوع جديد إلى
   MemoryValueMap تُحدِث خطأ TypeScript هنا حتى يُضاف إدخاله — لا نوع بلا سياسة.
   ═══════════════════════════════════════════════════════════════════════ */
import type { MemoryRegistry, MemoryType, MemoryCategory } from "./types";

const DAY = 1; // وحدة decayHalfLifeDays بالأيام

export const MEMORY_REGISTRY: MemoryRegistry = {
  /* ── Identity — مفردة لكل طالب (naturalKey ثابت) فلا تتكرر وتُستعاد بثبات ── */
  "identity.name": {
    type: "identity.name", category: "identity",
    defaultImportance: 0.98, defaultConfidence: 1, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: () => "self",
    validate: (v) => typeof v.name === "string" && v.name.trim().length > 0,
    deriveTags: () => ["identity", "name"],
  },
  "identity.age": {
    type: "identity.age", category: "identity",
    defaultImportance: 0.6, defaultConfidence: 0.95, decayHalfLifeDays: 365 * DAY, pinned: false,
    naturalKey: () => "self",
    validate: (v) => Number.isFinite(v.age) && v.age > 0 && v.age < 120,
    deriveTags: () => ["identity", "age"],
  },
  "identity.region": {
    type: "identity.region", category: "identity",
    defaultImportance: 0.7, defaultConfidence: 0.95, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: () => "self",
    validate: (v) => typeof v.region === "string" && v.region.length > 0,
    deriveTags: (v) => ["identity", "region", v.region],
  },
  "identity.school": {
    type: "identity.school", category: "identity",
    defaultImportance: 0.6, defaultConfidence: 0.9, decayHalfLifeDays: 365 * DAY, pinned: false,
    naturalKey: () => "self",
    validate: (v) => typeof v.school === "string" && v.school.length > 0,
    deriveTags: () => ["identity", "school"],
  },
  "identity.studyLevel": {
    type: "identity.studyLevel", category: "identity",
    defaultImportance: 0.92, defaultConfidence: 0.95, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: () => "self",
    validate: (v) => v.level === "ثانوي" || v.level === "جامعي" || v.level === "خريج",
    deriveTags: (v) => ["identity", "stage", v.level],
  },
  "identity.grade": {
    type: "identity.grade", category: "identity",
    defaultImportance: 0.8, defaultConfidence: 0.9, decayHalfLifeDays: 300 * DAY, pinned: false,
    naturalKey: () => "self",
    validate: (v) => typeof v.grade === "string" && v.grade.length > 0,
    deriveTags: (v) => ["identity", "grade", v.grade],
  },

  /* ── Learning — تُدمَج حسب المادة، اضمحلال بطيء ── */
  "learning.weakSubject": {
    type: "learning.weakSubject", category: "learning",
    defaultImportance: 0.85, defaultConfidence: 0.7, decayHalfLifeDays: 120 * DAY, pinned: false,
    naturalKey: (v) => v.subject,
    validate: (v) => typeof v.subject === "string" && v.subject.length > 0 && (v.severity == null || (v.severity >= 0 && v.severity <= 1)),
    deriveTags: (v) => ["learning", "weak", v.subject],
  },
  "learning.strongSubject": {
    type: "learning.strongSubject", category: "learning",
    defaultImportance: 0.7, defaultConfidence: 0.7, decayHalfLifeDays: 120 * DAY, pinned: false,
    naturalKey: (v) => v.subject,
    validate: (v) => typeof v.subject === "string" && v.subject.length > 0,
    deriveTags: (v) => ["learning", "strong", v.subject],
  },
  "learning.subjectMastery": {
    type: "learning.subjectMastery", category: "learning",
    defaultImportance: 0.6, defaultConfidence: 0.65, decayHalfLifeDays: 90 * DAY, pinned: false,
    naturalKey: (v) => v.subject,
    validate: (v) => typeof v.subject === "string" && Number.isFinite(v.mastery) && v.mastery >= 0 && v.mastery <= 1,
    deriveTags: (v) => ["learning", "mastery", v.subject],
  },
  "learning.explanationStyle": {
    type: "learning.explanationStyle", category: "learning",
    defaultImportance: 0.8, defaultConfidence: 0.6, decayHalfLifeDays: 180 * DAY, pinned: false,
    naturalKey: () => "style", // تفضيل واحد سائد
    validate: (v) => ["مبسّط", "تفصيلي", "بالأمثلة", "بصري", "سريع"].includes(v.style),
    deriveTags: (v) => ["learning", "style", v.style],
  },
  "learning.method": {
    type: "learning.method", category: "learning",
    defaultImportance: 0.65, defaultConfidence: 0.6, decayHalfLifeDays: 180 * DAY, pinned: false,
    naturalKey: (v) => v.method,
    validate: (v) => typeof v.method === "string" && v.method.length > 0,
    deriveTags: (v) => ["learning", "method", v.method],
  },
  "learning.pace": {
    type: "learning.pace", category: "learning",
    defaultImportance: 0.55, defaultConfidence: 0.6, decayHalfLifeDays: 180 * DAY, pinned: false,
    naturalKey: () => "pace",
    validate: (v) => ["بطيء", "متوسط", "سريع"].includes(v.pace),
    deriveTags: (v) => ["learning", "pace", v.pace],
  },

  /* ── Behavior — مستنتجة، اضمحلال متوسط ── */
  "behavior.studyWindow": {
    type: "behavior.studyWindow", category: "behavior",
    defaultImportance: 0.6, defaultConfidence: 0.5, decayHalfLifeDays: 60 * DAY, pinned: false,
    naturalKey: () => "window",
    validate: (v) => ["صباح", "ظهر", "مساء", "ليل"].includes(v.window),
    deriveTags: (v) => ["behavior", "time", v.window],
  },
  "behavior.sessionLength": {
    type: "behavior.sessionLength", category: "behavior",
    defaultImportance: 0.5, defaultConfidence: 0.55, decayHalfLifeDays: 60 * DAY, pinned: false,
    naturalKey: () => "sessionLength",
    validate: (v) => Number.isFinite(v.minutes) && v.minutes > 0 && v.minutes <= 600,
    deriveTags: () => ["behavior", "session"],
  },
  "behavior.consistency": {
    type: "behavior.consistency", category: "behavior",
    defaultImportance: 0.6, defaultConfidence: 0.6, decayHalfLifeDays: 45 * DAY, pinned: false,
    naturalKey: () => "consistency",
    validate: (v) => ["منخفض", "متوسط", "عالٍ"].includes(v.level),
    deriveTags: (v) => ["behavior", "consistency", v.level],
  },
  "behavior.studyHoursPerDay": {
    type: "behavior.studyHoursPerDay", category: "behavior",
    defaultImportance: 0.55, defaultConfidence: 0.6, decayHalfLifeDays: 60 * DAY, pinned: false,
    naturalKey: () => "hoursPerDay",
    validate: (v) => Number.isFinite(v.hours) && v.hours >= 0 && v.hours <= 24,
    deriveTags: () => ["behavior", "hours"],
  },
  "behavior.nudgeResponse": {
    type: "behavior.nudgeResponse", category: "behavior",
    defaultImportance: 0.5, defaultConfidence: 0.6, decayHalfLifeDays: 90 * DAY, pinned: false,
    naturalKey: (v) => v.source,
    validate: (v) => typeof v.source === "string" && v.acceptedRate >= 0 && v.acceptedRate <= 1 && v.samples >= 0,
    deriveTags: (v) => ["behavior", "nudge", v.source],
  },

  /* ── Goal — عالية الأهمية، تُبطَل عند التغيير لا تضمحل ── */
  "goal.targetScore": {
    type: "goal.targetScore", category: "goal",
    defaultImportance: 0.9, defaultConfidence: 0.9, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: (v) => v.exam,
    validate: (v) => typeof v.exam === "string" && Number.isFinite(v.target) && v.target >= 0 && v.target <= 100,
    deriveTags: (v) => ["goal", "score", v.exam],
  },
  "goal.targetUniversity": {
    type: "goal.targetUniversity", category: "goal",
    defaultImportance: 0.9, defaultConfidence: 0.85, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: () => "university",
    validate: (v) => typeof v.university === "string" && v.university.length > 0,
    deriveTags: (v) => ["goal", "university", v.university],
  },
  "goal.targetMajor": {
    type: "goal.targetMajor", category: "goal",
    defaultImportance: 0.92, defaultConfidence: 0.85, decayHalfLifeDays: Infinity, pinned: true,
    naturalKey: () => "major",
    validate: (v) => typeof v.major === "string" && v.major.length > 0,
    deriveTags: (v) => ["goal", "major", v.major],
  },
  "goal.examDeadline": {
    type: "goal.examDeadline", category: "goal",
    defaultImportance: 0.8, defaultConfidence: 0.9, decayHalfLifeDays: Infinity, pinned: false,
    naturalKey: (v) => v.exam,
    validate: (v) => typeof v.exam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date),
    deriveTags: (v) => ["goal", "deadline", v.exam],
  },
  "goal.ambition": {
    type: "goal.ambition", category: "goal",
    defaultImportance: 0.85, defaultConfidence: 0.6, decayHalfLifeDays: Infinity, pinned: true,
    validate: (v) => typeof v.text === "string" && v.text.length > 0 && (v.horizon === "short" || v.horizon === "long"),
    deriveTags: (v) => ["goal", "ambition", v.horizon],
  },

  /* ── Conversation — منخفضة الأهمية، اضمحلال سريع → تُلخَّص ── */
  "conversation.salientFact": {
    type: "conversation.salientFact", category: "conversation",
    defaultImportance: 0.4, defaultConfidence: 0.6, decayHalfLifeDays: 30 * DAY, pinned: false,
    validate: (v) => typeof v.text === "string" && v.text.length > 0,
    deriveTags: (v) => ["conversation", "fact", ...(v.topic ? [v.topic] : [])],
  },
  "conversation.openThread": {
    type: "conversation.openThread", category: "conversation",
    defaultImportance: 0.5, defaultConfidence: 0.7, decayHalfLifeDays: 21 * DAY, pinned: false,
    validate: (v) => typeof v.question === "string" && v.question.length > 0,
    deriveTags: (v) => ["conversation", "thread", ...(v.topic ? [v.topic] : [])],
  },
  "conversation.summary": {
    type: "conversation.summary", category: "conversation",
    defaultImportance: 0.55, defaultConfidence: 0.7, decayHalfLifeDays: 120 * DAY, pinned: false,
    validate: (v) => typeof v.text === "string" && v.text.length > 0,
    deriveTags: () => ["conversation", "summary"],
  },

  /* ── Relationship — دائمة، عالية الأهمية (دماغ العلاقة) ── */
  "relationship.tone": {
    type: "relationship.tone", category: "relationship",
    defaultImportance: 0.8, defaultConfidence: 0.6, decayHalfLifeDays: 180 * DAY, pinned: false,
    naturalKey: () => "tone",
    validate: (v) => ["لطيف", "مباشر", "محفّز", "رسمي"].includes(v.tone),
    deriveTags: (v) => ["relationship", "tone", v.tone],
  },
  "relationship.lifeEvent": {
    type: "relationship.lifeEvent", category: "relationship",
    defaultImportance: 0.85, defaultConfidence: 0.8, decayHalfLifeDays: Infinity, pinned: true,
    validate: (v) => typeof v.text === "string" && v.text.length > 0,
    deriveTags: (v) => ["relationship", "lifeEvent", ...(v.sentiment ? [v.sentiment] : [])],
  },
  "relationship.milestone": {
    type: "relationship.milestone", category: "relationship",
    defaultImportance: 0.8, defaultConfidence: 0.9, decayHalfLifeDays: Infinity, pinned: true,
    validate: (v) => typeof v.text === "string" && v.text.length > 0,
    deriveTags: () => ["relationship", "milestone"],
  },
  "relationship.trust": {
    type: "relationship.trust", category: "relationship",
    defaultImportance: 0.7, defaultConfidence: 0.7, decayHalfLifeDays: Infinity, pinned: false,
    naturalKey: () => "trust",
    validate: (v) => Number.isFinite(v.level) && v.level >= 0 && v.level <= 1,
    deriveTags: () => ["relationship", "trust"],
  },
};

/* وصول مُحكَم للسجلّ */
export function defFor<T extends MemoryType>(type: T) {
  return MEMORY_REGISTRY[type];
}

/* كل الأنواع / الفئات (مشتقّة — مصدر واحد) */
export const ALL_MEMORY_TYPES = Object.keys(MEMORY_REGISTRY) as MemoryType[];
export function categoryOf(type: MemoryType): MemoryCategory {
  return MEMORY_REGISTRY[type].category;
}
