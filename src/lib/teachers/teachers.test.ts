/* اختبارُ دليل المدرّسين ودفترِ ملاحظاتهم.
   تشغيل: npx tsx --test src/lib/teachers/teachers.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addTeacher, updateTeacher, removeTeacher, addNote, removeNote,
  addTerm, removeTerm, rateTerm, addMoment, removeMoment,
  sortedTeachers, teacherById, notesOf, momentsOf, noteCount, avgRating, termLabel,
  mainSubject, contactKind, contactHref, LIMITS,
  type Teacher,
} from "./teachers";

const AT = 1_700_000_000_000;
const make = (name: string, subject?: string, all: Teacher[] = []): Teacher[] => {
  const r = addTeacher(all, { id: name, name, subjects: subject ? [subject] : [], at: AT });
  assert.ok(r.ok, `فشلت إضافة ${name}`);
  return r.teachers;
};

test("الإضافة تُنظّف الاسم وترفض الفارغ", () => {
  const r = addTeacher([], { id: "a", name: "  أ. محمد  ", subjects: [" رياضيات ", "فيزياء", " رياضيات "], at: AT });
  assert.ok(r.ok);
  assert.equal(r.teachers[0].name, "أ. محمد");
  assert.deepEqual(r.teachers[0].subjects, ["رياضيات", "فيزياء"], "لم يُنظّف أو لم يُزل التكرار");
  assert.deepEqual(r.teachers[0].notes, []);
  assert.deepEqual(r.teachers[0].terms, []);
  assert.deepEqual(r.teachers[0].moments, []);

  const empty = addTeacher([], { id: "b", name: "   ", at: AT });
  assert.ok(!empty.ok); assert.equal(empty.reason, "empty");
});

test("نفسُ الاسم في نفس المادة تكرار — وفي مادّةٍ أخرى مدرّسٌ آخر", () => {
  const one = make("أ. محمد", "رياضيات");
  const dup = addTeacher(one, { id: "x", name: "أ. محمد", subjects: ["رياضيات"], at: AT });
  assert.ok(!dup.ok); assert.equal(dup.reason, "duplicate");

  const other = addTeacher(one, { id: "y", name: "أ. محمد", subjects: ["فيزياء"], at: AT });
  assert.ok(other.ok, "منع مدرّساً مختلفاً يحمل الاسم نفسه");
});

test("الحدُّ الأعلى يوقف الإضافة", () => {
  let all: Teacher[] = [];
  for (let i = 0; i < LIMITS.maxTeachers; i++) all = make(`م${i}`, "مادة", all);
  const over = addTeacher(all, { id: "z", name: "زائد", at: AT });
  assert.ok(!over.ok); assert.equal(over.reason, "full");
});

test("الترتيب بالمادة ثم الاسم — ثابتٌ يجده الطالبُ حيث تركه", () => {
  let all = make("ب", "فيزياء");
  all = make("أ", "فيزياء", all);
  all = make("ج", "رياضيات", all);
  assert.deepEqual(sortedTeachers(all).map((t) => `${mainSubject(t)}/${t.name}`),
    ["رياضيات/ج", "فيزياء/أ", "فيزياء/ب"]);
});

test("التعديل لا يُفرّغ الاسم، ويمسح المادة/التواصل بالنصّ الفارغ", () => {
  const all = make("أ. سارة", "كيمياء");
  const kept = updateTeacher(all, "أ. سارة", { name: "   " });
  assert.equal(kept[0].name, "أ. سارة", "فُرِّغ الاسم");

  const cleared = updateTeacher(all, "أ. سارة", { subjects: ["  "], contacts: [""] });
  assert.deepEqual(cleared[0].subjects, []);
  assert.deepEqual(cleared[0].contacts, []);

  const renamed = updateTeacher(all, "أ. سارة", { name: "أ. سارة العتيبي" });
  assert.equal(renamed[0].name, "أ. سارة العتيبي");
  assert.equal(all[0].name, "أ. سارة", "غيّر الأصل — ليس نقيّاً");
});

test("الملاحظات تتراكم تحت مدرّسها وحده، والأحدثُ أوّلاً", () => {
  let all = make("أ. خالد", "أحياء");
  all = make("أ. نورة", "أحياء", all);
  all = addNote(all, "أ. خالد", { id: "n1", text: "يركّز على الرسوم", at: AT });
  all = addNote(all, "أ. خالد", { id: "n2", text: "وعد باختبارٍ قصير الأحد", at: AT + 1000 });

  const k = teacherById(all, "أ. خالد")!;
  assert.equal(noteCount(k), 2);
  assert.deepEqual(notesOf(k).map((x) => x.id), ["n2", "n1"]);
  assert.equal(noteCount(teacherById(all, "أ. نورة")!), 0, "تسرّبت ملاحظةٌ لمدرّسٍ آخر");
});

test("الملاحظة الفارغة لا تُحفظ، والحدُّ يوقف التراكم", () => {
  let all = make("أ. فهد");
  const before = all;
  all = addNote(all, "أ. فهد", { id: "x", text: "   ", at: AT });
  assert.deepEqual(all, before, "حُفظت ملاحظةٌ فارغة");

  for (let i = 0; i < LIMITS.maxNotesPerTeacher + 5; i++)
    all = addNote(all, "أ. فهد", { id: `n${i}`, text: `ملاحظة ${i}`, at: AT + i });
  assert.equal(noteCount(teacherById(all, "أ. فهد")!), LIMITS.maxNotesPerTeacher);
});

test("الحذف: مدرّسٌ يذهب بملاحظاته، وملاحظةٌ تذهب وحدها", () => {
  let all = make("أ. عمر");
  all = addNote(all, "أ. عمر", { id: "n1", text: "شرحه سريع", at: AT });
  assert.equal(removeNote(all, "أ. عمر", "n1")[0].notes.length, 0);
  assert.equal(removeTeacher(all, "أ. عمر").length, 0);
});

test("contactKind يميّز الجوّال من البريد من غيرهما", () => {
  assert.equal(contactKind("0501234567"), "phone");
  assert.equal(contactKind("+966 50 123 4567"), "phone");
  assert.equal(contactKind("teacher@school.edu.sa"), "email");
  assert.equal(contactKind("@teacher_account"), "other");
  assert.equal(contactKind(""), "other");
  assert.equal(contactKind(undefined), "other");
});

test("contactHref يصنع رابطاً يعمل — أو لا يصنع شيئاً", () => {
  assert.equal(contactHref("0501234567"), "tel:0501234567");
  assert.equal(contactHref("+966 50 123 4567"), "tel:+966501234567");
  assert.equal(contactHref("t@s.com"), "mailto:t@s.com");
  assert.equal(contactHref("@حسابه"), null, "صنع رابطاً لا يعمل");
  assert.equal(contactHref(undefined), null);
});

/* ── الفصول والتقييم ── */

