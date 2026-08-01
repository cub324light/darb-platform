/* درب لا تُصدر رموزاً بنفسها — الهويّة من Google عبر Firebase. فبدل ادّعاء خادم
   تفويضٍ لا نملكه، نُحيل إلى بيان Google الحقيقيّ (RFC 8414). */
export const dynamic = "force-static";

export function GET() {
  return Response.redirect("https://accounts.google.com/.well-known/openid-configuration", 308);
}
