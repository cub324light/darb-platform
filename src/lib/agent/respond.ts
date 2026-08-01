/* ردٌّ موحّد لواجهات الوكلاء: JSON + CORS (الوكيل يستدعيها من أصلٍ آخر) + تخزينٌ
   مؤقّت. بياناتُنا العامّة ثابتةٌ نسبياً فساعةٌ كافية وتحمي الخادم من الطَرق. */
export const AGENT_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "public, max-age=3600, s-maxage=3600",
} as const;

export const agentJson = (data: unknown, init?: ResponseInit) =>
  Response.json(data, { ...init, headers: { ...AGENT_HEADERS, ...(init?.headers ?? {}) } });

export const OPTIONS = () => new Response(null, { status: 204, headers: AGENT_HEADERS });
