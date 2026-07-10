/* ═══════════ قاعدة المعرفة — السجل والوصول (Registry) ═══════════
   يبني الرسم من الكيانات: فهرسٌ بالمعرّف + فهرسٌ عكسي للحواف (فيُجتاز الرسم من أي
   عقدة في الاتجاهين). يوفّر: جلب، بحث، جِوار، تحقّق سلامة، و«حقائق» نصّية لدويرب
   (describe/groundingFor) — فأي بيانات تُضاف اليوم يجيب عنها دويرب لاحقاً بلا هيكلة.
   نقيّ تماماً (لا IO). يعيد استخدام تطبيع البحث العربي من طبقة الاسترجاع القائمة. */
import { normalizeAr } from "../retrieval";
import {
  KIND_META, type EntityKind, type EntityId, type KBEntity,
  type Relation, type RelationType,
} from "./schema";

/* حافّة محلولة: النوع + الاتجاه + الكيان الآخر */
export interface ResolvedEdge {
  type: RelationType;
  dir: "out" | "in";        // out: هذا الكيان مصدر الحافّة · in: هدفها
  entity: KBEntity;
  note?: string;
}

/* عبارة العلاقة حسب الاتجاه — لصياغة حقائق طبيعية */
const PHRASE: Record<RelationType, { out: string; in: string }> = {
  part_of:      { out: "جزء من", in: "يضمّ" },
  offers:       { out: "يطرح", in: "يُطرَح في" },
  leads_to:     { out: "يقود إلى", in: "يُوصَل إليه من" },
  requires:     { out: "يتطلّب", in: "مطلوب لـ" },
  teaches:      { out: "يُكسِب", in: "يُكتسَب في" },
  employs:      { out: "يوظّف على", in: "توظّفه" },
  hires_from:   { out: "يوظّف من", in: "توظّف خرّيجيه" },
  prepares_for: { out: "يهيّئ لـ", in: "يُهيّأ له بـ" },
  related_to:   { out: "مرتبط بـ", in: "مرتبط بـ" },
};

export class KnowledgeBase {
  private byId = new Map<EntityId, KBEntity>();
  private outEdges = new Map<EntityId, Relation[]>();
  private inEdges = new Map<EntityId, { from: EntityId; rel: Relation }[]>();

  constructor(entities: KBEntity[]) {
    for (const e of entities) this.byId.set(e.id, e);
    for (const e of entities) {
      const rels = e.relations ?? [];
      this.outEdges.set(e.id, rels);
      for (const r of rels) {
        const arr = this.inEdges.get(r.to) ?? [];
        arr.push({ from: e.id, rel: r });
        this.inEdges.set(r.to, arr);
      }
    }
  }

  get(id: EntityId): KBEntity | undefined { return this.byId.get(id); }
  all(kind?: EntityKind): KBEntity[] {
    const list = [...this.byId.values()];
    return kind ? list.filter((e) => e.kind === kind) : list;
  }
  count(): number { return this.byId.size; }

  /* كل جِوار عقدة (خارج + داخل)، محلولاً لكيانات فعلية */
  edges(id: EntityId): ResolvedEdge[] {
    const out: ResolvedEdge[] = [];
    for (const r of this.outEdges.get(id) ?? []) {
      const entity = this.byId.get(r.to);
      if (entity) out.push({ type: r.type, dir: "out", entity, note: r.note });
    }
    for (const { from, rel } of this.inEdges.get(id) ?? []) {
      const entity = this.byId.get(from);
      if (entity) out.push({ type: rel.type, dir: "in", entity, note: rel.note });
    }
    return out;
  }

  /* جِوارٌ مُصفّى بنوع علاقة/اتجاه — للاجتياز البرمجي */
  neighbors(id: EntityId, opts?: { type?: RelationType; dir?: "out" | "in"; kind?: EntityKind }): KBEntity[] {
    return this.edges(id)
      .filter((e) => (!opts?.type || e.type === opts.type) && (!opts?.dir || e.dir === opts.dir) && (!opts?.kind || e.entity.kind === opts.kind))
      .map((e) => e.entity);
  }