test("الفصلُ يُضاف مرّةً واحدة، ولا فصلَ بلا صفٍّ أو اسمِ فصل", () => {
  let all = make("أ. سعد", "رياضيات");
  all = addTerm(all, "أ. سعد", { id: "t1", grade: "ثالث ثانوي", term: "الفصل الأول" });
  all = addTerm(all, "أ. سعد", { id: "t2", grade: "ثالث ثانوي", term: "الفصل الأول" });
  assert.equal(teacherById(all, "أ. سعد")!.terms.length, 1, "أُضيف الفصلُ نفسُه مرّتين");

  all = addTerm(all, "أ. سعد", { id: "t3", grade: "  ", term: "الفصل الثاني" });
  assert.equal(teacherById(all, "أ. سعد")!.terms.length, 1, "قَبِل صفّاً فارغاً");

  all = addTerm(all, "أ. سعد", { id: "t4", grade: "أول ثانوي", term: "الفصل الثاني" });
  assert.equal(teacherById(all, "أ. سعد")!.terms.length, 2);
  assert.equal(termLabel(teacherById(all, "أ. سعد")!.terms[1]), "أول ثانوي · الفصل الثاني");
});

test("التقييم ١..٥ فقط، وnull يمسحه", () => {
  let all = make("أ. ريم");
  all = addTerm(all, "أ. ريم", { id: "t1", grade: "ثالث ثانوي", term: "الفصل الأول" });

  all = rateTerm(all, "أ. ريم", "t1", 9);
  assert.equal(teacherById(all, "أ. ريم")!.terms[0].rating, undefined, "قَبِل تقييماً خارج المدى");
  all = rateTerm(all, "أ. ريم", "t1", 2.5);
  assert.equal(teacherById(all, "أ. ريم")!.terms[0].rating, undefined, "قَبِل كسراً");

  all = rateTerm(all, "أ. ريم", "t1", 4);
  assert.equal(teacherById(all, "أ. ريم")!.terms[0].rating, 4);
  all = rateTerm(all, "أ. ريم", "t1", null);
  assert.equal(teacherById(all, "أ. ريم")!.terms[0].rating, undefined, "لم يُمسح");
});

