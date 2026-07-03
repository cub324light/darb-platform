import type { MetadataRoute } from "next";

/* الصفحات الخاصة (خلف تسجيل الدخول أو إدارية) — تُمنع من الفهرسة كي لا يفهرس
   Google جدران تسجيل دخول رفيعة أو مسارات خاصة. الصفحات العامة تبقى مسموحة. */
const PRIVATE_PATHS = [
  "/admin", "/api/",
  "/dashboard", "/profile", "/vault", "/council", "/arena", "/orbit",
  "/roadmap", "/review", "/skills", "/challenges", "/leaderboard",
  "/study-plan", "/plan", "/university", "/opportunities", "/parent", "/onboarding",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: "https://usedarb.com/sitemap.xml",
  };
}
