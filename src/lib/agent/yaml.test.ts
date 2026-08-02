/* اختبار مُصدِّر YAML — نكتبه بأنفسنا فيجب أن نُثبت أنه يُنتج YAML صالحاً،
   وأن المستند يعود كما خرج بلا حرفٍ ضائع.
   تشغيل: npx tsx --test src/lib/agent/yaml.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toYaml } from "./yaml";
import { openApiSpec } from "./openapi";

/* js-yaml موجودٌ في الشجرة بوصفه اعتماديّةً غيرَ مباشرة، ولا نُعلنه اعتماديّةً
   لنا. فإن غاب نكتفي بالفحوص البنيوية بدل أن يسقط الاختبار كلُّه. */
async function loadYaml(): Promise<((s: string) => unknown) | null> {
  try {
    /* مُحدِّدٌ متغيّر لا نصّيّ: الحزمة بلا أنواعٍ معلنة، ولا نريد إضافتها اعتماديّةً
       لأجل اختبار. TypeScript يُعطي `any` هنا، فنُضيّقه بأنفسنا. */
    const id = "js-yaml";
    const m = (await import(id)) as { load: (s: string) => unknown };
    return (s: string) => m.load(s);
  } catch { return null; }
}

const sample = {
  openapi: "3.1.0",
  info: { title: "درب — واجهة", version: "1.0.0", description: "سطرٌ أول\nسطرٌ ثانٍ: فيه نقطتان" },
  servers: [{ url: "https://usedarb.com" }],
  paths: { "/api/agent/faq": { get: { operationId: "searchFaq", responses: { "200": { description: "نجاح" } } } } },
  tags: ["a", "b"],
  emptyObj: {},
  emptyArr: [],
  flags: { yes: true, no: false, nothing: null, count: 7 },
  nested: [{ name: "أول", items: [{ deep: true }] }, { name: "ثانٍ", items: [] }],
};

test("toYaml: مستندٌ صالح يعود كما خرج", async () => {
  const parse = await loadYaml();
  if (!parse) return;
  assert.deepEqual(parse(toYaml(sample)), JSON.parse(JSON.stringify(sample)));
});

test("toYaml: وصفُ OpenAPI كاملاً يمرّ بلا فقد", async () => {
  const parse = await loadYaml();
  if (!parse) return;
  const spec = openApiSpec();
  assert.deepEqual(parse(toYaml(spec)), JSON.parse(JSON.stringify(spec)));
});

test("toYaml: المفاتيح مقتبسة فلا يلتبس «200» ولا «no»", () => {
  const out = toYaml(sample);
  assert.ok(out.includes(`"200":`), "المفتاح الرقمي يجب أن يبقى نصّاً مقتبساً");
  assert.ok(out.includes(`"no": false`), "«no» مفتاحٌ خطِر في YAML 1.1 — يُقتبس");
  assert.ok(out.includes(`"emptyObj": {}`) && out.includes(`"emptyArr": []`));
  assert.ok(out.endsWith("\n"));
});

test("toYaml: العربية والأسطر الجديدة لا تكسر المستند", () => {
  const out = toYaml({ ar: "درب — «المنصة»", multi: "سطر\nسطر" });
  assert.ok(!out.includes("\nسطر"), "السطر الجديد داخل النصّ يُهرَّب لا يُطبع");
  assert.ok(out.includes("درب"));
});