test("متوسّطُ التقييم عبر الفصول — وnull قبل أيّ تقييم", () => {
  let all = make("أ. بدر");
  assert.equal(avgRating(teacherById(all, "أ. بدر")!), null);

  all = addTerm(all, "أ. بدر", { id: "t1", grade: "ثاني ثانوي", term: "الفصل الأول" });
  all = addTerm(all, "أ. بدر", { id: "t2", grade: "ثالث ثانوي", term: "الفصل الأول" });
  all = rateTerm(all, "أ. بدر", "t1", 5);
  assert.equal(avgRating(teacherById(all, "أ. بدر")!), 5, "الفصلُ غيرُ المقيَّم أثّر في المتوسّط");

  all = rateTerm(all, "أ. بدر", "t2", 4);
  assert.equal(avgRating(teacherById(all, "أ. بدر")!), 4.5);

  assert.equal(removeTerm(all, "أ. بدر", "t1")[0].terms.length, 1);
});

/* ── المواقف ── */

test("المواقفُ تُسجَّل تحت صاحبها، والأحدثُ أوّلاً، والفارغُ يُرفض", () => {
  let all = make("أ. ماجد");
  all = addMoment(all, "أ. ماجد", { id: "m1", text: "شرح لي بعد الحصة", at: AT });
  all = addMoment(all, "أ. ماجد", { id: "m2", text: "أعطاني ورقة تدريب", at: AT + 100 });
  all = addMoment(all, "أ. ماجد", { id: "m3", text: "   ", at: AT + 200 });

  const t = teacherById(all, "أ. ماجد")!;
  assert.equal(t.moments.length, 2, "حُفظ موقفٌ فارغ");
  assert.deepEqual(momentsOf(t).map((x) => x.id), ["m2", "m1"]);
  assert.equal(removeMoment(all, "أ. ماجد", "m1")[0].moments.length, 1);
});

test("الحدُّ يوقف المواقف كما يوقف الملاحظات", () => {
  let all = make("أ. طلال");
  for (let i = 0; i < LIMITS.maxMoments + 5; i++)
    all = addMoment(all, "أ. طلال", { id: `m${i}`, text: `موقف ${i}`, at: AT + i });
  assert.equal(teacherById(all, "أ. طلال")!.moments.length, LIMITS.maxMoments);
});

test("وسائلُ التواصل متعدّدة بلا تكرارٍ وبحدّ", () => {
  const r = addTeacher([], { id: "a", name: "أ. نايف", contacts: ["0501234567", "n@s.com", "0501234567", "@nayef", "x", "y", "z"], at: AT });
  assert.ok(r.ok);
  const c = r.teachers[0].contacts;
  assert.ok(c.length <= LIMITS.maxContacts, `تجاوز الحدّ: ${c.length}`);
  assert.equal(new Set(c).size, c.length, "فيه تكرار");
  assert.equal(c[0], "0501234567");
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/teachers/teachers.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — نقلْه إلى store.ts`);
  }
});
