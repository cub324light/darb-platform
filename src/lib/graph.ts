/* ─── شبكة التخصص (Knowledge Graph) — لا اتجاه واحد ───
   رؤية المالك: «أي معلومة يستطيع الطالب الدخول إليها من أي مكان، ثم يقوده النظام
   لبقية المعلومات المرتبطة بها». هنا نحوّل عالم التخصص من قوائم منفصلة إلى شبكة:
   تدخل من مادة أو أداة أو شركة أو شهادة أو وظيفة — فترى كل ما يتّصل بها، وتقفز
   لأيّها لتُعيد التمركز حوله. لا اتجاه إجباري: مادة→أداة أو أداة→مادة سيّان.

   الحواف كلها من بيانات موجودة (subjectLinksOf + getMajorWorld)، لا معلومة جديدة
   معزولة: المادة هي المِحور (تربط أداتها بمشروعها ودورها)، والشركة/الشهادة عقدتان
   على مستوى المجال كله (توظّف/تعتمد التخصص جميعه). دالة نقيّة بلا أي IO. */
import { getMajorWorld, subjectLinksOf } from "./majors";

export type NodeKind = "subject" | "tool" | "project" | "company" | "cert" | "role";

export interface GraphNode {
  kind: NodeKind;
  label: string;
}

export interface NeighborGroup {
  kind: NodeKind;
  title: string;
  icon: string;
  nodes: GraphNode[];
}

export interface Neighborhood {
  node: GraphNode;
  groups: NeighborGroup[]; // المجموعات غير الفارغة فقط، بترتيب ثابت
}

/* تسمية/أيقونة كل نوع عقدة — لونٌ بمعنى يُطبَّق في الواجهة */
const KIND_META: Record<NodeKind, { title: string; icon: string }> = {
  subject: { title: "المواد", icon: "📖" },
  tool: { title: "الأدوات والبرامج", icon: "🧰" },
  project: { title: "المشاريع", icon: "🚀" },
  company: { title: "الشركات", icon: "🏢" },
  cert: { title: "الشهادات", icon: "🎓" },
  role: { title: "الوظائف", icon: "🎯" },
};

const CAP = 6; // حدّ أقصى لكل مجموعة — تُبقي الشبكة قابلة للقراءة

/* أدوات مجموعات فريدة مرتّبة الظهور */
function uniq(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    const t = l.trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}
const nodesOf = (kind: NodeKind, labels: string[], exclude?: string): GraphNode[] =>
  uniq(labels).filter((l) => l !== exclude).slice(0, CAP).map((label) => ({ kind, label }));

/* كل عقد التخصص مصنّفة — نقاط الدخول («ادخل من أي مكان») */
export function entryGroups(majorId?: string | null): NeighborGroup[] {
  const world = getMajorWorld(majorId);
  const subs = subjectLinksOf(majorId);
  const raw: Record<NodeKind, string[]> = {
    subject: subs.map((s) => s.subject),
    tool: world.programs.map((p) => p.name),
    project: world.projects,
    company: world.companies,
    cert: world.certs.map((c) => c.name),
    role: world.careerPaths,
  };
  const order: NodeKind[] = ["subject", "tool", "project", "company", "cert", "role"];
  return order
    .map((k) => ({ kind: k, ...KIND_META[k], nodes: nodesOf(k, raw[k]) }))
    .filter((g) => g.nodes.length > 0);
}

/* بناء مجموعة مرتّبة من خرائط النوع→أسماء (تتجاهل النوع الحالي والعقدة نفسها) */
function build(map: Partial<Record<NodeKind, string[]>>, self: GraphNode): NeighborGroup[] {
  const order: NodeKind[] = ["subject", "tool", "project", "company", "cert", "role"];
  const groups: NeighborGroup[] = [];
  for (const k of order) {
    const labels = map[k];
    if (!labels) continue;
    const nodes = nodesOf(k, labels, k === self.kind ? self.label : undefined);
    if (nodes.length) groups.push({ kind: k, ...KIND_META[k], nodes });
  }
  return groups;
}

/* جِوار عقدة: كل ما يتّصل بها داخل التخصص. المادة محور؛ الشركة/الشهادة على مستوى
   المجال. نقيّة وحتمية — نفس المدخل ⇒ نفس المخرج. لا ترمي أبداً (احتياطي عام). */
export function neighbors(majorId: string | null | undefined, node: GraphNode): Neighborhood {
  const world = getMajorWorld(majorId);
  const subs = subjectLinksOf(majorId);
  const companies = world.companies;
  const certs = world.certs.map((c) => c.name);
  const programs = world.programs.map((p) => p.name);
  const projects = world.projects;
  const roles = world.careerPaths;
  const allSubjects = subs.map((s) => s.subject);

  let map: Partial<Record<NodeKind, string[]>> = {};

  switch (node.kind) {
    case "subject": {
      const s = subs.find((x) => x.subject === node.label);
      map = s
        ? { tool: [s.via], project: [s.builds], role: [s.role, ...roles], company: companies, cert: certs, subject: allSubjects }
        : { tool: programs, project: projects, role: roles, company: companies, cert: certs };
      break;
    }
    case "tool": {
      const rows = subs.filter((x) => x.via === node.label);
      map = {
        subject: rows.length ? rows.map((r) => r.subject) : allSubjects,
        project: rows.length ? rows.map((r) => r.builds) : projects,
        role: rows.length ? rows.map((r) => r.role) : roles,
        company: companies, cert: certs,
      };
      break;
    }
    case "project": {
      const rows = subs.filter((x) => x.builds === node.label);
      map = {
        subject: rows.length ? rows.map((r) => r.subject) : allSubjects,
        tool: rows.length ? rows.map((r) => r.via) : programs,
        role: rows.length ? rows.map((r) => r.role) : roles,
        company: companies, cert: certs,
      };
      break;
    }
    case "role": {
      const rows = subs.filter((x) => x.role === node.label);
      map = {
        subject: rows.length ? rows.map((r) => r.subject) : allSubjects,
        tool: rows.length ? rows.map((r) => r.via) : programs,
        project: rows.length ? rows.map((r) => r.builds) : projects,
        company: companies, cert: certs,
      };
      break;
    }
    case "company":
    case "cert": {
      /* عقدة على مستوى المجال — تتّصل بالتخصص كله */
      map = { subject: allSubjects, tool: programs, project: projects, role: roles,
        company: node.kind === "cert" ? companies : undefined,
        cert: node.kind === "company" ? certs : undefined };
      break;
    }
  }

  return { node, groups: build(map, node) };
}
