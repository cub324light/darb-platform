/* ═══ سجلُّ الجلسات — مصدرٌ واحدٌ وترحيلٌ بلا فقدِ جلسة ═══
   تشغيل: TZ=UTC npx tsx --test src/lib/roadmap/sessionStore.test.ts */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* متجرٌ صغيرٌ يقوم مقام localStorage — الاختبارُ يعمل في node بلا متصفّح. */
class FakeStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const store = new FakeStorage();
(globalThis as unknown as { window: unknown }).window = {};
(globalThis as unknown as { localStorage: FakeStorage }).localStorage = store;

/* `sessionStore` لا يلمس التخزينَ إلا داخل دوالّه، فالاستيرادُ الساكن آمنٌ بعد
   تركيب المتجر أعلاه (جسمُ الوحدة لا يقرأ شيئاً عند التحميل). */
import { loadSessions, appendSession, saveSessions } from "./sessionStore";

const NEW_KEY = "darb_sessions";
const OLD_KEY = "darb_session_log";
const at = (iso: string) => Date.parse(iso);

beforeEach(() => { store.removeItem(NEW_KEY); store.removeItem(OLD_KEY); });

test("السجلُّ الجديد يُقرأ كما هو حين لا قديمَ", () => {
  saveSessions([{ id: "a", examId: "qudurat", subject: "لفظي", taskKind: "review", startedAt: at("2026-08-13T10:00:00Z"), durationMins: 40 }]);
  const out = loadSessions();
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "a");
});

test("الترحيل: كلُّ جلسةٍ قديمةٍ تنتقل بلا فقد، بترتيبها الزمنيّ", () => {
  /* الشكلُ القديم: وقتُ **الانتهاء** (`ts`) ودقائقُ التركيز. الجديدُ يحمل البداية. */
  store.setItem(OLD_KEY, JSON.stringify([
    { id: "old2", subject: "كيمياء", focusMins: 25, ts: at("2026-08-12T18:25:00Z") },
    { id: "old1", subject: "فيزياء", focusMins: 50, ts: at("2026-08-10T20:50:00Z") },
  ]));
  const out = loadSessions();
  assert.equal(out.length, 2, "لم تضِع جلسة");
  assert.deepEqual(out.map((s) => s.id), ["old1", "old2"], "مرتَّبةٌ بالبداية");
  assert.equal(out[0].subject, "فيزياء");
  assert.equal(out[0].durationMins, 50);
  assert.equal(out[0].startedAt, at("2026-08-10T20:00:00Z"), "البدايةُ = الانتهاء − المدّة");
  assert.equal(out[0].examId, "orbit");
});

test("الترحيلُ يدمج مع الموجود ولا يمحوه", () => {
  saveSessions([{ id: "new1", examId: "masari", subject: "كمي", taskKind: "drill", startedAt: at("2026-08-14T09:00:00Z"), durationMins: 30 }]);
  store.setItem(OLD_KEY, JSON.stringify([{ id: "old1", subject: "لفظي", focusMins: 20, ts: at("2026-08-11T09:20:00Z") }]));
  const out = loadSessions();
  assert.deepEqual(out.map((s) => s.id), ["old1", "new1"]);
});

test("الترحيلُ لا يُضاعف جلسةً كُتبت في السجلّين معاً", () => {
  /* `/orbit` كان يكتب الواقعةَ نفسَها في السجلّين بمعرّفين مختلفين — فالمطابقةُ
     بالبداية والمدّة تمنع أن تصير جلسةٌ واحدةٌ جلستين بعد الدمج. */
  saveSessions([{ id: "x1", examId: "orbit", subject: "لفظي", taskKind: "review", startedAt: at("2026-08-13T10:00:00Z"), durationMins: 45 }]);
  store.setItem(OLD_KEY, JSON.stringify([{ id: "x2", subject: "لفظي", focusMins: 45, ts: at("2026-08-13T10:45:00Z") }]));
  const out = loadSessions();
  assert.equal(out.length, 1, "واقعةٌ واحدةٌ تبقى واحدة");
});

test("الترحيلُ يجري مرّةً واحدةً ثم يُحذف المفتاحُ القديم", () => {
  store.setItem(OLD_KEY, JSON.stringify([{ id: "o", subject: "أحياء", focusMins: 15, ts: at("2026-08-09T12:15:00Z") }]));
  assert.equal(loadSessions().length, 1);
  assert.equal(store.getItem(OLD_KEY), null, "المفتاحُ القديم يُخلى");
  assert.equal(loadSessions().length, 1, "قراءةٌ ثانيةٌ لا تُضاعف");
});

test("قديمٌ تالفٌ أو غيرُ مصفوفةٍ لا يُسقط القراءة", () => {
  store.setItem(OLD_KEY, "{ ليس مصفوفة }");
  assert.deepEqual(loadSessions(), []);
});

test("appendSession يُلحِق على المصدر الواحد", () => {
  appendSession({ id: "s1", examId: "orbit", subject: "لفظي", taskKind: "review", startedAt: at("2026-08-14T08:00:00Z"), durationMins: 25 });
  appendSession({ id: "s2", examId: "orbit", subject: "كمي", taskKind: "drill", startedAt: at("2026-08-14T10:00:00Z"), durationMins: 30 });
  assert.deepEqual(loadSessions().map((s) => s.id), ["s1", "s2"]);
});
