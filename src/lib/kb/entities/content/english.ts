/* ═══════════ محتوى: مفاهيم الإنجليزية (نموذجٌ مُدمَج) ═══════════
   المعرفة اللغوية واحدة، وSTEP وIELTS وCEFR مجرّد أطرٍ تقيسها. فلا نُقسّم المفاهيم
   حسب اختبارٍ واحد: كل مفهوم يحمل مهارته (Grammar/Reading/…) ومستواه (CEFR) ووزنه
   في STEP وIELTS معاً (حتى لو صفر) وتكراره وأهميته. ينتمي (belongs_to) للاختبار
   الذي يقيسه فعلاً (وزنه فيه > 0): فالكتابة تظهر في IELTS لا STEP. لا تكرار للمفهوم،
   ولا أنواع/علاقات جديدة — البنية مقفلة. */
import { entityId as E, type ConceptEntity, type Relation } from "../schema";

const SOURCE = "أطر STEP وIELTS وCEFR — المهارات المشتركة للّغة الإنجليزية";
const UPDATED = "2026-07-10";

type Skill = "Grammar" | "Vocabulary" | "Reading" | "Listening" | "Writing";
type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/* بانٍ مُدمَج: مفهومٌ إنجليزي بمهارةٍ ومستوى CEFR ووزنٍ في STEP وIELTS (حتى لو صفر).
   ينتمي belongs_to للاختبار الذي يقيسه (الوزن > 0) — فتُحسَب المهارات المشتركة مرّةً
   واحدة في كِلا الاختبارين، والكتابة/الأشياء الخاصة بـIELTS لا تُحسَب على STEP. */
function c(
  slug: string, name: string, nameEn: string, skill: Skill, cefr: Cefr,
  importance: number, difficulty: "easy" | "medium" | "hard", examFrequency: number,
  step: number, ielts: number, summary: string, confidence = 0.85,
): ConceptEntity {
  const relations: Relation[] = [];
  if (step > 0) relations.push({ type: "belongs_to", to: E("exam", "step") });
  if (ielts > 0) relations.push({ type: "belongs_to", to: E("exam", "ielts") });
  return {
    kind: "concept", id: E("concept", slug), name, nameEn,
    category: skill, cefr, difficulty, examFrequency,
    examWeights: { [E("exam", "step")]: step, [E("exam", "ielts")]: ielts },
    summary,
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence, importance },
    relations,
  };
}

