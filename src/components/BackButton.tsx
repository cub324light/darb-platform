"use client";
/* ─── زرّ الرجوع الموحّد ───
   ▸ كان رابطاً ثابتاً إلى `/dashboard`: يقفز بالطالب إلى الرئيسية من أي صفحة،
     و — الأسوأ — **يدفع** مُدخلاً جديداً في تاريخ المتصفّح بدل أن يرجع. فيمتلئ
     التاريخ بالرئيسية، وإيماءةُ الرجوع في أندرويد تعيد الطالب إليها مهما ضغط.
     قِسناه: من «ملفي» ⇒ ذهب إلى `/dashboard` وطولُ التاريخ زاد ٤ ← ٥.

   ▸ صار رجوعاً حقيقياً: يعود خطوةً في التاريخ إن وُجدت، وإلا (فُتحت الصفحة
     مباشرةً من رابطٍ خارجيّ) ينتقل إلى `href` — فلا يعلق الطالب بلا مخرج.

   ▸ السهم يشير **يميناً (→)** لأننا في RTL: القراءة تسير يساراً، فالرجوع عكسها.
     («التالي ←» يبقى يساراً — يتبع اتجاه القراءة.) وهذا هو التدوير القياسي في
     Material وHIG: أيقونةُ الرجوع تُعكس في اللغات ذات الاتجاه اليمينيّ.

   ▸ مساحةُ اللمس ٤٤ بكسل على الأقل (إرشاد إمكانية الوصول) عبر `tap-44`. */
import { useRouter } from "next/navigation";

export default function BackButton({
  href = "/dashboard",
  label = "رجوع",
  onBack,
}: {
  href?: string;
  label?: string;
  /** رجوعٌ داخل الصفحة (إغلاق مساحةٍ لا انتقالُ مسار) — لا تاريخَ متصفّحٍ فيه. */
  onBack?: () => void;
}) {
  const router = useRouter();

  const goBack = () => {
    if (onBack) { onBack(); return; }
    /* `history.length > 1` تعني أن ثمّة ما نرجع إليه في هذا التبويب. */
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(href);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="dome-chip tap-44 text-[17px] font-bold flex-shrink-0 inline-flex items-center gap-1.5"
      style={{ color: "var(--text)" }}
    >
      {/* السهم أوّلاً في ترتيب flex ⇒ يقع على الحافّة اليمنى (البادئة في RTL) */}
      <span aria-hidden="true">→</span>
      {label}
    </button>
  );
}
