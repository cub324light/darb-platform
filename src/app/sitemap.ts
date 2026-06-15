import type { MetadataRoute } from "next";

const BASE = "https://darb-platform.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/pricing`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
