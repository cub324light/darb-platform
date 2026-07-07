/* اختبارات «شبكة التخصص» — تشغيل: npx tsx --test src/lib/graph.test.ts
   حتمية بلا IO. نتحقق: الدخول من أي عقدة يعطي جِواراً غير فارغ، والتنقّل ثنائي
   الاتجاه (مادة↔أداة)، والعقدة لا تُدرِج نفسها، والعزل محفوظ، والحدّ الأعلى مطبّق. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAJORS } from "./university";
import { getMajorWorld } from "./majors";
import { neighbors, entryGroups, type GraphNode, type NeighborGroup } from "./graph";

/* أداة: كل تسميات مجموعة نوع معيّن */
function groupLabels(groups: NeighborGroup[], kind: string): string[] {
  return groups.find((g) => g.kind === kind)?.nodes.map((n) => n.label) ?? [];
}
function allLabels(groups: NeighborGroup[]): string[] {
  return groups.flatMap((g) => g.nodes.map((n) => n.label));
}

/* ════════ الدخول من مادة ════════ */
test("الدخول من مادة (ee/أنظمة القوى) يصل لأداتها ومشروعها ودورها والمجال", () => {
  const nb = neighbors("ee", { kind: "subject", label: "أنظمة القوى" });
  assert.match(groupLabels(nb.groups, "tool").join(" "), /ETAP/);
  assert.match(groupLabels(nb.groups, "project").join(" "), /شبكة توزيع/);
  assert.match(groupLabels(nb.groups, "role").join(" "), /مهندس قوى/);
  assert.ok(groupLabels(nb.groups, "company").length > 0, "بلا شركات");
  assert.ok(groupLabels(nb.groups, "cert").length > 0, "بلا شهادات");
  /* لا تُدرِج المادة نفسها في مجموعة المواد (الأخوات فقط) */
  assert.ok(!groupLabels(nb.groups, "subject").includes("أنظمة القوى"), "أدرجت العقدة نفسها");
});

/* ════════ التنقّل ثنائي الاتجاه ════════ */
test("مادة↔أداة: من ETAP نعود لأنظمة القوى (لا اتجاه واحد)", () => {
  const fromTool = neighbors("ee", { kind: "tool", label: "ETAP" });
  assert.match(groupLabels(fromTool.groups, "subject").join(" "), /أنظمة القوى/);
  assert.match(groupLabels(fromTool.groups, "role").join(" "), /مهندس قوى/);
  assert.match(groupLabels(fromTool.groups, "project").join(" "), /شبكة توزيع/);
});

test("مشروع→مادة/أداة/دور", () => {
  const nb = neighbors("ee", { kind: "project", label: "تصميم شبكة توزيع كهربائي" });
  assert.match(groupLabels(nb.groups, "subject").join(" "), /أنظمة القوى/);
  assert.match(groupLabels(nb.groups, "tool").join(" "), /ETAP/);
});

test("وظيفة→المواد التي تقود إليها وأدواتها", () => {
  const nb = neighbors("ee", { kind: "role", label: "مهندس قوى" });
  assert.match(groupLabels(nb.groups, "subject").join(" "), /أنظمة القوى/);
  assert.match(groupLabels(nb.groups, "tool").join(" "), /ETAP/);
});

/* ════════ عقدة على مستوى المجال ════════ */
test("الدخول من شركة يصل للتخصص كله (مواد/أدوات/مشاريع/شهادات/وظائف)", () => {
  const co = getMajorWorld("ee").companies[0];
  const nb = neighbors("ee", { kind: "company", label: co });
  for (const kind of ["subject", "tool", "project", "cert", "role"]) {
    assert.ok(groupLabels(nb.groups, kind).length > 0, `شركة بلا ${kind}`);
  }
  assert.ok(!allLabels(nb.groups).includes(co), "الشركة أدرجت نفسها");
});

test("الدخول من شهادة يصل للتخصص كله بلا إدراج ذاتها", () => {
  const cert = getMajorWorld("ee").certs[0].name;
  const nb = neighbors("ee", { kind: "cert", label: cert });
  assert.ok(groupLabels(nb.groups, "subject").length > 0);
  assert.ok(groupLabels(nb.groups, "company").length > 0);
  assert.ok(!groupLabels(nb.groups, "cert").includes(cert), "الشهادة أدرجت نفسها");
});

/* ════════ العزل محفوظ ════════ */
test("عزل: جِوار أداة كهرباء لا يسرّب أدوات أمن سيبراني", () => {
  const txt = allLabels(neighbors("ee", { kind: "tool", label: "ETAP" }).groups).join(" ").toLowerCase();
  for (const t of ["wireshark", "metasploit", "burp", "kali"]) {
    assert.ok(!txt.includes(t), `تسرّبت ${t} لجِوار الكهرباء`);
  }
});

/* ════════ نقاط الدخول ════════ */
test("entryGroups: كل تخصص يفتح من ٦ أنواع عقد، كلها غير فارغة ومحدودة", () => {
  const g = entryGroups("ee");
  const kinds = g.map((x) => x.kind);
  for (const k of ["subject", "tool", "project", "company", "cert", "role"]) {
    assert.ok(kinds.includes(k as NodeKind_), `نوع دخول غائب: ${k}`);
  }
  for (const grp of g) {
    assert.ok(grp.nodes.length > 0 && grp.nodes.length <= 6, `${grp.kind}: حجم غير صالح`);
    for (const n of grp.nodes) assert.ok(n.label.trim() !== "", "عقدة فارغة");
  }
});

/* ════════ سلامة عامة + احتياطي ════════ */
type NodeKind_ = GraphNode["kind"];

test("كل تخصص: الدخول من أول مادة يعطي جِواراً غير فارغ", () => {
  for (const m of MAJORS) {
    if (m.id === "other") continue;
    const first = entryGroups(m.id).find((g) => g.kind === "subject")!.nodes[0];
    const nb = neighbors(m.id, first);
    assert.ok(nb.groups.length >= 3, `${m.id}: جِوار ضعيف`);
    assert.ok(nb.groups.every((g) => g.nodes.every((n) => n.label.trim() !== "")), `${m.id}: عقدة فارغة`);
  }
});

test("احتياطي: تخصص مجهول لا يرمي ويعطي شبكة حيّة", () => {
  const nb = neighbors(null, { kind: "subject", label: "مواد تخصصك الأساسية" });
  assert.ok(nb.groups.length > 0);
  assert.ok(allLabels(nb.groups).every((l) => l.trim() !== ""));
});

test("لا مجموعة تتجاوز الحدّ الأعلى (٦)", () => {
  const co = getMajorWorld("cs").companies[0];
  for (const nb of [
    neighbors("cs", { kind: "company", label: co }),
    neighbors("cs", { kind: "subject", label: entryGroups("cs")[0].nodes[0].label }),
  ]) {
    for (const g of nb.groups) assert.ok(g.nodes.length <= 6, `${g.kind} تجاوز الحدّ`);
  }
});
