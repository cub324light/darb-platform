import Link from "next/link";

export const metadata = {
  title: "سياسة الخصوصية | درب",
  description: "كيف نحفظ بياناتك ونحميها في درب",
};

const SECTIONS: { h: string; p: string }[] = [
  {
    h: "وش نجمع",
    p: "إذا أنشأت حساباً، نحفظ إيميلك وكلمة مرور مشفّرة لتسجيل دخولك. نحفظ كذلك بيانات مذاكرتك (المسار، الجلسات، دقائق التركيز، الخزنة، المراجعة، الجدول) عشان ترجع لك على أي جهاز. بدون حساب، كل بياناتك تبقى على جهازك فقط ولا تغادره.",
  },
  {
    h: "وين تُحفظ",
    p: "بياناتك تُحفظ في خدمة Google Firebase الآمنة، وكل مستخدم يقدر يوصل لبياناته هو فقط. على جهازك، تُحفظ نسخة محلية لتشتغل بسرعة وبدون إنترنت.",
  },
  {
    h: "وش ما نسويه",
    p: "ما نبيع بياناتك، وما نشاركها مع معلنين أو أطراف خارجية. ما نطلب منك أي معلومة ما نحتاجها. حسابك وبياناتك ملكك.",
  },
  {
    h: "الذكاء الاصطناعي",
    p: "لما تطلب جدولاً أو مساعدة، يُرسل نص طلبك لمزوّد الذكاء الاصطناعي عشان يرد عليك. ما نرسل إيميلك ولا هويتك مع الطلب.",
  },
  {
    h: "حذف بياناتك",
    p: "تقدر تمسح كل بياناتك في أي وقت من البروفايل ← إعادة الضبط من الصفر. لحذف حسابك السحابي نهائياً، راسلنا وننفّذ طلبك.",
  },
  {
    h: "التواصل",
    p: "لأي سؤال عن خصوصيتك، تواصل معنا عبر البريد الموضّح في المنصة. نرد عليك بأسرع وقت.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh app-col">
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <span className="font-black text-[var(--text)]">سياسة الخصوصية</span>
        <span className="w-12" />
      </div>

      <div className="px-5 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-black text-[var(--text)] mb-2">خصوصيتك أمانة</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          في درب نتعامل مع بياناتك مثل ما نحب أحد يتعامل مع بياناتنا — بأقل ما يلزم وبأمان كامل.
        </p>

        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <div
              key={s.h}
              className="rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="font-bold text-[17px] text-[var(--text)] mb-2">{s.h}</h2>
              <p className="text-[15px] text-[var(--text-dim)] leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-8">
          آخر تحديث: يونيو ٢٠٢٦
        </p>
      </div>
    </div>
  );
}
