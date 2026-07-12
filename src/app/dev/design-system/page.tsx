/* ─── نظام الخطوط والتصميم — مرجعٌ حيّ (/dev/design-system) ───
   المصدر المرئي الوحيد لنظام الخطوط بعد إغلاقه: كل Token، متى يُستخدم، مثالٌ حيّ،
   الأوزان، المسافات، الألوان، واصطلاح الأرقام + القواعد الملزِمة. لا ننسى النظام
   بعد أشهر. صفحةٌ ساكنة للمطوّر (غير مفهرَسة). */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { n, pct, frac, sar, dateShort, dateLong, days } from "@/lib/format";

export const metadata: Metadata = {
  title: "نظام الخطوط والتصميم (مطوّر)",
  robots: { index: false, follow: false },
};

const SAMPLE = "درب — نظامٌ واحدٌ متناسق";

const SCALE: { cls: string; name: string; spec: string; when: string }[] = [
  { cls: "t-display", name: "Display", spec: "٢٫٢–٣rem · 700 · lh 1.12", when: "عنوان بطلٍ ضخم فقط (صفحة هبوط/لحظة احتفال)" },
  { cls: "t-h1", name: "H1", spec: "١٫٦–٢rem · 700 · lh 1.22", when: "عنوان الصفحة أو البطل الأساسي" },
  { cls: "t-h2", name: "H2", spec: "١٫٣rem · 700 · lh 1.34", when: "عنوان قسمٍ كبير" },
  { cls: "t-h3", name: "H3", spec: "١٫٠٨rem · 600 · lh 1.45", when: "عنوان بطاقة/قسم" },
  { cls: "t-title", name: "Title", spec: "٠٫٩٨rem · 600 · lh 1.5", when: "عنوان عنصرٍ داخل بطاقة" },
  { cls: "t-body-lg", name: "Body-lg", spec: "١rem · 400 · lh 1.8", when: "نصٌّ رئيسي مريح للقراءة" },
  { cls: "t-body", name: "Body", spec: "٠٫٩rem · 400 · lh 1.75", when: "النص الافتراضي" },
  { cls: "t-small", name: "Small", spec: "٠٫٨٢rem · 400 · lh 1.65", when: "نصٌّ ثانوي/مساعد" },
  { cls: "t-caption", name: "Caption", spec: "٠٫٧٦rem · 500 · lh 1.55", when: "تفاصيل صغيرة/شارات/تسميات" },
];

const WEIGHTS = [
  { w: 400, label: "Regular ٤٠٠", use: "النص الافتراضي" },
  { w: 500, label: "Medium ٥٠٠", use: "تسميات/Caption" },
  { w: 600, label: "SemiBold ٦٠٠", use: "عناوين ثانوية/H3/Title" },
  { w: 700, label: "Bold ٧٠٠", use: "عناوين رئيسية/H1/H2/تأكيد" },
];

