/* ═══ ذاكرةُ دويرب — ذاكرةٌ واحدةٌ لا اثنتان ═══
   تشغيل: TZ=UTC npx tsx --test src/lib/coachMemory.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MemoryEngine } from "./memory/engine";
import { InMemoryStore } from "./memory/store";
import { EventEngine, InMemoryEventStore } from "./events";
import { makeMemoryReactor } from "./events/reactors";
import { formatMemoryHint, type CoachMemory } from "./coachMemory";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".ts") || p.endsWith(".tsx")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const MEMORY_ID = "conversation.coachInteraction:self";

function wired() {
  const at = () => Date.parse("2026-08-14T09:00:00Z");
  const mem = new MemoryEngine(new InMemoryStore(), at);
  const events = new EventEngine(new InMemoryEventStore(), { clock: at });
  const r = makeMemoryReactor(mem);
  events.subscribe(r.react, r.handles, r.name);
  return { mem, events };
}

test("تفاعلُ أداةٍ يصل الذاكرةَ عبر الحدث لا بكتابةٍ مباشرة", () => {
  const { mem, events } = wired();
  events.emit({
    eventType: "CoachInteractionUsed",
    metadata: { mode: "schedule", summary: "بنينا جدولاً", date: "2026-08-14", subjects: ["كيمياء"] },
  });
  const rec = mem.all().find((m) => m.id === MEMORY_ID);
  assert.ok(rec, "لم تُكتب الذاكرة");
  assert.equal((rec!.value as { mode: string }).mode, "schedule");
  assert.equal((rec!.value as { subjects?: string[] }).subjects?.[0], "كيمياء");
});

test("«آخرُ تفاعل» سجلٌّ واحدٌ يُحدَّث في مكانه — لا تكديس", () => {
  const { mem, events } = wired();
  const base = { summary: "س", date: "2026-08-14" };
  events.emit({ eventType: "CoachInteractionUsed", metadata: { ...base, mode: "schedule" } });
  events.emit({ eventType: "CoachInteractionUsed", metadata: { ...base, mode: "quiz", subjects: ["فيزياء"] } });
  events.emit({ eventType: "CoachInteractionUsed", metadata: { ...base, mode: "explain" } });
  const recs = mem.all().filter((m) => m.type === "conversation.coachInteraction");
  assert.equal(recs.length, 1, "ثلاثةُ تفاعلاتٍ ⇒ سجلٌّ واحد");
  assert.equal((recs[0].value as { mode: string }).mode, "explain", "الأحدثُ هو المحفوظ");
  assert.ok(recs[0].version >= 3, "النسخةُ ترتفع بالدمج");
});

test("مدخلٌ بنمطٍ غيرِ معروفٍ يُرفض ولا يفسد الذاكرة", () => {
  const { mem, events } = wired();
  events.emit({
    eventType: "CoachInteractionUsed",
    metadata: { mode: "غير معروف", summary: "س", date: "2026-08-14" } as never,
  });
  assert.equal(mem.all().length, 0, "قيمةٌ غيرُ صالحةٍ لا تُكتب");
  /* وفشلُ المُتفاعِل معزولٌ ومسجَّل — لا يُسقط الحدثَ ولا بقيّةَ المشتركين. */
  const failures = events.all().filter((e) => e.eventType === "ReactorFailed");
  assert.equal(failures.length, 1);
});

test("برومبت دويرب لم يتغيّر: النوعُ الجديد خارج السياق المُركّب", () => {
  /* `formatDuwairbContext` يقرأ `buildStudentContext` وحدَه؛ فلو دخل هذا النوعُ
     في `openThreads` أو `recentLifeEvents` لتغيّر ما يُحقَن في النموذج. */
  const { mem, events } = wired();
  events.emit({
    eventType: "CoachInteractionUsed",
    metadata: { mode: "progress", summary: "تحليل", date: "2026-08-14", recommendation: "ركّز على الكيمياء" },
  });
  const ctx = mem.buildStudentContext();
  assert.deepEqual(ctx.openThreads, []);
  assert.deepEqual(ctx.recentLifeEvents, []);
  const engineSrc = readFileSync("src/lib/memory/engine.ts", "utf8");
  assert.ok(!/coachInteraction/.test(engineSrc), "النوعُ تسرّب إلى بناء السياق");
});

test("جملةُ التذكير كما كانت حرفاً بحرف", () => {
  const today: CoachMemory = { last: { date: new Date().toISOString().slice(0, 10), mode: "schedule", summary: "س", subjects: ["كيمياء"] } };
  assert.equal(formatMemoryHint(today), "بنّينا اليوم جدولاً يشمل كيمياء. هل تريد تعديله؟");
  assert.equal(formatMemoryHint({}), null, "بلا ذاكرةٍ لا جملة");
  const old: CoachMemory = { last: { date: "2020-01-01", mode: "quiz", summary: "س", subjects: ["فيزياء"] } };
  assert.equal(formatMemoryHint(old), null, "أقدمُ من أسبوعٍ لا يُذكَر");
});

test("لا مخزنَ ذاكرةٍ ثانٍ: `darb_coach_memory` لا يُكتب من أحد", () => {
  const offenders: string[] = [];
  for (const f of walk("src")) {
    if (f.endsWith("src/lib/coachMemory.ts") || f.endsWith("src/lib/storageKeys.ts")) continue;
    if (/darb_coach_memory/.test(stripComments(readFileSync(f, "utf8")))) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `مخزنُ ذاكرةٍ موازٍ:\n${offenders.join("\n")}`);
  /* وفي `coachMemory` نفسِه: قراءةٌ للترحيل وحذفٌ — ولا كتابةَ إطلاقاً. */
  const src = stripComments(readFileSync("src/lib/coachMemory.ts", "utf8"));
  assert.ok(!/setItem\(/.test(src), "ما زال يكتب في مخزنه القديم");
  assert.ok(/removeItem\(LEGACY_KEY\)/.test(src), "لا يُخلي المخزنَ القديم بعد الترحيل");
});

test("مَعبرُ الكتابة واحد: حدثٌ ثم مُتفاعِل", () => {
  const src = stripComments(readFileSync("src/lib/coachMemory.ts", "utf8"));
  assert.ok(/eventType:\s*"CoachInteractionUsed"/.test(src), "لا يمرّ بالحدث");
  assert.ok(!/\.remember\(/.test(src), "يكتب الذاكرةَ مباشرةً بلا مُتفاعِل");
});
