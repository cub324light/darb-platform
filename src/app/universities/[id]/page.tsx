/* ─── ملف جامعة مستقل (صفحة عامة مفهرسة، ثابتة SSG) ───
   Server Component بالكامل — لا جلب عميل. تُبنى كل الجامعات ثابتة عبر
   generateStaticParams، وعنوان/وصف فريدان لكل جامعة عبر generateMetadata (جوهر
   قيمة SEO). المحتوى بطاقات/أقسام قصيرة (قاعدة الـ5 ثوانٍ)، وكل حقل اختياري
   يُعرض فقط إن وُجد. مصدر الحقيقة الوحيد: src/lib/university.ts. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import { CardGrid } from "@/components/ds";
import {
  UNIVERSITIES,
  findUniversity,
  universityCity,
  universityMapUrl,
  housingInfo,
  qsRankText,
  arabRankText,
  type UniversityOption,
} from "@/lib/university";
import { n, year } from "@/lib/format";

const BASE = "https://usedarb.com";

/* كل الجامعات تُبنى ثابتة (عدا «أخرى» التي ليست جامعة حقيقية) */
export function generateStaticParams() {
  return UNIVERSITIES.filter((u) => u.id !== "other").map((u) => ({ id: u.id }));
}

/* لا نخدم إلا المعرّفات المولّدة ثابتاً — أي معرّف آخر يُعطي 404 */
export const dynamicParams = false;

/* لون هوية الصفحة حسب النوع */
function kindColor(u: UniversityOption): string {
  return u.kind === "أهلية" ? "var(--gold)" : "var(--accent)";
}

/* الحرف الأول المميّز (نفس منطق الدليل) */
function uniInitial(name: string): string {
  const cleaned = name.replace(/^(جامعة|الجامعة)\s+/, "").replace(/^ال/, "");
  return (cleaned.charAt(0) || name.charAt(0)).toUpperCase();
}

/* وصف احتياطي فريد إن غابت النبذة — يبقى دقيقاً لكل جامعة */
function metaDescription(u: UniversityOption): string {
  if (u.description) return u.description;
  const city = universityCity(u);
  const kind = u.kind ? `جامعة ${u.kind}` : "جامعة سعودية";
  return `${u.name} — ${kind}${city ? ` في ${city}` : ""}. تعرّف على الكليات ومعادلات القبول الموزونة والسكن الجامعي والمميزات في دليل درب.`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = findUniversity(id);
  if (!u || u.id === "other") return { title: "الجامعة غير موجودة | درب" };

  const title = `${u.name} — القبول والتخصصات والموزونة | درب`;
  const description = metaDescription(u);
  const url = `/universities/${u.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "درب", locale: "ar_SA", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* ── عناصر عرض صغيرة (نقية) ── */

/* ترويسة قسم موحّدة — t-h3 قريبة من محتواها (الفجوة من ds-section) */
function SectionHead({ title }: { title: string }) {
  return <h2 className="t-h3" style={{ color: "var(--text)" }}>{title}</h2>;
}

/* شريحة (كلية/مجال تميز) — حجم موحّد (t-caption) */
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="t-caption px-2.5 py-1.5 rounded-xl"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`, color: "var(--text)" }}>
      {label}
    </span>
  );
}

