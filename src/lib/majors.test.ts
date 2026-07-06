/* اختبارات «عالم كل تخصص دقيق» — تشغيل: npx tsx --test src/lib/majors.test.ts
   نتحقق: تغطية كل معرّفات MAJORS (عدا «other»)، سلامة كل عالم، أمان الاحتياطي،
   والعزل الحاسم بين التخصصات (كهرباء ↔ أمن سيبراني). كلها حتمية بلا أي IO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAJORS } from "./university";
import type { MajorWorld } from "./majors";
import { MAJOR_WORLDS, getMajorWorld, hasMajorWorld } from "./majors";

/* يجمع كل النصوص القابلة للبحث في عالم — لاختبار العزل بلا افتراض عن مكان الأداة */
function worldText(w: MajorWorld): string {
  const parts: string[] = [];
  for (const p of w.programs) { parts.push(p.name); if (p.note) parts.push(p.note); }
  for (const c of w.certs) { parts.push(c.name); if (c.note) parts.push(c.note); }
  parts.push(...w.companies, ...w.projects, ...w.careerPaths);
  for (const b of w.books ?? []) { parts.push(b.name); if (b.note) parts.push(b.note); }
  for (const a of w.aiTools) { parts.push(a.name); if (a.note) parts.push(a.note); }
  if (w.salary) { parts.push(w.salary.entrySar); if (w.salary.note) parts.push(w.salary.note); }
  return parts.join(" | ").toLowerCase();
}

/* ════════ سلامة القائمة ════════ */
test("معرّفات العوالم فريدة وكلها تنتمي لـ MAJORS (لا معرّف غريب)", () => {
  const ids = MAJOR_WORLDS.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف عالم مكرر");
  const validMajorIds = new Set(MAJORS.map((m) => m.id));
  for (const id of ids) {
    assert.ok(validMajorIds.has(id), `معرّف عالم لا يوجد في MAJORS: ${id}`);
    assert.notEqual(id, "other", "«other» يجب أن يبقى احتياطياً لا عالماً مُعرَّفاً");
  }
});

/* ════════ التغطية الكاملة للتخصصات الـ19 ════════ */
test("كل معرّف في MAJORS (عدا «other») له عالم دقيق", () => {
  for (const m of MAJORS) {
    if (m.id === "other") continue;
    assert.ok(hasMajorWorld(m.id), `تخصص بلا عالم: ${m.id}`);
  }
});

/* ════════ سلامة كل عالم ════════ */
test("كل عالم: programs/certs/companies/projects/careerPaths/aiTools غير فارغة", () => {
  for (const w of MAJOR_WORLDS) {
    assert.ok(w.programs.length > 0, `${w.id}: programs فارغة`);
    assert.ok(w.certs.length > 0, `${w.id}: certs فارغة`);
    assert.ok(w.companies.length > 0, `${w.id}: companies فارغة`);
    assert.ok(w.projects.length > 0, `${w.id}: projects فارغة`);
    assert.ok(w.careerPaths.length > 0, `${w.id}: careerPaths فارغة`);
    assert.ok(w.aiTools.length > 0, `${w.id}: aiTools فارغة`);
  }
});

test("كل عناصر العالم نصوصها غير فارغة (أسماء البرامج/الشهادات/الجهات/المسارات)", () => {
  for (const w of MAJOR_WORLDS) {
    for (const p of w.programs) assert.ok(p.name.trim() !== "", `${w.id}: برنامج بلا اسم`);
    for (const c of w.certs) assert.ok(c.name.trim() !== "", `${w.id}: شهادة بلا اسم`);
    for (const s of w.companies) assert.ok(s.trim() !== "", `${w.id}: جهة فارغة`);
    for (const s of w.projects) assert.ok(s.trim() !== "", `${w.id}: مشروع فارغ`);
    for (const s of w.careerPaths) assert.ok(s.trim() !== "", `${w.id}: مسار فارغ`);
    for (const a of w.aiTools) assert.ok(a.name.trim() !== "", `${w.id}: أداة AI بلا اسم`);
    for (const b of w.books ?? []) assert.ok(b.name.trim() !== "", `${w.id}: مرجع بلا اسم`);
    if (w.salary) assert.ok(w.salary.entrySar.trim() !== "", `${w.id}: راتب بلا مدى`);
  }
});

/* ════════ الاحتياطي: «other» وأي مجهول ════════ */
test("getMajorWorld(«other») والمجهول يعيدان احتياطياً غير فارغ بلا رمي", () => {
  for (const id of ["other", "مجهول-غير-موجود", "", null, undefined]) {
    const w = getMajorWorld(id as string | null | undefined);
    assert.ok(w.programs.length > 0 && w.certs.length > 0, `احتياطي فارغ لـ ${id}`);
    assert.ok(w.companies.length > 0 && w.careerPaths.length > 0 && w.aiTools.length > 0);
    assert.equal(w.id, "other", "الاحتياطي معرّفه other");
  }
  assert.equal(hasMajorWorld("other"), false, "other ليس عالماً دقيقاً");
  assert.equal(hasMajorWorld("مجهول"), false);
  assert.equal(hasMajorWorld(null), false);
});

test("getMajorWorld يعيد العالم الدقيق نفسه عند معرّف معروف", () => {
  assert.equal(getMajorWorld("ee").id, "ee");
  assert.equal(getMajorWorld("cybersec").id, "cybersec");
  assert.equal(getMajorWorld("accounting").id, "accounting");
});

/* ════════ اختبار العزل الحاسم ════════ */
test("عزل ee ↔ cybersec: كهرباء لا تحوي أدوات أمن، وأمن لا يحوي أدوات كهرباء", () => {
  const eeText = worldText(getMajorWorld("ee"));
  for (const term of ["wireshark", "metasploit", "burp", "nmap", "kali", "nessus"]) {
    assert.ok(!eeText.includes(term), `ee تسرّبت له أداة أمن سيبراني: ${term}`);
  }
  const cyText = worldText(getMajorWorld("cybersec"));
  for (const term of ["etap", "autocad electrical", "proteus", "plc", "simulink"]) {
    assert.ok(!cyText.includes(term), `cybersec تسرّبت له أداة كهرباء: ${term}`);
  }
});

test("كل عالم يحوي أدواته المميّزة (تأكيد الهوية لا العزل فقط)", () => {
  assert.ok(worldText(getMajorWorld("ee")).includes("etap"), "ee بلا ETAP");
  assert.ok(worldText(getMajorWorld("cybersec")).includes("wireshark"), "cybersec بلا Wireshark");
  assert.ok(worldText(getMajorWorld("accounting")).includes("socpa"), "accounting بلا SOCPA");
});
