/* ─── بياناتٌ مهيكلة (JSON-LD) ───
   تصف درب لمحرّكات البحث ولوكلاء الذكاء الاصطناعي بلغةٍ يفهمانها: منظّمة،
   وموقع بخاصيّة بحث، وتطبيقُ ويب. تُبنى من `catalog.ts` — المصدر نفسه الذي
   يغذّي llms.txt وOpenAPI، فلا يقول أحدُهما ما يخالف الآخر.

   مكوّنٌ خادميّ خالص: يُحقَن في HTML وقت البناء، فيقرؤه الزاحف بلا تشغيل JS. */
import { SITE, CAPABILITIES } from "@/lib/agent/catalog";

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      alternateName: SITE.nameEn,
      url: SITE.url,
      logo: `${SITE.url}/icon.svg`,
      description: SITE.descriptionAr,
      areaServed: { "@type": "Country", name: "السعودية" },
      knowsLanguage: "ar",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.descriptionAr,
      inLanguage: "ar",
      publisher: { "@id": `${SITE.url}/#organization` },
      /* بحثُ الجامعات هو البحثُ العام في درب */
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/universities?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: SITE.url,
      description: SITE.descriptionAr,
      inLanguage: "ar",
      publisher: { "@id": `${SITE.url}/#organization` },
      featureList: CAPABILITIES.map((c) => c.name),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "SAR",
        description: "خطة مجانية متاحة",
        url: `${SITE.url}/pricing`,
      },
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      /* JSON مُسلسَلٌ من كائنٍ نملكه — لا مدخلات مستخدم، فلا خطر حقن */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

/** فتاتُ المسار — لصفحات الجامعات وغيرها. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE.url}${it.path}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

