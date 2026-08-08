/* ═══ ترتيبُ الرحلة — الشاشاتُ تتبع الخريطة، والخريطةُ مكتوبةٌ مرّةً ═══
   تشغيل: npx tsx --test src/lib/journeyOrder.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  navOrder, homeSectionOrder, orderBy,
  ROADMAP_SECTION_ORDER, SCHOOL_SECTION_ORDER, UNI_TOOL_ORDER, FUTURE_TAB_ORDER,
} from "./journeyOrder";
import type { PhaseCapability } from "./transition";

/* عرضُ مرحلةٍ مصغَّر — القدراتُ وحدها هي ما يقرؤه الترتيب. */
const viewOf = (...caps: PhaseCapability[]) => ({ allows: (c: PhaseCapability) => caps.includes(c) });
const HS_12 = viewOf("school", "secondary-study");
const HS_3 = viewOf("school", "secondary-study", "admission");
const GRAD_HS = viewOf("secondary-study", "admission");
const UNI = viewOf("uni-life");
const GRAD_UNI = viewOf("career");

const src = (p: string) => readFileSync(p, "utf8");
/* معرّفاتُ الأقسام بترتيب ظهورها في الملفّ — الترتيبُ الفعليّ لا المعلَن. */
const idsIn = (file: string, re: RegExp) => [...src(file).matchAll(re)].map((m) => m[1]);

/* ════════ شريطا التنقّل ════════ */

test("الشريطُ خمسُ خاناتٍ بلا تكرارٍ ولا نقص", () => {
  for (const v of [HS_12, HS_3, GRAD_HS, UNI, GRAD_UNI, null]) {
    const o = navOrder(v);
    assert.equal(o.length, 5);
    assert.equal(new Set(o).size, 5, "خانةٌ مكرّرة");
    assert.deepEqual([...o].sort(), ["focus", "home", "mid", "vault", "world"], "خانةٌ سقطت أو دخلت");
  }
});

test("المرساةُ أوّلاً والسجلُّ آخراً في كلّ مرحلة", () => {
  for (const v of [HS_12, HS_3, GRAD_HS, UNI, GRAD_UNI, null]) {
    const o = navOrder(v);
    assert.equal(o[0], "home", "الرئيسيةُ ليست المرساة");
    assert.equal(o[4], "vault", "أخطائي ليست في الذيل");
  }
});

test("جوابُ سؤال المرحلة يلي المرساةَ مباشرةً", () => {
  /* لكلِّ مرحلةٍ سؤالٌ واحد، وجوابُه في الخانة الثانية — لا في الرابعة. */
  assert.equal(navOrder(HS_12)[1], "mid", "«وش أذاكر اليوم؟» ⇐ مساري");
  assert.equal(navOrder(HS_3)[1], "mid", "«وش وضعي للقبول؟» ⇐ القبول");
  assert.equal(navOrder(GRAD_HS)[1], "mid");
  assert.equal(navOrder(UNI)[1], "mid", "«كيف وضعي هذا الفصل؟» ⇐ الأدوات");
  /* وخريجُ الجامعة وحدَه سؤالُه «كيف أصل إلى وظيفة؟» وجوابُه «المستقبل». */
  assert.equal(navOrder(GRAD_UNI)[1], "world", "خريجُ الجامعة يُستقبَل بـ«مهاراتي» لا بـ«المستقبل»");
  assert.equal(navOrder(GRAD_UNI)[3], "mid");
});