/*                       slug                     name(ar)                       name(en)                 skill        cefr  imp  diff       freq  step ielts  summary */
export const ENGLISH_CONCEPTS: ConceptEntity[] = [
  /* ─── القواعد (Grammar) ─── */
  c("present-perfect",       "المضارع التام",              "Present Perfect",         "Grammar",    "B1", 95, "medium", 90, 95, 90, "ربط الماضي بالحاضر: have/has + past participle."),
  c("verb-tenses",           "الأزمنة (ماضٍ/حاضر/مستقبل)", "Verb Tenses",             "Grammar",    "A2", 90, "medium", 90, 90, 88, "منظومة الأزمنة الإنجليزية واستعمال كلٍّ منها."),
  c("conditionals",          "الجمل الشرطية",              "Conditionals",            "Grammar",    "B2", 90, "hard",   85, 90, 90, "أنواع الشرط الأربعة (Zero/First/Second/Third)."),
  c("modal-verbs",           "الأفعال الناقصة",           "Modal Verbs",             "Grammar",    "B1", 83, "medium", 82, 85, 80, "can/must/should… للتعبير عن القدرة والاحتمال والنصح."),
  c("relative-clauses",      "الجمل الوصفية",             "Relative Clauses",        "Grammar",    "B2", 82, "medium", 80, 85, 85, "who/which/that لوصف الأسماء وربط الجمل."),
  c("prepositions",          "حروف الجر",                 "Prepositions",            "Grammar",    "A2", 80, "medium", 85, 82, 76, "in/on/at… ومواضعها الصحيحة في الجملة."),
  c("subject-verb-agreement","تطابق الفاعل والفعل",        "Subject–Verb Agreement",  "Grammar",    "A2", 80, "easy",   82, 82, 72, "مطابقة الفعل للفاعل في العدد والشخص."),
  c("error-identification",  "تحديد الخطأ اللغوي",         "Error Identification",    "Grammar",    "B1", 85, "medium", 88, 92, 60, "اكتشاف الخطأ النحوي في الجملة — نمطٌ محوريّ في STEP."),
  c("reported-speech",       "الكلام المنقول",            "Reported Speech",         "Grammar",    "B2", 76, "medium", 72, 78, 76, "نقل الكلام المباشر إلى غير مباشر مع تغيّر الأزمنة."),
  c("articles",              "أدوات التعريف والتنكير",     "Articles (a/an/the)",     "Grammar",    "A2", 72, "easy",   76, 75, 70, "استعمال a/an/the والحالات الصفرية."),

  /* ─── المفردات (Vocabulary) ─── */
  c("synonyms-antonyms",     "المترادفات والأضداد",        "Synonyms & Antonyms",     "Vocabulary", "B1", 88, "medium", 90, 90, 80, "معرفة المرادف والضدّ لاختيار الكلمة الأدقّ."),
  c("phrasal-verbs",         "الأفعال المركّبة",          "Phrasal Verbs",           "Vocabulary", "B2", 83, "hard",   83, 85, 80, "أفعالٌ + حروف تُغيّر المعنى (give up/look after)."),
  c("collocations",          "المتلازمات اللفظية",         "Collocations",            "Vocabulary", "B2", 84, "hard",   82, 82, 88, "الكلمات التي تأتي معاً طبيعياً (make a decision)."),
  c("word-formation",        "اشتقاق الكلمات",            "Word Formation",          "Vocabulary", "B2", 80, "medium", 78, 80, 85, "بناء الكلمات بالبادئات واللواحق (able→ability)."),
  c("academic-vocabulary",   "المفردات الأكاديمية",        "Academic Vocabulary",     "Vocabulary", "C1", 82, "hard",   75, 78, 92, "معجم النصوص الأكاديمية (AWL) — محوريّ في IELTS."),

  /* ─── القراءة (Reading) ─── */
  c("reading-inference",     "الاستنتاج القرائي",          "Reading Inference",       "Reading",    "B2", 100,"hard",  100,100, 95, "استنتاج ما لم يُصرَّح به في النصّ — أعلى المهارات وزناً."),
  c("reading-main-idea",     "الفكرة الرئيسة",            "Main Idea & Topic",       "Reading",    "B1", 95, "medium", 95, 95, 95, "تحديد الفكرة العامة والموضوع للنصّ أو الفقرة."),
  c("vocabulary-in-context", "المفردة في سياقها",          "Vocabulary in Context",   "Reading",    "B2", 90, "medium", 90, 92, 88, "استنتاج معنى الكلمة من سياق النصّ."),
  c("skimming-scanning",     "المسح السريع والبحث",        "Skimming & Scanning",     "Reading",    "B1", 85, "easy",   82, 85, 90, "قراءةٌ سريعة للفكرة العامة أو لالتقاط تفصيلٍ محدّد."),

  /* ─── الاستماع (Listening) ─── */
  c("listening-detail",      "الاستماع للتفاصيل",          "Listening for Detail",    "Listening",  "B1", 85, "medium", 85, 88, 90, "التقاط أرقامٍ وأسماءٍ وتفاصيل دقيقة من المسموع."),
  c("listening-gist",        "الاستماع للفكرة العامة",     "Listening for Gist",      "Listening",  "B1", 80, "easy",   80, 80, 85, "فهم الموضوع العام والغرض دون كل كلمة."),

  /* ─── الكتابة (Writing) — لا تظهر في STEP (وزنه صفر)، محورية في IELTS ─── */
  c("essay-structure",       "بنية المقال",               "Essay Structure",         "Writing",    "B2", 78, "medium", 55,  0, 95, "مقدّمة وفقراتٌ وخاتمة مع أطروحةٍ واضحة."),
  c("coherence-cohesion",    "الترابط والتماسك",           "Coherence & Cohesion",    "Writing",    "B2", 75, "medium", 50,  0, 90, "روابط الأفكار وأدوات الربط لتدفّق النصّ."),
];