  /* بحثٌ عربيّ بسيط: الاسم/البدائل/الوسوم/الملخّص (يستهلكه دويرب لتحديد الكيان) */
  search(query: string, limit = 8): KBEntity[] {
    const q = normalizeAr(query.trim());
    if (!q) return [];
    const scored = this.all().map((e) => {
      const hay = [e.name, e.nameEn ?? "", ...(e.aliases ?? []), ...(e.tags ?? []), e.summary].map(normalizeAr);
      let score = 0;
      for (const h of hay) {
        if (!h) continue;
        if (h === q) score += 100;
        else if (h.includes(q) || q.includes(h)) score += 40;
      }
      return { e, score };
    }).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));
    return scored.slice(0, limit).map((x) => x.e);
  }

  /* «حقائق» كيان نصّياً — كما يقرؤه دويرب/الوكلاء */
  describe(id: EntityId): string {
    const e = this.byId.get(id);
    if (!e) return "";
    const lines: string[] = [`# ${KIND_META[e.kind].icon} ${e.name} (${KIND_META[e.kind].label})`, e.summary];
    if (e.description) lines.push(e.description);

    /* حقول قياسية حسب النوع */
    const f: string[] = [];
    switch (e.kind) {
      case "job":
        if (e.tasks?.length) f.push(`المهام: ${e.tasks.join("، ")}`);
        if (e.salary) f.push(`الراتب: ${e.salary.entrySar}${e.salary.seniorSar ? ` — ${e.salary.seniorSar} بالخبرة` : ""}`);
        if (e.demand) f.push(`الطلب في السوق: ${e.demand === "high" ? "مرتفع" : e.demand === "medium" ? "متوسط" : "منخفض"}`);
        if (e.learnPath?.length) f.push(`للوصول إليها تتعلّم: ${e.learnPath.join("، ")}`);
        break;
      case "major":
        if (e.category) f.push(`الفئة: ${e.category}`);
        if (e.degreeYears) f.push(`مدة الدرجة: ${e.degreeYears} سنوات`);
        if (e.coreSubjects?.length) f.push(`موادّه الأساسية: ${e.coreSubjects.join("، ")}`);
        break;
      case "university":
        if (e.city) f.push(`المدينة: ${e.city}`);
        if (e.type) f.push(`النوع: ${e.type === "government" ? "حكومية" : "خاصة"}`);
        if (e.founded) f.push(`التأسيس: ${e.founded}`);
        for (const s of e.stats ?? []) f.push(`${s.label}: ${s.value}`);
        break;
      case "exam":
        if (e.provider) f.push(`الجهة: ${e.provider}`);
        if (e.sections?.length) f.push(`الأقسام: ${e.sections.map((s) => s.name).join("، ")}`);
        if (e.levels?.length) f.push(`المستويات: ${e.levels.join("، ")}`);
        if (e.scoreScale) f.push(`سلّم الدرجات: ${e.scoreScale}`);
        for (const t of e.tips ?? []) f.push(`نصيحة: ${t}`);
        break;
      case "certification":
        if (e.provider) f.push(`الجهة المانحة: ${e.provider}`);
        if (e.level) f.push(`المستوى: ${e.level}`);
        if (e.costNote) f.push(`التكلفة: ${e.costNote}`);
        break;
      case "company":
        if (e.sector) f.push(`القطاع: ${e.sector}`);
        if (e.locations?.length) f.push(`المواقع: ${e.locations.join("، ")}`);
        break;
      case "career_path":
        if (e.stages?.length) f.push(`المراحل: ${e.stages.join(" ← ")}`);
        break;
      case "skill":
        if (e.category) f.push(`النوع: ${e.category}`);
        break;
    }
    if (f.length) lines.push(...f);

    /* الروابط في الرسم — مجموعة بعبارتها الطبيعية */
    const groups = new Map<string, string[]>();
    for (const edge of this.edges(id)) {
      const phrase = PHRASE[edge.type][edge.dir];
      const arr = groups.get(phrase) ?? [];
      arr.push(edge.entity.name);
      groups.set(phrase, arr);
    }
    for (const [phrase, items] of groups) lines.push(`${phrase}: ${[...new Set(items)].join("، ")}`);

    return lines.join("\n");
  }

  /* كتلة إسناد لدويرب/الوكلاء عن استعلام: أفضل الكيانات محلولةً حقائقَ */
  groundingFor(query: string, limit = 3): string {
    const hits = this.search(query, limit);
    if (!hits.length) return "";
    return hits.map((e) => this.describe(e.id)).join("\n\n");
  }

  /* تحقّق السلامة — يُشغَّل في الاختبار (وأداة التصفّح) */
  validate(): string[] {
    const errors: string[] = [];
    const seen = new Set<EntityId>();
    for (const e of this.byId.values()) {
      if (seen.has(e.id)) errors.push(`معرّف مكرّر: ${e.id}`);
      seen.add(e.id);
      if (!e.id.startsWith(`${e.kind}:`)) errors.push(`معرّف لا يطابق نوعه: ${e.id}`);
      if (!e.name?.trim()) errors.push(`${e.id}: بلا اسم`);
      if (!e.summary?.trim()) errors.push(`${e.id}: بلا ملخّص`);
      for (const r of e.relations ?? []) {
        if (!this.byId.has(r.to)) errors.push(`${e.id}: حافّة معلّقة → ${r.to}`);
        if (r.to === e.id) errors.push(`${e.id}: حافّة إلى نفسه`);
      }
    }
    return errors;
  }
}