test("الشريطان يقرآن الترتيبَ نفسَه ولا يكتبان ترتيباً بأيديهما", () => {
  for (const f of ["src/components/BottomNav.tsx", "src/components/DesktopSidebar.tsx"]) {
    assert.ok(/navOrder\(/.test(src(f)), `${f} لا يقرأ ترتيبَ الرحلة`);
  }
});

test("الوجهاتُ والبواباتُ كما هي — الترتيبُ وحده تغيّر", () => {
  const bottom = src("src/components/BottomNav.tsx");
  const side = src("src/components/DesktopSidebar.tsx");
  /* الخانةُ الخامسةُ في الجانبيّ كانت «خطتي» وفي السفليّ «أخطائي» — صارتا واحدة،
     ولا وجهةَ حُذفت: «خطتي» و«مخطط الدراسة» تليان الخمسَ في الجانبيّ. */
  for (const href of ["/dashboard", "/orbit", "/vault", "/school", "/future"]) {
    assert.ok(bottom.includes(`"${href}"`), `السفليُّ فقد ${href}`);
    assert.ok(side.includes(`"${href}"`), `الجانبيُّ فقد ${href}`);
  }
  for (const href of ["/plan", "/study-plan", "/council", "/arena", "/leaderboard", "/challenges"]) {
    assert.ok(side.includes(`"${href}"`), `الجانبيُّ فقد ${href}`);
  }
  /* البوابةُ الوحيدة كما هي: قدرةُ `school` تقرّر المدرسةَ أم المستقبل. */
  for (const f of [bottom, side]) assert.ok(/allows\("school"\)/.test(f), "بوابةُ المدرسة تغيّرت");
});

/* ════════ الرئيسية ════════ */

test("«ماذا أفعل الآن؟» أوّلُ ما يراه في كلّ مرحلة", () => {
  for (const v of [HS_12, HS_3, GRAD_HS, null]) assert.equal(homeSectionOrder(v)[0], "today");
});

test("مَن فُتح له بابُ القبول يرى «الرسميّ» قبل «إيقاعك»", () => {
  assert.deepEqual(homeSectionOrder(HS_3), ["today", "signals", "achievements"]);
  assert.deepEqual(homeSectionOrder(GRAD_HS), ["today", "signals", "achievements"]);
  /* وأوّلُ ثانويٍّ وثانيه لا موعدَ قياسٍ يخصّهما بعد — فإيقاعُهما أقربُ إليهما. */
  assert.deepEqual(homeSectionOrder(HS_12), ["today", "achievements", "signals"]);
});

test("الرئيسيةُ تتبع الخريطةَ ولا ترتّب بنفسها", () => {
  const f = src("src/app/dashboard/page.tsx");
  assert.ok(/homeSectionOrder\(/.test(f) && /orderBy\(/.test(f), "الرئيسيةُ ترتّب بيدها");
});

/* ════════ مساري · المدرسة · الأدوات · المستقبل ════════ */

test("«مساري» تفتح بفعلها لا بإحصائها", () => {
  const actual = idsIn("src/app/roadmap/page.tsx", /\{ id: "([a-z-]+)", label:/g);
  assert.deepEqual(actual, [...ROADMAP_SECTION_ORDER]);
  assert.equal(actual[0], "start", "زرُّ «ابدأ المذاكرة» ليس أوّلَ الصفحة");
  /* وهو ثابتٌ: صفحةٌ لا تبدأ منها المذاكرةُ ليست «مساري». */
  assert.ok(/\{ id: "start",[^}]*fixed: true/.test(src("src/app/roadmap/page.tsx")));
});

test("«المدرسة» ترتّب بالإلحاح لا بالبناء", () => {
  const actual = idsIn("src/app/school/page.tsx", /\{ id: "([a-z-]+)", label:/g);
  const at = (id: string) => actual.indexOf(id);
  assert.deepEqual(actual, [...SCHOOL_SECTION_ORDER]);
  assert.ok(at("homework") < at("timeline"), "التقويمُ قبل الواجب المستحقّ");
  assert.ok(at("homework") < at("tomorrow"), "«غداً» يحيل إلى المذكرة فلا يسبقها");
  assert.ok(at("tomorrow") < at("subjects"), "الموادُّ قبل ضغط الغد");
  assert.ok(at("journal") > at("exams") && at("memories") > at("exams"), "الذكرياتُ قبل ما يُقاس");
});

test("«أدوات الجامعة» بترتيب الفصل لا بترتيب الإنشاء", () => {
  const actual = idsIn("src/app/uni-tools/UniTools.tsx", /\{ id: "([a-z]+)", *label:/g);
  assert.deepEqual(actual, [...UNI_TOOL_ORDER]);
  assert.equal(actual[0], "absence", "الحرمانُ وحدَه لا يُعوَّض — فيُسأل عنه أوّلاً");
  /* والوصفُ في الترويسة يذكرها بترتيبها فلا يكذب سطرٌ على الصفحة. */
  assert.ok(/الغياب والفاينل والمعدل/.test(src("src/app/uni-tools/page.tsx")));
});

test("«المستقبل» بترتيب رحلة خريج الجامعة", () => {
  const f = src("src/app/career/CareerCenter.tsx");
  const actual = idsIn("src/app/career/CareerCenter.tsx", /\{ id: "([a-z]+)", *label:/g)
    .filter((id) => (FUTURE_TAB_ORDER as readonly string[]).includes(id));
  assert.deepEqual(actual, [...FUTURE_TAB_ORDER]);
  assert.equal(actual[0], "resume", "السيرةُ ورقتُه الأولى");
  /* والتبويبُ المفتوح يتبع الترتيب — كان «التدريب» ونصُّه «قبل التخرّج». */
  assert.ok(/useState<TabId>\(TABS\[0\]\.id\)/.test(f), "التبويبُ الافتراضيُّ مكتوبٌ بيده");
});

/* ════════ حدودُ المرحلة ════════ */

test("لم يُركَّب مكوّنٌ ميت", () => {
  const dead = ["LifeBoard", "RecommendationFeed", "DashUniWorld", "GoldenPath"];
  const surfaces = [
    "src/app/dashboard/page.tsx", "src/app/roadmap/page.tsx", "src/app/school/page.tsx",
    "src/app/uni-tools/page.tsx", "src/app/future/page.tsx",
    "src/components/BottomNav.tsx", "src/components/DesktopSidebar.tsx",
    "src/components/dash/PhaseHome.tsx",
  ];
  for (const f of surfaces) {
    for (const d of dead) {
      assert.ok(!new RegExp(`<${d}[\\s/>]`).test(src(f)), `${f} يركّب ${d}`);
    }
  }
});

test("خريطةُ الرحلة لا تعرف مكوّناً ولا تخزيناً ولا حدثاً", () => {
  const f = src("src/lib/journeyOrder.ts");
  assert.ok(!/localStorage|window\.|emit\(|from "\.\/storage"/.test(f), "الخريطةُ تلمس ما ليس لها");
  /* تسأل عن القدرة ولا تشتقّ مرحلة. */
  assert.ok(!/studyLevel|gradStage|computeStudentPhase|phaseExperience/.test(f));
});

test("orderBy: ما ليس في الخريطة يبقى في الذيل بترتيبه", () => {
  const items = [{ id: "c" }, { id: "a" }, { id: "zz" }, { id: "b" }];
  assert.deepEqual(orderBy(items, ["a", "b", "c"]).map((x) => x.id), ["a", "b", "c", "zz"]);
});
