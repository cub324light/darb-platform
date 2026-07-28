/* ─── بنك أسئلة الأرينا (1v1) — مشترك بين العميل والخادم ───
   مصدر واحد للأسئلة: يستعمله الخادم لبناء مجموعة أسئلة المباراة ومفتاح
   الإجابات (يبقى المفتاح على الخادم)، ويستعمله العميل للعرض ولوضع البوت. */
import type { TrackId } from "@/lib/tracks";

export interface Question {
  q: string;
  options: string[];
  correct: number; // فهرس الإجابة الصحيحة
  subject: string;
}

/* السؤال كما يُرسَل للعميل في مباراة حقيقية — بلا حقل correct (مقاومة للغش) */
export interface MatchQuestion {
  q: string;
  options: string[];
  subject: string;
}

export const QUESTION_BANK: Record<TrackId, Question[]> = {
  تحصيلي: [
    { q: "ما قانون نيوتن الأول؟", options: ["القصور الذاتي", "الفعل ورد الفعل", "التسارع يتناسب مع القوة", "الجذب الكوني"], correct: 0, subject: "فيزياء" },
    { q: "ما ناتج: log₂(8) ؟", options: ["2", "3", "4", "8"], correct: 1, subject: "رياضيات" },
    { q: "ما رمز الكالسيوم في الجدول الدوري؟", options: ["Ca", "C", "Cl", "K"], correct: 0, subject: "كيمياء" },
    { q: "ما العضو المسؤول عن تنقية الدم؟", options: ["الكبد", "الكلى", "الرئتان", "القلب"], correct: 1, subject: "أحياء" },
  ],
  قدرات: [
    { q: "أكمل: قلم : كتابة — مقص : ؟", options: ["قص", "ورق", "حديد", "يد"], correct: 0, subject: "لفظي" },
    { q: "العدد التالي: 3، 6، 12، 24، ...؟", options: ["36", "48", "30", "60"], correct: 1, subject: "كمي" },
    { q: "ضد كلمة «السخاء»؟", options: ["الكرم", "الجود", "البخل", "العطاء"], correct: 2, subject: "لفظي" },
    { q: "لو كان 40% من عدد يساوي 80، فالعدد؟", options: ["160", "200", "320", "120"], correct: 1, subject: "كمي" },
  ],
  CPC: [
    { q: "Synonym of «rapid»:", options: ["slow", "fast", "heavy", "late"], correct: 1, subject: "إنجليزي" },
    { q: "ما ناتج: ‎(2x + 3)(x − 1)‎ ؟", options: ["2x² + x − 3", "2x² − x − 3", "2x² + 5x − 3", "2x² − 3"], correct: 0, subject: "رياضيات" },
    { q: "She ____ to work every day.", options: ["go", "goes", "going", "gone"], correct: 1, subject: "إنجليزي" },
    { q: "مساحة دائرة نصف قطرها 7؟ (π ≈ 22/7)", options: ["44", "154", "49", "22"], correct: 1, subject: "رياضيات" },
  ],
  "تحصيلي مبكر": [
    { q: "ما وحدة قياس القوة؟", options: ["جول", "نيوتن", "واط", "باسكال"], correct: 1, subject: "فيزياء" },
    { q: "ما ناتج: ‎(x + 2)² ؟", options: ["x² + 4", "x² + 4x + 4", "x² + 2x + 4", "x² + 4x + 2"], correct: 1, subject: "رياضيات" },
    { q: "ما الرقم الذري للهيدروجين؟", options: ["1", "2", "8", "0"], correct: 0, subject: "كيمياء" },
    { q: "أين تحدث عملية البناء الضوئي؟", options: ["الميتوكوندريا", "البلاستيدات الخضراء", "النواة", "الغشاء"], correct: 1, subject: "أحياء" },
  ],
  ايلتس: [
    { q: "The results ____ surprising.", options: ["was", "were", "is", "be"], correct: 1, subject: "كتابة" },
    { q: "«in a nutshell» means:", options: ["بالتفصيل", "باختصار", "بصعوبة", "فجأة"], correct: 1, subject: "قراءة" },
    { q: "Synonym of «significant»:", options: ["minor", "important", "strange", "quiet"], correct: 1, subject: "قراءة" },
    { q: "Task 2 essay: كم كلمة كحد أدنى؟", options: ["150", "200", "250", "300"], correct: 2, subject: "كتابة" },
  ],
  ستيب: [
    { q: "He ____ in Riyadh since 2019.", options: ["lives", "lived", "has lived", "living"], correct: 2, subject: "قواعد" },
    { q: "Antonym of «ancient»:", options: ["old", "modern", "huge", "rare"], correct: 1, subject: "قراءة" },
    { q: "If I ____ rich, I would travel.", options: ["am", "was", "were", "be"], correct: 2, subject: "قواعد" },
    { q: "The main idea is usually found in the:", options: ["conclusion", "topic sentence", "title", "last line"], correct: 1, subject: "قراءة" },
  ],
  توفل: [
    { q: "Synonym of «crucial»:", options: ["minor", "essential", "optional", "rare"], correct: 1, subject: "قراءة" },
    { q: "مدة قسم الاستماع في TOEFL iBT تقريباً؟", options: ["20 دقيقة", "36 دقيقة", "60 دقيقة", "10 دقائق"], correct: 1, subject: "استماع" },
    { q: "The professor insisted that the student ____ early.", options: ["arrives", "arrived", "arrive", "arriving"], correct: 2, subject: "قواعد" },
    { q: "Integrated Writing: تقرأ وتسمع ثم؟", options: ["تتكلم", "تكتب ملخصاً يربط المحاضرة بالنص", "ترسم", "تختار"], correct: 1, subject: "كتابة" },
  ],
  دوليقو: [
    { q: "اختر الكلمة الإنجليزية الحقيقية:", options: ["blicket", "bridge", "brold", "plon"], correct: 1, subject: "قراءة" },
    { q: "نتيجة اختبار Duolingo تصدر عادة خلال؟", options: ["ساعة", "48 ساعة", "أسبوع", "شهر"], correct: 1, subject: "قراءة" },
    { q: "She has been studying ____ three hours.", options: ["since", "for", "from", "at"], correct: 1, subject: "كتابة" },
    { q: "Describe the image: المطلوب؟", options: ["ترجمتها", "وصف الصورة بجملة كاملة صحيحة", "تجاهلها", "عدّها"], correct: 1, subject: "محادثة" },
  ],
  ITC: [
    { q: "Synonym of «efficient»:", options: ["lazy", "effective", "slow", "weak"], correct: 1, subject: "إنجليزي" },
    { q: "ما ناتج: 15% من 200؟", options: ["15", "30", "45", "20"], correct: 1, subject: "رياضيات" },
    { q: "أي الخيارات ليس نوع قاعدة بيانات؟", options: ["SQL", "HDMI", "Oracle", "MongoDB"], correct: 1, subject: "منطق" },
    { q: "He ____ the report before the deadline.", options: ["finish", "finishes", "finished", "finishing"], correct: 2, subject: "إنجليزي" },
  ],
  مدرسه: [
    { q: "كم عدد أركان الإسلام؟", options: ["ثلاثة", "أربعة", "خمسة", "ستة"], correct: 2, subject: "إسلامية" },
    { q: "ما جمع كلمة «كتاب»؟", options: ["كتابات", "كتب", "أكتاب", "مكاتب"], correct: 1, subject: "عربي" },
    { q: "What is the plural of 'child'?", options: ["childs", "childes", "children", "child"], correct: 2, subject: "إنجليزي" },
    { q: "ما ناتج: 45 × 2؟", options: ["80", "90", "85", "95"], correct: 1, subject: "رياضيات" },
  ],
};

/* عدد أسئلة المباراة الواحدة */
export const MATCH_QUESTION_COUNT = 4;

/* خلط حتمي (Fisher–Yates) ببذرة عددية — يضمن أن يحصل اللاعبان على نفس
   ترتيب الأسئلة من نفس المباراة دون الاعتماد على Math.random. */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0 || 1;
  const rand = () => {
    // xorshift32 — حتمي وقابل للتكرار
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* يبني مجموعة أسئلة مباراة + مفتاح الإجابات من مسار وبذرة.
   الأسئلة المرسَلة للعميل بلا «correct»؛ المفتاح يبقى على الخادم. */
export function buildMatchQuestions(
  track: TrackId,
  seed: number,
  count = MATCH_QUESTION_COUNT,
): { questions: MatchQuestion[]; key: number[] } {
  const bank = QUESTION_BANK[track] ?? QUESTION_BANK["قدرات"];
  const shuffled = seededShuffle(bank, seed).slice(0, count);
  return {
    questions: shuffled.map(({ q, options, subject }) => ({ q, options, subject })),
    key: shuffled.map((x) => x.correct),
  };
}
