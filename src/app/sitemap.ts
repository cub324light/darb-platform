import type { MetadataRoute } from "next";

const BASE = "https://darb-platform.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  /* صفحات عامة فقط — /onboarding محمية بتسجيل الدخول فلا تُفهرس */
  const routes = ["", "/pricing", "/privacy"];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
