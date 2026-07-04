/* ─── قصص نجاح الطلاب (صفحة عامة، ISR كل ساعة) ───
   Server Component بالكامل — لا تفاعل هنا فلا JS إضافي للعميل. يجلب القصص
   والاستراتيجيات خادمياً عبر getContentSnapshot (بذرة + overlay من Firestore،
   offline-first). الدرجات كشارات ملوّنة، وشارة ✓ للموثّقة فقط. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import PublicPageCta from "@/components/content/PublicPageCta";
import BulletText from "@/components/content/BulletText";
import { getContentSnapshot } from "@/lib/content/server";
import { scoreColor, type SuccessStoryDoc } from "@/lib/content/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "قصص نجاح طلاب القدرات والتحصيلي | درب",
  description:
    "قصص حقيقية لطلاب رفعوا درجاتهم في القدرات والتحصيلي وستيب — درجاتهم بالأرقام، واستراتيجيات المذاكرة التي استخدموها للوصول.",
  alternates: { canonical: "/success-stories" },
  openGraph: {
    title: "قصص نجاح طلاب القدرات والتحصيلي | درب",
    description: "قصص حقيقية لطلاب رفعوا درجاتهم في القدرات والتحصيلي وستيب — مع استراتيجيات مذاكرتهم.",
    url: "/success-stories",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "قصص نجاح طلاب القدرات والتحصيلي | درب",
    description: "قصص حقيقية لطلاب رفعوا درجاتهم في القدرات والتحصيلي وستيب.",
  },
};

/* أيقونات الاستراتيجيات بالتناوب — لمسة بصرية فقط */
const STRATEGY_ICONS = ["📈", "🧭", "🏗️"];

/* بطاقة قصة واحدة */
function StoryCard({ story }: { story: SuccessStoryDoc }) {
  const entries = Object.entries(story.scores);
  return (
    <div className="rounded-2xl p-5 glow-card-hover"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      {/* الاسم + شارة التوثيق — التسميات مجهولة فالأفاتار أيقونة ثابتة 🎓 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[19px] flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--gold) 14%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--gold) 35%, transparent)",
          }}
          aria-hidden="true">
          🎓
        </span>
        <p className="font-black text-[16px] flex-1" style={{ color: "var(--text)" }}>{story.name}</p>
        {story.verified && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "color-mix(in srgb, var(--success) 14%, transparent)",
              color: "var(--success)",
              border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
            }}>
            ✓ موثّقة
          </span>
        )}
      </div>

      {/* الدرجات — شارات ملوّنة: الرقمية بأرقام بارزة والنصية كما هي */}
      <div className="flex flex-wrap gap-2 mb-1">
        {entries.map(([key, val]) => {
          const c = scoreColor(key);
          const numeric = typeof val === "number";
          return (
            <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: `color-mix(in srgb, ${c} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
              }}>
              <span className="text-[11px] font-bold" style={{ color: "var(--text-dim)" }}>{key}</span>
              <span className={numeric ? "font-black text-[16px] font-mono-nums" : "font-bold text-[12px]"}
                style={{ color: c }}>
                {val}
              </span>
            </span>
          );
        })}
      </div>

      {/* الملاحظة إن وُجدت */}
      {story.note.trim() !== "" && (
        <p className="text-[13.5px] leading-relaxed mt-3 pr-3"
          style={{ color: "var(--text-dim)", borderInlineStart: "2.5px solid color-mix(in srgb, var(--gold) 45%, transparent)" }}>
          {story.note}
        </p>
      )}
    </div>
  );
}

export default async function SuccessStoriesPage() {
  const snap = await getContentSnapshot();

  return (
    <div className="min-h-dvh">
      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/" />
          <h1 className="title-lg grad-title flex-1">قصص نجاح</h1>
          <ThemeToggle />
        </div>
      </Dome>

      {/* حاوية أوسع على سطح المكتب — تتيح ثلاثة أعمدة للقصص دون تضييقها */}
      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-5xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          طلاب حقيقيون وصلوا لدرجات عالية في القدرات والتحصيلي وستيب — أرقامهم وطريقتهم، عشان تعرف إن الوصول ممكن.
        </p>

        {/* ═══ القصص — عمودان على المتوسطة وثلاثة على سطح المكتب ═══ */}
        <section className="grid grid-cols-1 md:grid-cols-2 desk-grid-3 gap-3">
          {snap.successStories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </section>

        {/* ═══ استراتيجيات المذاكرة — مستخلصة من تجاربهم ═══ */}
        <section>
          <p className="eyebrow mb-1" style={{ color: "var(--accent-light)" }}>كيف وصلوا؟</p>
          <h2 className="font-black text-[19px] mb-4" style={{ color: "var(--text)" }}>استراتيجيات من تجاربهم</h2>
          {/* عمود واحد على الجوال، ثلاثة أعمدة على سطح المكتب */}
          <div className="grid gap-3 desk-grid-3">
            {snap.studyStrategies.map((s, i) => (
              <div key={s.id} className="rounded-2xl p-5 glow-card-hover"
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid color-mix(in srgb, var(--accent) 20%, var(--border))",
                }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                    }}
                    aria-hidden="true">
                    {STRATEGY_ICONS[i % STRATEGY_ICONS.length]}
                  </span>
                  <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{s.title}</p>
                </div>
                <BulletText text={s.content} />
              </div>
            ))}
          </div>
        </section>

        <PublicPageCta current="/success-stories" />
      </main>
    </div>
  );
}