const SPACES = [["sp-1", 4], ["sp-2", 8], ["sp-3", 12], ["sp-4", 16], ["sp-5", 24], ["sp-6", 32], ["sp-7", 48], ["sp-8", 64]] as const;
const RADII = [["r-sm", 10], ["r-md", 14], ["r-lg", 18], ["r-xl", 24]] as const;
const COLORS = [
  ["--text", "النص الأساسي"], ["--text-dim", "نص أخف (وصف)"], ["--text-muted", "نص خافت (تفاصيل)"],
  ["--accent", "اللون المميّز/الروابط"], ["--gold", "تنبيه/إنجاز"], ["--success", "نجاح"], ["--danger", "خطر/عاجل"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ds-card ds-stack-tight">
      <h2 className="t-h3" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--accent-light)" }}>نظام التصميم · مغلق</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>نظام الخطوط في درب</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>خطٌّ واحد، سلّمٌ واحد، أربعة أوزان. أي صفحةٍ جديدة تستخدم هذه الـTokens فقط — لا أحجام مباشرة.</p>
        </header>

        {/* الخط */}
        <Section title="الخط">
          <p className="t-body-lg" style={{ color: "var(--text)" }}>IBM Plex Sans Arabic — الخط الرسمي الوحيد للعربية والإنجليزية والأرقام. English & 123 معاً في سطرٍ واحد متناسق.</p>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا تُدخِل أي خطٍّ آخر إلا لسببٍ قويٍّ جداً.</p>
        </Section>

        {/* سلّم الأحجام */}
        <Section title="سلّم الأحجام (استخدمه حرفياً)">
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
            {SCALE.map((s) => (
              <div key={s.cls} className="flex flex-col gap-1 py-3">
                <span className={s.cls} style={{ color: "var(--text)" }}>{SAMPLE}</span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <code className="t-caption font-mono-nums px-2 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>.{s.cls}</code>
                  <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{s.name} · {s.spec}</span>
                </div>
                <span className="t-small" style={{ color: "var(--text-dim)" }}>{s.when}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* الأوزان */}
        <Section title="الأوزان (أربعة فقط)">
          <div className="flex flex-col gap-2">
            {WEIGHTS.map((w) => (
              <div key={w.w} className="flex items-baseline gap-3 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
                <span className="t-body-lg" style={{ color: "var(--text)", fontWeight: w.w }}>{w.label}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>— {w.use}</span>
              </div>
            ))}
          </div>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>أي وزنٍ أثقل (٨٠٠/٩٠٠) يُثبَّت تلقائياً على Bold ٧٠٠.</p>
        </Section>

        {/* تدرّج البطاقة — القاعدة */}
        <Section title="قاعدة البطاقة: Title · Body · Caption (لا أكثر)">
          <div className="ds-card" style={{ background: "var(--surface2)" }}>
            <p className="t-title" style={{ color: "var(--text)" }}>عنوان البطاقة (Title)</p>
            <p className="t-body" style={{ color: "var(--text-dim)" }}>وصفٌ أخفّ يشرح الغرض بجملةٍ أو اثنتين (Body).</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>تفاصيل صغيرة · شارة · تاريخ (Caption)</p>
          </div>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>ثلاثة مستويات فقط داخل البطاقة — لا تخلط أكثر.</p>
        </Section>

        {/* الأرقام */}
        <Section title="الأرقام (اصطلاحٌ واحد — من lib/format)">
          <div className="grid grid-cols-2 gap-2">
            {[
              [`n(1234)`, n(1234)], [`pct(92)`, pct(92)], [`frac(5,7)`, frac(5, 7)],
              [`sar(1500)`, sar(1500)], [`dateShort`, dateShort("2026-07-11")], [`dateLong`, dateLong("2026-07-11")],
              [`days(1)`, days(1)], [`days(12)`, days(12)],
            ].map(([code, out]) => (
              <div key={code} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
                <code className="t-caption font-mono-nums" style={{ color: "var(--accent-light)" }}>{code}</code>
                <span className="t-body font-mono-nums" style={{ color: "var(--text)" }}>{out}</span>
              </div>
            ))}
          </div>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>أرقامٌ عربية-هندية، بالرمز العربي للنسبة ٪ والريال ﷼. للبيانات المُحاذاة أضِف <code className="font-mono-nums" style={{ color: "var(--accent-light)" }}>font-mono-nums</code>.</p>
        </Section>

        {/* المسافات + الحواف */}
        <Section title="المسافات والحواف">
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>المسافات — شبكة ٤/٨</p>
          <div className="flex flex-col gap-1.5">
            {SPACES.map(([tok, v]) => (
              <div key={tok} className="flex items-center gap-3">
                <code className="t-caption font-mono-nums w-16 flex-shrink-0" style={{ color: "var(--accent-light)" }}>{tok}</code>
                <span className="h-3 rounded" style={{ width: v, background: "var(--accent)" }} />
                <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{v}px</span>
              </div>
            ))}
          </div>
          <p className="t-caption mt-2" style={{ color: "var(--text-muted)" }}>الحواف — البطاقة القياسية = lg</p>
          <div className="flex flex-wrap gap-2">
            {RADII.map(([tok, v]) => (
              <div key={tok} className="flex flex-col items-center gap-1">
                <span style={{ width: 44, height: 44, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: v }} />
                <code className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{tok}</code>
              </div>
            ))}
          </div>
        </Section>

        {/* الألوان */}
        <Section title="أدوار الألوان">
          <div className="flex flex-col gap-1.5">
            {COLORS.map(([tok, use]) => (
              <div key={tok} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
                <span className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: `var(${tok})`, border: "1px solid var(--border)" }} />
                <code className="t-caption font-mono-nums" style={{ color: "var(--text-dim)" }}>{tok}</code>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>— {use}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* القواعد الملزِمة */}
        <Section title="القواعد (ملزِمة للصفحات الجديدة)">
          <ul className="flex flex-col gap-2">
            {[
              "استخدم Tokens السلّم فقط — ممنوع text-[15px] أو أي حجمٍ مباشر في صفحةٍ جديدة.",
              "أي Hero: العنوان = Display أو H1 فقط، لا حجم آخر.",
              "داخل البطاقة: Title ثم Body ثم Caption — ثلاثة مستويات لا أكثر.",
              "الأرقام من lib/format فقط (عربية-هندية · ٪ · ﷼ · تواريخ موحّدة).",
              "Legacy: لا حملة تحويلٍ كبيرة — كلّما عدّلنا صفحةً قديمة نحوّل أحجامها للـTokens (دَين تقني تدريجي).",
            ].map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="t-caption font-black flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 22, height: 22, background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>{n(i + 1)}</span>
                <span className="t-body" style={{ color: "var(--text-dim)" }}>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
