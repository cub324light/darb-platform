/* اختبارُ دليل المدرّسين ودفترِ ملاحظاتهم.
   تشغيل: npx tsx --test src/lib/teachers/teachers.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addTeacher, updateTeacher, removeTeacher, addNote, removeNote,
  sortedTeachers, teacherById, notesOf, noteCount, contactKind, contactHref, LIMITS,
  type Teacher,
} from "./teachers";

const AT = 1_700_000_000_000;
const make = (name: string, subject?: string, all: Teacher[] = []): Teacher[] => {
  const r = addTeacher(all, { id: name, name, subject, at: AT });
  assert.ok(r.ok, `فشلت إضافة ${name}`);
  return r.teachers;
};

test("الإضافة تُنظّف الاسم وترفض الفارغ", () => {
  const r = addTeacher([], { id: "a", name: "  أ. محمد  ", subject: " رياضيات ", at: AT });
  assert.ok(r.ok);
  assert.equal(r.teachers[0].name, "أ. محمد");
  assert.equal(r.teachers[0].subject, "رياضيات");
  assert.deepEqual(r.teachers[0].notes, []);

  const empty = addTeacher([], { id: "b", name: "   ", at: AT });
  assert.ok(!empty.ok); assert.equal(empty.reason, "empty");
});

test("نفسُ الاسم في نفس المادة تكرار — وفي مادّةٍ أخرى مدرّسٌ آخر", () => {
  const one = make("أ. محمد", "رياضيات");
  const dup = addTeacher(one, { id: "x", name: "أ. محمد", subject: "رياضيات", at: AT });
  assert.ok(!dup.ok); assert.equal(dup.reason, "duplicate");

  const other = addTeacher(one, { id: "y", name: "أ. محمد", subject: "فيزياء", at: AT });
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
  assert.deepEqual(sortedTeachers(all).map((t) => `${t.subject}/${t.name}`),
    ["رياضيات/ج", "فيزياء/أ", "فيزياء/ب"]);
});

test("التعديل لا يُفرّغ الاسم، ويمسح المادة/التواصل بالنصّ الفارغ", () => {
  const all = make("أ. سارة", "كيمياء");
  const kept = updateTeacher(all, "أ. سارة", { name: "   " });
  assert.equal(kept[0].name, "أ. سارة", "فُرِّغ الاسم");

  const cleared = updateTeacher(all, "أ. سارة", { subject: "  ", contact: "" });
  assert.equal(cleared[0].subject, undefined);
  assert.equal(cleared[0].contact, undefined);

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

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/teachers/teachers.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — نقلْه إلى store.ts`);
  }
});
