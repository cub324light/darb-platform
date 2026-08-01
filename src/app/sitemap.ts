import type { MetadataRoute } from "next";
import { UNIVERSITIES } from "@/lib/university";

const BASE = "https://usedarb.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(); // يُحدَّث تلقائياً مع كل بناء
  /* دفعة ملفات الجامعات — كل جامعة حقيقية (عدا «أخرى») صفحة ثابتة مفهرسة */
  const universityPages: MetadataRoute.Sitemap = UNIVERSITIES
    .filter((u) => u.id !== "other")
    .map((u) => ({
      url: `${BASE}/universities/${u.id}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  return [
    { url: BASE,                   lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/about`,        lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/features`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/docs`,         lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/docs/api`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pricing`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/universities`,       lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/faq`,                lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tahsili/flashcards`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/success-stories`,    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/changelog`,    lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/subscription`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ...universityPages,
  ];
}