/* قائمة نقطية قصيرة (مميزات/اعتبارات) — بطاقة نظام موحّدة بحدّ ملوّن */
function BulletCard({ title, items, color, mark }: { title: string; items: string[]; color: string; mark: string }) {
  return (
    <div className="ds-card flex flex-col gap-[var(--sp-3)]"
      style={{ borderColor: `color-mix(in srgb, ${color} 22%, var(--border))` }}>
      <p className="t-body font-black" style={{ color }}>{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 t-body" style={{ color: "var(--text-dim)" }}>
            <span className="flex-shrink-0" style={{ color }} aria-hidden="true">{mark}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function UniversityProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = findUniversity(id);
  if (!u || u.id === "other") notFound();

  const c = kindColor(u);
  const city = universityCity(u);
  const mapUrl = universityMapUrl(u);
  const housing = housingInfo(u);

  /* JSON-LD — منظمة تعليمية للفهرسة الغنية */
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: u.name,
    url: `${BASE}/universities/${u.id}`,
    ...(u.website ? { sameAs: [u.website] } : {}),
    ...(u.description ? { description: u.description } : {}),
    ...(u.foundedYear ? { foundingDate: String(u.foundedYear) } : {}),
    ...(city ? { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "SA" } } : {}),
  };

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/universities" />
          <h1 className="title-lg grad-title flex-1 truncate">{u.name}</h1>
          <ThemeToggle />
        </div>
      </Dome>

      {/* الإيقاع الرأسي موحّد، لكن الوزن غير متساوٍ: بطل → القبول (الأهم) → الكليات → تفاصيل */}
      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-3xl mx-auto ds-stack pb-20">
        {/* ═══ الهوية (Hero): من أنا؟ — النبذة مدموجة، والروابط الثانوية أيقونات صغيرة ═══ */}
        <section className="relative rounded-3xl p-6 overflow-hidden"
          style={{
            background: `linear-gradient(145deg, color-mix(in srgb, ${c} 16%, var(--surface)), var(--surface))`,
            border: `1.5px solid color-mix(in srgb, ${c} 30%, var(--border))`,
          }}>
          <div className="flex items-start gap-4">
            <span className="w-16 h-16 rounded-3xl flex items-center justify-center text-[31px] font-black flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${c} 20%, transparent)`, border: `1.5px solid color-mix(in srgb, ${c} 42%, transparent)`, color: c }}
              aria-hidden="true">
              {uniInitial(u.name)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="t-h2" style={{ color: "var(--text)" }}>{u.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {u.kind && (
                  <span className="t-caption px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c, border: `1px solid color-mix(in srgb, ${c} 35%, transparent)` }}>
                    {u.kind}
                  </span>
                )}
                {city && <span className="t-caption" style={{ color: "var(--text-muted)" }}>📍 {city}</span>}
                {u.foundedYear && <span className="t-caption font-mono-nums" style={{ color: "var(--text-dim)" }}>· تأسست {u.foundedYear}</span>}
                {/* الترتيب العالميّ — موثّقٌ أو غائب، وإصدارُه مذكورٌ دائماً لأنه يتغيّر سنوياً */}
                {u.qsRank != null && (
                  <span className="t-caption font-black px-2 py-0.5 rounded-full font-mono-nums"
                    style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)", border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)" }}>
                    🌍 QS {qsRankText(u, n)}{u.qsYear ? ` · ${year(u.qsYear)}` : ""}
                  </span>
                )}
                {arabRankText(u, n) && (
                  <span className="t-caption font-black px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c, border: `1px solid color-mix(in srgb, ${c} 35%, transparent)` }}>
                    🏅 {arabRankText(u, n)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* روابط ثانوية — أيقونات مدمجة صغيرة لا شريطان كبيران */}
          <div className="flex items-center gap-2 mt-4">
            {u.website && (
              <a href={u.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg t-caption no-underline"
                style={{ background: "color-mix(in srgb, var(--text) 6%, transparent)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                🌐 الموقع الرسمي
              </a>
            )}
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg t-caption no-underline"
              style={{ background: "color-mix(in srgb, var(--text) 6%, transparent)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              🗺️ الخرائط
            </a>
          </div>
        </section>

        {/* ═══ نبذة — بطاقةٌ مستقلّة (أُعيدت: الطالب يفتح الصفحة ليعرف الجامعة أوّلاً) ═══ */}
        {u.description && (
          <section className="ds-card">
            <p className="eyebrow mb-2">نبذة</p>
            <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>{u.description}</p>
          </section>
        )}

        {/* ═══ العنصر الرئيسي: هل أقدر أدخلها؟ — القبول + احسب موزونتك (مُبرز بلون الهوية) ═══ */}
        {(u.formulas?.length || u.admissionNote) && (
          <section className="rounded-3xl p-5 ds-section"
            style={{
              background: "color-mix(in srgb, var(--accent) 7%, var(--surface))",
              border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
            }}>
            <div>
              <p className="eyebrow mb-1" style={{ color: "var(--accent-light)" }}>القبول</p>
              <h2 className="t-h3" style={{ color: "var(--text)" }}>هل أقدر أدخلها؟ احسب نسبتك بمعادلتها</h2>
            </div>

            {u.formulas && u.formulas.length > 0 && (
              <CardGrid cols={2}>
                {u.formulas.map((f) => {
                  const weights = [
                    { label: "الثانوية", w: f.highschool },
                    { label: "القدرات", w: f.qudurat },
                    { label: "التحصيلي", w: f.tahsili },
                  ].filter((x) => x.w > 0);
                  return (
                    <div key={f.id + f.label} className="ds-card flex flex-col gap-[var(--sp-3)]">
                      <div className="flex items-center gap-2">
                        <span className="t-caption px-2 py-0.5 rounded-full"
                          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                          {f.track}
                        </span>
                        <p className="t-body font-bold" style={{ color: "var(--text)" }}>{f.label}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {weights.map((x) => (
                          <span key={x.label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                            style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
                            <span className="t-caption" style={{ color: "var(--text-dim)" }}>{x.label}</span>
                            <span className="text-[16px] font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{x.w}٪</span>
                          </span>
                        ))}
                      </div>
                      {f.note && <p className="t-caption" style={{ color: "var(--text-muted)" }}>ℹ️ {f.note}</p>}
                    </div>
                  );
                })}
              </CardGrid>
            )}

            {u.admissionNote && (
              <p className="t-body" style={{ color: "var(--text-dim)" }}>{u.admissionNote}</p>
            )}

            {/* الفعل الرئيسي — في الأعلى حيث يبحث عنه الطالب، لا في القاع */}
            <Link href="/university" className="btn-shimmer inline-flex items-center justify-center gap-2 px-6 font-black text-[17px] w-full sm:w-auto"
              style={{ textDecoration: "none", height: "var(--btn-h)" }}>
              احسب موزونتك في هذه الجامعة ←
            </Link>

            {u.formulas && u.formulas.length > 0 && (
              <p className="t-caption" style={{ color: "var(--text-muted)" }}>
                ⚠️ الأوزان إرشادية وتتغيّر سنوياً — راجع الموقع الرسمي للأرقام المعتمدة.
              </p>
            )}
          </section>
        )}

        {/* ═══ ماذا أدرس؟ — الكليات ═══ */}
        {u.colleges && u.colleges.length > 0 && (
          <section className="ds-section">
            <SectionHead title="ماذا أدرس؟ — الكليات" />
            <div className="flex flex-wrap gap-2">
              {u.colleges.map((col) => <Chip key={col} label={col} color={c} />)}
            </div>
          </section>
        )}

        {/* ═══ تفاصيل ثانوية: السكن + المميزات/الاعتبارات + التميّز ═══ */}
        <section className="ds-card flex items-center gap-3">
          <span className="text-[25px] flex-shrink-0" aria-hidden="true">🏠</span>
          <div>
            <p className="t-body font-black" style={{ color: "var(--text)" }}>السكن الجامعي</p>
            <p className="t-caption mt-0.5" style={{ color: "var(--text-dim)" }}>{housing} — تأكّد من الحالة الحالية من عمادة شؤون الطلاب.</p>
          </div>
        </section>

        {((u.pros && u.pros.length > 0) || (u.cons && u.cons.length > 0)) && (
          <CardGrid cols={2}>
            {u.pros && u.pros.length > 0 && (
              <BulletCard title="المميزات" items={u.pros} color="var(--success)" mark="✓" />
            )}
            {u.cons && u.cons.length > 0 && (
              <BulletCard title="اعتبارات قبل القرار" items={u.cons} color="var(--gold)" mark="•" />
            )}
          </CardGrid>
        )}

        {u.strengths && u.strengths.length > 0 && (
          <section className="ds-section">
            <SectionHead title="مجالات التميّز" />
            <div className="flex flex-wrap gap-2">
              {u.strengths.map((s) => <Chip key={s} label={`⭐ ${s}`} color="var(--gold)" />)}
            </div>
          </section>
        )}

        {/* ═══ الدعوة الختامية — أُعيدت: الصفحة كانت تنتهي بلا فعلٍ واضح ═══ */}
        <section className="rounded-3xl p-5 text-center ds-section"
          style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))",
                   border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
          <h2 className="t-h2 font-black" style={{ color: "var(--text)" }}>هل تكفي درجاتك؟</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
            احسب نسبتك بمعادلة {u.name}، وقارنها بجامعاتٍ أخرى، واعرف كم تحتاج أن ترفع درجاتك.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link href="/university" className="t-body font-black px-5 py-3 rounded-2xl no-underline"
              style={{ background: "var(--accent)", color: "#fff" }}>
              احسب موزونتك ←
            </Link>
            <Link href="/universities" className="t-body font-black px-5 py-3 rounded-2xl no-underline"
              style={{ color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
              استكشف بقية الجامعات
            </Link>
          </div>
        </section>

        {/* ═══ ذيل خفيف: آخر الأخبار الرسمية ═══ */}
        <section className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Link href="/universities"
            className="inline-flex items-center gap-2 t-body font-bold no-underline"
            style={{ color: "var(--accent-light)" }}>
            ← استكشف بقية الجامعات
          </Link>
          {u.website && (
            <a href={u.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 t-caption no-underline"
              style={{ color: "var(--text-muted)" }}>
              📰 آخر الأخبار على الموقع الرسمي
            </a>
          )}
        </section>
      </main>
    </div>
  );
}
