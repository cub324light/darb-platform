/* ─── مستقبلي الجامعي: مصدر الحقيقة الواحد للجامعات والتخصصات ───
   ملف بيانات نقي (لا يقرأ التخزين) — يستعمله العميل والخادم.

   ▸ هذا الملف هو نقطة التحديث الوحيدة للجامعات/التخصصات/المتطلبات.
     صُمّم ليُستبدَل مستقبلاً بمصدر بعيد (Firestore/لوحة إدارة) دون تغيير
     أي مستهلك: تكفي تعبئة UNIVERSITIES / MAJORS بنفس الشكل.

   ▸ كل المتطلبات إرشادية وتعليمية فقط — ليست شروط قبول رسمية. */

export type ReqLevel = "مرتفع" | "متوسط" | "منخفض" | "يفضّل مرتفع";
export type MajorCategory = "صحي" | "هندسي" | "حاسب" | "إداري" | "قانوني" | "عام";

export interface UniversityOption {
  id: string;
  name: string;
  region?: string;
}

/* متطلبات إرشادية لتخصص — أي حقل غير مذكور = غير حاسم */
export interface MajorRequirements {
  qudurat?: ReqLevel;   // القدرات
  tahsili?: ReqLevel;   // التحصيلي
  step?: ReqLevel;      // STEP (للمسارات التي تطلبه)
  gpa?: ReqLevel;       // المعدل التراكمي/الثانوي
}

export interface MajorOption {
  id: string;
  name: string;
  category: MajorCategory;
  requirements: MajorRequirements;
  /* المواد/الاختبارات الأهم لهذا التخصص — تُستعمل لتوجيه دويرب */
  focusHint?: string;
}

/* ════════ بيانات الجامعات (نقطة التحديث الوحيدة) ════════ */
export const UNIVERSITIES: UniversityOption[] = [
  { id: "ksu",   name: "جامعة الملك سعود", region: "الرياض" },
  { id: "kau",   name: "جامعة الملك عبدالعزيز", region: "مكة المكرمة" },
  { id: "kfupm", name: "جامعة الملك فهد للبترول والمعادن", region: "المنطقة الشرقية" },
  { id: "imam",  name: "جامعة الإمام محمد بن سعود الإسلامية", region: "الرياض" },
  { id: "pnu",   name: "جامعة الأميرة نورة بنت عبدالرحمن", region: "الرياض" },
  { id: "qu",    name: "جامعة القصيم", region: "القصيم" },
  { id: "kku",   name: "جامعة الملك خالد", region: "عسير" },
  { id: "ut",    name: "جامعة تبوك", region: "تبوك" },
  { id: "uoh",   name: "جامعة حائل", region: "حائل" },
  { id: "uj",    name: "جامعة جدة", region: "مكة المكرمة" },
  { id: "ksau",  name: "جامعة الملك سعود للعلوم الصحية", region: "الرياض" },
  { id: "iau",   name: "جامعة الإمام عبدالرحمن بن فيصل", region: "المنطقة الشرقية" },
  { id: "tu",    name: "جامعة الطائف", region: "مكة المكرمة" },
  { id: "psau",  name: "جامعة الأمير سطام بن عبدالعزيز", region: "الرياض" },
  { id: "other", name: "أخرى" },
];

