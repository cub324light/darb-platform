/* حارسُ طبقة الوكلاء — يمنع عودة عطلٍ صامت وقعَ فعلاً.
   تشغيل: npx tsx --test src/lib/agent/agentRoutes.test.ts

   القصّة: كانت واجهاتُ `/api/agent/*` معلَّمةً `force-static`. وNext يُفرِغ
   `searchParams` في المعالِج الثابت، فصار `?id=kfupm` يُعيد الجامعات الستّ
   والثلاثين كلَّها بدل ملفّ الجامعة، و`?q=زززز` يُعيد الأسئلة السبعة والخمسين
   كلَّها. البناءُ ينجح، والأنواعُ سليمة، والاختبارات خضراء — ولا شيء يشتكي.
   وصفُ OpenAPI يَعِد بهذه المعاملات، فالوكيلُ يطلبها ويُصدّق ما يُعاد إليه. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { universityDetail, universitiesPayload, faqPayload } from "./catalog";
import { ENDPOINTS, AI_DOCUMENTS } from "./catalog";
import { AGENT_SKILLS, skillDigest } from "./skills";
import { MARKDOWN_PAGES } from "./pageMarkdown";
import { SCHEMAS, TOOL_INPUTS } from "./schemas";
import { openApiSpec } from "./openapi";

const routeFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) out.push(...routeFiles(f));
    else if (e === "route.ts") out.push(f);
  }
  return out;
};

test("المعالِجُ الذي يقرأ searchParams ليس force-static", () => {
  const offenders: string[] = [];
  for (const f of [...routeFiles("src/app/api/agent"), ...routeFiles("src/app/api/well-known")]) {
    const src = readFileSync(f, "utf8");
    const readsParams = /searchParams|new URL\(\s*req(?:uest)?\.url/.test(src);
    const isStatic = /dynamic\s*=\s*"force-static"/.test(src);
    if (readsParams && isStatic) offenders.push(f);
  }
  assert.deepEqual(offenders, [],
    "‏force-static يُفرِغ searchParams — استعمِل force-dynamic مع ترويسة تخزينٍ مؤقّت في:\n" +
    offenders.join("\n"));
});

/* ═══ التصفيةُ نفسُها تعمل — لا نكتفي بشكل المعالِج ═══ */

test("universityDetail: معرّفٌ صحيح يُعيد جامعةً بكلياتها", () => {
  const u = universityDetail("kfupm");
  assert.ok(u, "لم تُعَد جامعةُ البترول");
  assert.equal(u.id, "kfupm");
  assert.ok(u.colleges.length > 0, "جامعةٌ بلا كليات");
  assert.ok(u.majorsCount > 0);
});

test("universityDetail: معرّفٌ مجهول يُعيد null لا قائمةً كاملة", () => {
  assert.equal(universityDetail("لا-توجد"), null);
  assert.equal(universityDetail(""), null);
});

test("faqPayload: البحثُ يصفّي فعلاً", () => {
  const all = faqPayload();
  assert.ok(all.length > 10, "بيانات الأسئلة فارغة؟");
  assert.equal(faqPayload("زززز").length, 0, "بحثٌ لا يطابق شيئاً يجب أن يُعيد صفراً");
  const some = faqPayload("ستيب");
  assert.ok(some.length > 0 && some.length < all.length, `التصفية لم تُضيّق: ${some.length}/${all.length}`);
});

test("universitiesPayload: «أخرى» ليست جامعة", () => {
  assert.ok(!universitiesPayload().some((u) => u.id === "other"));
});

/* ═══ الوصفُ لا يَعِد بما لا يوجد ═══ */

test("OpenAPI: كل مسارٍ موصوفٍ له معالِجٌ على القرص", () => {
  for (const p of Object.keys(openApiSpec().paths)) {
    const dir = p === "/mcp" ? "src/app/api/mcp" : `src/app${p}`;
    assert.ok(statSync(join(dir, "route.ts")).isFile(), `${p}: موصوفٌ في OpenAPI بلا معالِج`);
  }
});

test("OpenAPI: لا إشارةَ `$ref` معلّقة", () => {
  const spec = openApiSpec();
  const names = new Set(Object.keys(spec.components.schemas));
  const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, "لا إشاراتٍ أصلاً — هل انفصل الوصفُ عن المخطّطات؟");
  for (const r of refs) assert.ok(names.has(r), `إشارةٌ إلى مخطّطٍ غير معرّف: ${r}`);
  /* ولا تبقى صيغةُ JSON Schema الأصلية (`#/$defs/`) داخل مستند OpenAPI */
  assert.ok(!JSON.stringify(spec).includes("#/$defs/"), "بقيت إشارةُ $defs بلا إعادة ربط");
});

test("لكل واجهةٍ في الكتالوج معالِجٌ ومخطّطٌ لأداة MCP", () => {
  for (const e of ENDPOINTS) {
    assert.ok(statSync(join("src/app", e.path, "route.ts")).isFile(), `${e.path}: بلا معالِج`);
  }
  /* أسماءُ الأدوات في MCP يجب أن تُغطّي مخطّطاتِ المدخلات كلَّها */
  const mcp = readFileSync("src/app/api/mcp/route.ts", "utf8");
  for (const name of Object.keys(TOOL_INPUTS)) {
    assert.ok(mcp.includes(`name: "${name}"`), `مخطّطُ مدخلاتٍ بلا أداة: ${name}`);
  }
});

