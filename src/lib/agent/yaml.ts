/* ═══════════ مُصدِّر YAML صغير — بلا اعتماديّة ═══════════
   بعضُ أدوات الوكلاء تطلب `openapi.yaml` لا `.json`. بدل إضافة حزمةٍ كاملة
   (تُثقل البناء) نكتب المُصدِّر: مخرَجُنا كائناتُ JSON نقيّة لا غير.

   الحيلة: JSON صيغةٌ فرعية من YAML 1.2، فالنصوص المقتبسة بـ`JSON.stringify`
   صالحةٌ حرفياً في YAML — بما فيها العربية والأسطر الجديدة والنقطتان. نقتبس كل
   مفتاحٍ وكل نصّ فلا يبقى موضعُ لبس (مثل `on:` أو `no:` أو `200:`). */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const q = (s: string) => JSON.stringify(s);

/* كلماتٌ يقرؤها YAML 1.1 قيماً منطقية لا نصّاً، فتبقى مقتبسة مفاتيحَ كانت أو قيماً */
const RESERVED = new Set([
  "true", "false", "null", "yes", "no", "on", "off", "y", "n", "~",
]);

/** مفتاحٌ بسيط (حرفٌ ثم حروف/أرقام/شرطة) لا لبسَ فيه — يُكتب عارياً.
    وغيرُه يُقتبس: «200» و«no» ومَن فيه نقطتان أو مسافة. الفائدةُ ليست جمالاً
    فقط: قارئٌ يبحث عن `agent_auth:` في أوّل السطر لا يجدها مقتبسة. */
const plainKey = (k: string) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(k) && !RESERVED.has(k.toLowerCase());

const key = (k: string) => (plainKey(k) ? k : q(k));

const isScalar = (v: Json): v is null | boolean | number | string =>
  v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string";

const scalar = (v: null | boolean | number | string) =>
  typeof v === "string" ? q(v) : String(v);

const isEmpty = (v: Json) =>
  Array.isArray(v) ? v.length === 0 : Object.keys(v as object).length === 0;

const emptyLiteral = (v: Json) => (Array.isArray(v) ? "[]" : "{}");

/** يُخرِج أسطرَ قيمةٍ مركّبة (مصفوفة أو كائن) عند مستوى إزاحةٍ معلوم. */
function block(v: Json, indent: number): string[] {
  const pad = "  ".repeat(indent);
  const out: string[] = [];

  if (Array.isArray(v)) {
    for (const item of v) {
      if (isScalar(item)) { out.push(`${pad}- ${scalar(item)}`); continue; }
      if (isEmpty(item)) { out.push(`${pad}- ${emptyLiteral(item)}`); continue; }
      /* عنصرٌ مركّب: أسطرُه تُزاح مستوىً إضافياً، و«- » تحلّ محلّ أوّل مسافتين
         من السطر الأول حتى تبقى الأعمدة مستقيمة. */
      const sub = block(item, indent + 1);
      sub[0] = `${pad}- ${sub[0].slice((indent + 1) * 2)}`;
      out.push(...sub);
    }
    return out;
  }

  for (const [k, val] of Object.entries(v as Record<string, Json>)) {
    if (isScalar(val)) { out.push(`${pad}${key(k)}: ${scalar(val)}`); continue; }
    if (isEmpty(val)) { out.push(`${pad}${key(k)}: ${emptyLiteral(val)}`); continue; }
    out.push(`${pad}${key(k)}:`);
    out.push(...block(val, indent + 1));
  }
  return out;
}

/** يُحوّل كائناً إلى مستند YAML كامل. */
export function toYaml(value: unknown): string {
  const data = JSON.parse(JSON.stringify(value)) as Json;
  if (isScalar(data)) return `${scalar(data)}\n`;
  if (isEmpty(data)) return `${emptyLiteral(data)}\n`;
  return `${block(data, 0).join("\n")}\n`;
}