/* ════════ بيانات التخصصات + متطلباتها الإرشادية ════════ */
export const MAJORS: MajorOption[] = [
  { id: "medicine",  name: "طب", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", step: "يفضّل مرتفع", gpa: "مرتفع" },
    focusHint: "الكمي والتحصيلي (أحياء/كيمياء) لهما الأولوية القصوى" },
  { id: "dentistry", name: "طب أسنان", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "التحصيلي والكمي أساس القبول" },
  { id: "pharmacy",  name: "صيدلة", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الكيمياء والأحياء في التحصيلي مهمة جداً" },
  { id: "nursing",   name: "تمريض", category: "صحي",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "توازن بين القدرات والتحصيلي" },
  { id: "applied-medical", name: "علوم صحية تطبيقية", category: "صحي",
    requirements: { qudurat: "متوسط", tahsili: "مرتفع", gpa: "متوسط" } },

  { id: "cs",        name: "علوم حاسب", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الكمي (الرياضيات) والإنجليزي محوريان" },
  { id: "swe",       name: "هندسة برمجيات", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الرياضيات والمنطق في القدرات أولوية" },
  { id: "cybersec",  name: "أمن سيبراني", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الكمي والإنجليزي والشبكات" },
  { id: "ai",        name: "ذكاء اصطناعي", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "رياضيات قوية (كمي) أساس لا غنى عنه" },
  { id: "is",        name: "نظم معلومات", category: "حاسب",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" } },

  { id: "ee",        name: "هندسة كهربائية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الفيزياء والرياضيات في التحصيلي أولوية" },
  { id: "me",        name: "هندسة ميكانيكية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الفيزياء والرياضيات محوريتان" },
  { id: "ce",        name: "هندسة مدنية", category: "هندسي",
    requirements: { qudurat: "متوسط", tahsili: "مرتفع", gpa: "متوسط" } },
  { id: "industrial", name: "هندسة صناعية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "متوسط", gpa: "متوسط" } },

  { id: "business",  name: "إدارة أعمال", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "القدرات (اللفظي والكمي) والإنجليزي" },
  { id: "accounting", name: "محاسبة", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "الكمي مهم في المحاسبة" },
  { id: "finance",   name: "تمويل", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" } },
  { id: "marketing", name: "تسويق", category: "إداري",
    requirements: { qudurat: "متوسط", gpa: "منخفض" } },

  { id: "law",       name: "قانون / أنظمة", category: "قانوني",
    requirements: { qudurat: "متوسط", gpa: "متوسط" },
    focusHint: "اللفظي في القدرات والمعدل" },

  { id: "other",     name: "أخرى", category: "عام", requirements: {} },
];

/* ── helpers ── */
export const findUniversity = (id?: string): UniversityOption | undefined =>
  id ? UNIVERSITIES.find((u) => u.id === id) : undefined;
export const findMajor = (id?: string): MajorOption | undefined =>
  id ? MAJORS.find((m) => m.id === id) : undefined;

/* نص متطلبات مختصر للعرض/الحقن في برومبت دويرب */
export function requirementsText(req: MajorRequirements): string {
  const parts: string[] = [];
  if (req.qudurat) parts.push(`قدرات: ${req.qudurat}`);
  if (req.tahsili) parts.push(`تحصيلي: ${req.tahsili}`);
  if (req.step)    parts.push(`STEP: ${req.step}`);
  if (req.gpa)     parts.push(`المعدل: ${req.gpa}`);
  return parts.join("، ");
}

/* عتبة الدرجة المقابلة لكل مستوى (قدرات/تحصيلي من 100) */
const LEVEL_THRESHOLD: Record<Exclude<ReqLevel, never>, number> = {
  "مرتفع": 85,
  "يفضّل مرتفع": 80,
  "متوسط": 75,
  "منخفض": 65,
};
function thresholdFor(level: ReqLevel): number { return LEVEL_THRESHOLD[level] ?? 75; }

/* ════════ محرّك مؤشر الوصول الجامعي (نقي وحتمي) ════════ */
export type ReadinessLevel = "منخفض" | "متوسط" | "مرتفع";

export interface UniversityReadinessInputs {
  requirements?: MajorRequirements;
  readinessPct?: number | null;           // الجاهزية الحالية (محرّك الاستراتيجية)
  quduratScore?: number | null;           // أحدث/أعلى درجة قدرات
  tahsiliScore?: number | null;           // أحدث/أعلى درجة تحصيلي
  stepScore?: number | null;
  weeklyHours?: number | null;            // ساعات أسبوعية (من الاستراتيجية)
  planProgressPct?: number | null;        // تقدّم الخطة/المسار
  majorName?: string;
}

export interface UniversityReadinessResult {
  level: ReadinessLevel;
  icon: "🟢" | "🟡" | "🔴";
  score: number;        // 0–100
  reasons: string[];    // أسباب موجزة
  hasData: boolean;     // هل توفّرت بيانات كافية للحكم؟
}

export function universityReadiness(inp: UniversityReadinessInputs): UniversityReadinessResult {
  const req = inp.requirements ?? {};
  const reasons: string[] = [];
  let score = 0;
  let weight = 0;

  /* ١) الجاهزية العامة — العمود الأساسي */
  if (inp.readinessPct != null) {
    score += inp.readinessPct * 0.4;
    weight += 40;
    reasons.push(`جاهزيتك الحالية ${Math.round(inp.readinessPct)}٪`);
  }

  /* ٢) مطابقة الدرجات الفعلية للمتطلبات */
  const examChecks: { label: string; have: number | null | undefined; level?: ReqLevel }[] = [
    { label: "القدرات", have: inp.quduratScore, level: req.qudurat },
    { label: "التحصيلي", have: inp.tahsiliScore, level: req.tahsili },
    { label: "STEP", have: inp.stepScore, level: req.step },
  ];
  for (const c of examChecks) {
    if (c.level == null || c.have == null) continue;
    const need = thresholdFor(c.level);
    const ratio = Math.max(0, Math.min(1.1, c.have / need));
    score += ratio * 20;
    weight += 20;
    if (c.have >= need) reasons.push(`${c.label}: ${c.have} يلبّي المطلوب (${c.level})`);
    else reasons.push(`${c.label}: ${c.have} دون المطلوب (${c.level} ≈ ${need})`);
  }

  /* ٣) الطاقة الأسبوعية */
  if (inp.weeklyHours != null) {
    const h = inp.weeklyHours;
    const hScore = h >= 20 ? 100 : h >= 12 ? 75 : h >= 6 ? 55 : 30;
    score += hScore * 0.12;
    weight += 12;
    if (h < 6) reasons.push(`ساعات أسبوعية قليلة (${h})`);
  }

  /* ٤) تقدّم الخطة */
  if (inp.planProgressPct != null) {
    score += inp.planProgressPct * 0.1;
    weight += 10;
    if (inp.planProgressPct < 30) reasons.push("تقدّمك في الخطة ما زال مبكّراً");
  }

  const hasData = weight >= 20;
  const normalized = hasData ? Math.round((score / weight) * 100) : 0;
  const clamped = Math.max(0, Math.min(100, normalized));

  let level: ReadinessLevel;
  let icon: "🟢" | "🟡" | "🔴";
  if (clamped >= 70) { level = "مرتفع"; icon = "🟢"; }
  else if (clamped >= 45) { level = "متوسط"; icon = "🟡"; }
  else { level = "منخفض"; icon = "🔴"; }

  if (!hasData) {
    reasons.push("أضف نتائجك وحدّد هدفك لأحسب مؤشر وصول دقيقاً");
  }

  return { level, icon, score: clamped, reasons: reasons.slice(0, 4), hasData };
}