/* ═══ وثائقُ الوكلاء: موجودةٌ فعلاً، ومذكورةٌ حيث يجدها الزاحف ═══
   القصّة: كانت الوثائق تُقدَّم بحالة 200 لكنها غائبةٌ عن sitemap.xml وغيرَ
   موصولةٍ من أي صفحة — فمَن لا يعرف اسمها لا يصل إليها. */
test("AI_DOCUMENTS: لكل وثيقةٍ معالِجٌ أو إعادةُ كتابة", () => {
  const cfg = readFileSync("next.config.ts", "utf8");
  const missing: string[] = [];
  for (const d of AI_DOCUMENTS) {
    const hasRoute = existsSync(join("src/app", d.path, "route.ts"));
    const hasRewrite = cfg.includes(`source: "${d.path}"`);
    if (!hasRoute && !hasRewrite) missing.push(d.path);
  }
  assert.deepEqual(missing, [], `وثيقةٌ معلنةٌ بلا معالِجٍ ولا rewrite:\n${missing.join("\n")}`);
});

test("خريطةُ الموقع تذكر كل وثيقةِ وكلاء", () => {
  const src = readFileSync("src/app/sitemap.ts", "utf8");
  assert.ok(src.includes("AI_DOCUMENTS"), "sitemap.ts لا يقرأ AI_DOCUMENTS");
});

test("صفحةُ التوثيق تصل كل وثيقةٍ برابطٍ حقيقي", () => {
  const src = readFileSync("src/app/docs/api/page.tsx", "utf8");
  assert.ok(src.includes("AI_DOCUMENTS"), "صفحة /docs/api لا تصل الوثائق");
});

test("robots.txt يسمح لروبوتات الذكاء الاصطناعي المطلوبة", () => {
  const src = readFileSync("src/app/robots.txt/route.ts", "utf8");
  for (const bot of ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "CCBot", "Amazonbot"]) {
    assert.ok(src.includes(`"${bot}"`), `روبوتٌ غير مذكور في robots.txt: ${bot}`);
  }
});

test("robots.txt يحمل إشاراتِ المحتوى الثلاث", () => {
  const src = readFileSync("src/app/robots.txt/route.ts", "utf8");
  assert.match(src, /Content-Signal: \$\{CONTENT_SIGNAL\}/, "التوجيه غير مكتوبٍ في المجموعة");
  for (const sig of ["search=", "ai-input=", "ai-train="]) {
    assert.ok(src.includes(sig), `إشارةٌ ناقصة: ${sig}`);
  }
});

/* ═══ معايير الاكتشاف الحديثة ═══ */

test("مهارات الوكلاء: البصمةُ تطابق النصّ المنشور", async () => {
  const { createHash } = await import("node:crypto");
  for (const s of AGENT_SKILLS) {
    const expected = createHash("sha256").update(s.body, "utf8").digest("hex");
    assert.equal(skillDigest(s), expected, `${s.id}: بصمةٌ لا تطابق محتواها`);
    assert.match(s.body, /^---\nname: /, `${s.id}: ملفّ المهارة بلا ترويسة YAML`);
    assert.ok(s.body.length > 200, `${s.id}: ملفٌّ أقصر من أن يفيد`);
  }
  const ids = AGENT_SKILLS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "معرّفُ مهارةٍ مكرَّر");
});

/* الصفحاتُ المتفاوَض عليها مذكورةٌ في موضعين: مولِّد النصّ، وقائمةُ إعادات
   الكتابة في next.config. لو افترقا صمتاً لعاد HTML لمن طلب Markdown. */
test("تفاوضُ Markdown: القائمتان متطابقتان", () => {
  const cfg = readFileSync("next.config.ts", "utf8");
  const line = /const markdownPages = \[([^\]]+)\]/.exec(cfg);
  assert.ok(line, "لم أجد markdownPages في next.config.ts");
  const inConfig = [...line[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  const inCode = Object.keys(MARKDOWN_PAGES).sort();
  assert.deepEqual(inConfig, inCode, "صفحةٌ في أحد الموضعين دون الآخر");
});

test("تفاوضُ Markdown: كل صفحةٍ تُنتج نصّاً حقيقياً", () => {
  for (const [path, build] of Object.entries(MARKDOWN_PAGES)) {
    const md = build();
    assert.ok(md.startsWith("# "), `${path}: لا يبدأ بعنوان`);
    assert.ok(md.length > 200, `${path}: نصٌّ أقصر من أن يفيد (${md.length})`);
  }
});

/* الفاحصُ وجد /auth.md لكنه رفضه: عنوانُه الأول كان عربياً و«Auth.md» اسمُ
   الاصطلاح يُقرأ بنصّه. القاعدةُ سهلةُ الكسر عند أي إعادة صياغة، فنقفلها. */
test("auth.md: عنوانُه الأول «# Auth.md» حرفاً بحرف", () => {
  const src = readFileSync("src/app/auth.md/route.ts", "utf8");
  assert.match(src, /const body = `# Auth\.md\n/, "العنوان الأول ليس «# Auth.md»");
  assert.ok(src.includes("Agent Registration"), "قسمُ تسجيل الوكلاء بلا اسمه الإنجليزي");
  assert.ok(src.includes("agent_auth"), "كتلةُ agent_auth مفقودة");
});

test("المخطّطات: لكلٍّ نوعٌ وعنوان", () => {
  for (const [name, s] of Object.entries(SCHEMAS)) {
    assert.equal(s.type, "object", `${name}: ليس كائناً`);
    assert.ok(s.title, `${name}: بلا عنوان`);
    assert.ok(s.description, `${name}: بلا وصف`);
  }
});
