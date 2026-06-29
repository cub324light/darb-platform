import type { MetadataRoute } from "next";

const BASE = "https://usedarb.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(); // يُحدَّث تلقائياً مع كل بناء
  return [
    { url: BASE,                   lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/pricing`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/changelog`,    lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/subscription`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
