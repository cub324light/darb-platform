/* ═══════════ مخطّطات JSON (JSON Schema 2020-12) — مصدرٌ واحد ═══════════
   كانت أشكالُ البيانات مكتوبةً مرّتين: مرّةً داخل OpenAPI ومرّةً في `inputSchema`
   لأدوات MCP. فإذا تغيّر حقلٌ في أحدهما شاخ الآخر بصمت. هذا الملفّ هو المصدر:
   يستهلكه OpenAPI (عبر `$ref`) وأدواتُ MCP و`/schemas.json` معاً.

   نقيّ: لا `window` ولا `Date` — يُقيَّم وقت البناء. */

/** حقلٌ نصّي أو فارغ — الفراغ يعني «لم تُعلنه الجهة الرسمية»، لا «لا نعرف». */
const nullableString = { type: ["string", "null"] } as const;
const nullableInt = { type: ["integer", "null"] } as const;
/** تاريخ ISO «YYYY-MM-DD» أو فارغ. */
const nullableDate = { type: ["string", "null"], format: "date" } as const;

export const University = {
  type: "object",
  title: "University",
  description: "جامعةٌ سعودية كما تظهر في دليل درب.",
  required: ["id", "name", "url"],
  properties: {
    id: { type: "string", description: "معرّفٌ ثابت (مثل «kfupm»)" },
    name: { type: "string", description: "الاسم الرسمي بالعربية" },
    region: { ...nullableString, description: "المنطقة الإدارية" },
    kind: { ...nullableString, description: "حكومية أو أهلية" },
    qsRank: { ...nullableInt, description: "ترتيب QS العالمي" },
    qsRankTo: { ...nullableInt, description: "نهاية النطاق حين يُنشر ترتيباً نطاقياً" },
    qsYear: { ...nullableInt, description: "سنة إصدار الترتيب" },
    url: { type: "string", format: "uri", description: "صفحة الجامعة في درب" },
  },
} as const;

export const UniversityDetail = {
  type: "object",
  title: "UniversityDetail",
  description: "جامعةٌ مع كلياتها وتخصّصاتها الدقيقة.",
  allOf: [{ $ref: "#/$defs/University" }],
  properties: {
    colleges: {
      type: "array",
      description: "كليات الجامعة، ولكل كلّيةٍ تخصّصاتها",
      items: {
        type: "object",
        required: ["name", "majors"],
        properties: {
          name: { type: "string" },
          majors: { type: "array", items: { type: "string" } },
        },
      },
    },
    majorsCount: { type: "integer", description: "مجموع التخصّصات في الجامعة" },
  },
} as const;

export const ExamWindow = {
  type: "object",
  title: "ExamWindow",
  description:
    "نافذةُ تسجيلٍ رسمية لاختبارٍ وطني. الحقولُ الفارغة تعني أن الجهة لم تُعلن " +
    "الموعد بعد — لا تُملأ تخميناً.",
  required: ["id", "label", "announced"],
  properties: {
    id: { type: "string" },
    label: { type: "string", description: "اسم النافذة كما تعلنه الجهة" },
    registrationStart: nullableDate,
    registrationEnd: nullableDate,
    examStart: nullableDate,
    examEnd: nullableDate,
    announced: { type: "boolean", description: "هل أُعلن أيُّ تاريخٍ لهذه النافذة؟" },
  },
} as const;

export const Exam = {
  type: "object",
  title: "Exam",
  description: "اختبارٌ وطني (قدرات · تحصيلي · ستيب) ونوافذُ تسجيله.",
  required: ["id", "hasOfficialDates", "windows"],
  properties: {
    id: { type: "string", description: "معرّف المسار" },
    hasOfficialDates: { type: "boolean" },
    alwaysOpen: { type: "boolean", description: "تسجيلٌ مفتوحٌ طوال العام" },
    windows: { type: "array", items: { $ref: "#/$defs/ExamWindow" } },
  },
} as const;

export const AcademicCalendar = {
  type: "object",
  title: "AcademicCalendar",
  description: "التقويم الدراسي السعودي المعتمد: الفصول والإجازات وحدود العام.",
  required: ["updatedFor", "years"],
  properties: {
    updatedFor: { type: "string", description: "العام الذي حُدِّث له التقويم" },
    years: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "schoolStart", "schoolEnd", "periods"],
        properties: {
          id: { type: "string", description: "العام الهجري (مثل «1448»)" },
          gregorianLabel: { type: "string", description: "ما يقابله ميلادياً" },
          schoolStart: { type: "string", format: "date" },
          schoolEnd: { type: "string", format: "date" },
          source: { type: "string", description: "الجهة التي أعلنت التقويم" },
          periods: {
            type: "array",
            items: {
              type: "object",
              required: ["kind", "label", "start", "end"],
              properties: {
                kind: { type: "string", description: "فصلٌ دراسي أو إجازة" },
                label: { type: "string" },
                start: { type: "string", format: "date" },
                end: { type: "string", format: "date" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const FaqItem = {
  type: "object",
  title: "FaqItem",
  description: "سؤالٌ شائع عن القبول الجامعي ومنصّة قبول.",
  required: ["id", "question", "answer"],
  properties: {
    id: { type: "string" },
    question: { type: "string" },
    answer: { type: "string" },
    category: { type: "string" },
  },
} as const;

/** كلُّ المخطّطات بأسمائها — يستهلكها OpenAPI و`/schemas.json`. */
export const SCHEMAS = {
  University, UniversityDetail, ExamWindow, Exam, AcademicCalendar, FaqItem,
} as const;

/* ═══ مدخلاتُ أدوات MCP — مخطّطاتٌ صغيرة، لكنّها هي نفسها معاملاتُ OpenAPI ═══ */
export const TOOL_INPUTS = {
  list_universities: {
    type: "object",
    properties: { region: { type: "string", description: "المنطقة الإدارية للتصفية" } },
  },
  get_university: {
    type: "object",
    properties: { id: { type: "string", description: "معرّف الجامعة (مثل «kfupm»)" } },
    required: ["id"],
  },
  list_exams: { type: "object", properties: {} },
  get_academic_calendar: { type: "object", properties: {} },
  search_faq: {
    type: "object",
    properties: { q: { type: "string", description: "نصّ البحث داخل السؤال أو الجواب" } },
  },
} as const;
