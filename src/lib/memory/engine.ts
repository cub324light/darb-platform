/* ═══════════════════════════════════════════════════════════════════════
   Memory Engine — المحرّك (منطق نقيّ فوق Store + ساعة)
   حتمي، قابل للاختبار باستقلال (InMemoryStore + ساعة محقونة)، مستقل عن
   الواجهة وعن أي نموذج ذكاء. المُلخّص واجهة قابلة للتوصيل بلا نموذج (v1 حتمي).
   ═══════════════════════════════════════════════════════════════════════ */
import {
  type AnyMemory, type Memory, type MemoryType,
  type RememberInput, type MemorySearchFilter, type MemoryQuery,
  type StudentContext, type Summarizer, type MemoryEvidence,
  type ExplanationStyle, type StudyWindow, type TonePreference,
} from "./types";
import { MEMORY_REGISTRY } from "./registry";
import type { MemoryStore } from "./store";

const DAY_MS = 86_400_000;
const MAX_EVIDENCE = 12;            // سقف الأدلّة لكل ذاكرة
const REINFORCE_K = 0.25;           // معامل تعزيز الثقة
const CONV_COMPRESS_THRESHOLD = 12; // عدد حقائق المحادثة قبل التلخيص

/* مُلخّص حتمي افتراضي — بلا أي نموذج (قابل للاستبدال في المرحلة ٥) */
export class DeterministicSummarizer implements Summarizer {
  summarize(memories: AnyMemory[]): { text: string; count: number } {
    const lines: string[] = [];
    for (const m of memories) {
      const v = m.value as Record<string, unknown>;
      const t = (v.text ?? v.question ?? "") as string;
      if (t) lines.push(`• ${t}`);
    }
    const head = `خلاصة ${memories.length} ملاحظة سابقة من المحادثات:`;
    return { text: [head, ...lines.slice(0, 8)].join("\n"), count: memories.length };
  }
}

/* اضمحلال الثقة — حتميّ (يُحسب عند الاسترجاع، لا يُعدّل التخزين) */
export function decayFactor(ageDays: number, halfLifeDays: number): number {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays === Infinity) return 1;
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

let _uidCounter = 0;
function uid(): string {
  _uidCounter = (_uidCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${_uidCounter.toString(36)}`;
}

export class MemoryEngine {
  private summarizer: Summarizer;

  constructor(
    private store: MemoryStore,
    private clock: () => number = () => Date.now(),
    summarizer?: Summarizer,
  ) {
    this.summarizer = summarizer ?? new DeterministicSummarizer();
  }

  private now(): number { return this.clock(); }

  /* ─────────── الكتابة ─────────── */

  /** يتذكّر معلومة — يتحقّق منها، ويدمجها إن وُجد مفتاحها الطبيعي. */
  remember<T extends MemoryType>(input: RememberInput<T>): Memory<T> {
    const def = MEMORY_REGISTRY[input.type];
    if (!def.validate(input.value)) {
      throw new Error(`Memory value failed validation for type "${input.type}"`);
    }
    const now = this.now();
    const key = input.dedupeKey ?? (def.naturalKey ? def.naturalKey(input.value) : undefined);
    const id = key != null ? `${input.type}:${key}` : `${input.type}:${uid()}`;

    const tags = Array.from(new Set([
      ...(def.deriveTags?.(input.value) ?? []),
      ...(input.tags ?? []),
    ]));

    const existing = this.store.get(id) as Memory<T> | undefined;
    if (existing && existing.status !== "invalidated") {
      // دمج/ترقية بدل تكرار
      const merged = this.mergeRecord(existing, input, tags, now);
      this.store.put(merged);
      return merged;
    }

    const mem: Memory<T> = {
      id,
      type: input.type,
      category: def.category,
      key,
      value: input.value,
      confidence: clamp01(input.confidence ?? def.defaultConfidence),
      importance: clamp01(input.importance ?? def.defaultImportance),
      source: input.source,
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt ?? null,
      educationalStage: input.educationalStage ?? "general",
      tags,
      evidence: (input.evidence ?? []).slice(-MAX_EVIDENCE),
      status: "active",
      version: 1,
    };
    this.store.put(mem);
    return mem;
  }

  /** دمج إدخال جديد في ذاكرة قائمة — تعزيز ثقة + رفع أهمية + قيمة أحدث. */
  private mergeRecord<T extends MemoryType>(
    existing: Memory<T>, input: RememberInput<T>, tags: string[], now: number,
  ): Memory<T> {
    const incomingConf = input.confidence ?? MEMORY_REGISTRY[input.type].defaultConfidence;
    const reinforced = existing.confidence + (1 - existing.confidence) * REINFORCE_K * incomingConf;
    const evidence = [...existing.evidence, ...(input.evidence ?? [])].slice(-MAX_EVIDENCE);
    return {
      ...existing,
      value: input.value,
      confidence: clamp01(Math.max(existing.confidence, reinforced)),
      importance: clamp01(Math.max(existing.importance, input.importance ?? existing.importance)),
      tags: Array.from(new Set([...existing.tags, ...tags])),
      evidence,
      source: input.source,
      educationalStage: input.educationalStage ?? existing.educationalStage,
      expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
      updatedAt: now,
      status: "active",
      version: existing.version + 1,
    };
  }

  /** دمج صريح بين ذاكرتين (نفس النوع/المفتاح) — للحلّ اليدوي للتعارض. */
  mergeMemory(a: AnyMemory, b: AnyMemory): AnyMemory {
    const [older, newer] = a.updatedAt <= b.updatedAt ? [a, b] : [b, a];
    const merged: AnyMemory = {
      ...newer,
      confidence: clamp01(Math.max(a.confidence, b.confidence)),
      importance: clamp01(Math.max(a.importance, b.importance)),
      tags: Array.from(new Set([...a.tags, ...b.tags])),
      evidence: [...older.evidence, ...newer.evidence].slice(-MAX_EVIDENCE),
      createdAt: Math.min(a.createdAt, b.createdAt),
      updatedAt: this.now(),
      version: Math.max(a.version, b.version) + 1,
    };
    this.store.put(merged);
    if (a.id !== merged.id) this.store.delete(a.id);
    if (b.id !== merged.id) this.store.delete(b.id);
    return merged;
  }

  /** تحديث جزئي صريح. */
  updateMemory(id: string, patch: Partial<Pick<AnyMemory, "confidence" | "importance" | "tags" | "expiresAt" | "status">> & { evidence?: MemoryEvidence[] }): AnyMemory | undefined {
    const m = this.store.get(id);
    if (!m) return undefined;
    const next: AnyMemory = {
      ...m,
      confidence: patch.confidence != null ? clamp01(patch.confidence) : m.confidence,
      importance: patch.importance != null ? clamp01(patch.importance) : m.importance,
      tags: patch.tags ?? m.tags,
      expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : m.expiresAt,
      status: patch.status ?? m.status,
      evidence: patch.evidence ? [...m.evidence, ...patch.evidence].slice(-MAX_EVIDENCE) : m.evidence,
      updatedAt: this.now(),
      version: m.version + 1,
    };
    this.store.put(next);
    return next;
  }

  /** نسيان — أرشفة (افتراضي) أو حذف نهائي. */
  forget(id: string, opts?: { hard?: boolean }): void {
    if (opts?.hard) { this.store.delete(id); return; }
    const m = this.store.get(id);
    if (m) this.store.put({ ...m, status: "archived", updatedAt: this.now(), version: m.version + 1 });
  }

  /** إبطال صريح وقابل للشرح (يبقى مؤرشفاً للتاريخ). */
  invalidateMemory(id: string, reason: string): AnyMemory | undefined {
    const m = this.store.get(id);
    if (!m) return undefined;
    const next: AnyMemory = {
      ...m,
      status: "invalidated",
      evidence: [...m.evidence, { kind: "manual" as const, ref: "invalidate", at: this.now(), note: reason }].slice(-MAX_EVIDENCE),
      updatedAt: this.now(),
      version: m.version + 1,
    };
    this.store.put(next);
    return next;
  }

  /* ─────────── القراءة ─────────── */

  private isLive(m: AnyMemory, now: number): boolean {
    return m.status === "active" && (m.expiresAt == null || m.expiresAt > now);
  }

  /** الثقة الفعّالة بعد الاضمحلال (لا تُعدّل التخزين). */
  effectiveConfidence(m: AnyMemory, now: number = this.now()): number {
    const def = MEMORY_REGISTRY[m.type];
    const ageDays = (now - m.updatedAt) / DAY_MS;
    return clamp01(m.confidence * decayFactor(ageDays, def.decayHalfLifeDays));
  }

  /** بحث مهيكل (افتراضياً النشِط فقط). */
  searchMemory(filter: MemorySearchFilter = {}): AnyMemory[] {
    const now = this.now();
    const status = filter.status ?? "active";
    const cats = toArr(filter.category);
    const types = toArr(filter.type);
    const stages = toArr(filter.stage);
    const text = filter.text?.trim().toLowerCase();

    return this.store.getAll().filter((m) => {
      if (status && m.status !== status) return false;
      if (status === "active" && !this.isLive(m, now)) return false;
      if (cats && !cats.includes(m.category)) return false;
      if (types && !types.includes(m.type)) return false;
      if (stages && !stages.includes(m.educationalStage)) return false;
      if (filter.source && m.source !== filter.source) return false;
      if (filter.minImportance != null && m.importance < filter.minImportance) return false;
      if (filter.minConfidence != null && this.effectiveConfidence(m, now) < filter.minConfidence) return false;
      if (filter.tags && !filter.tags.some((t) => m.tags.includes(t))) return false;
      if (text && !JSON.stringify(m.value).toLowerCase().includes(text)) return false;
      return true;
    });
  }

  /** درجة الصلة بسياق — تركيب موزون (أهمية + ثقة فعّالة + حداثة + مطابقة + تثبيت). */
  relevanceScore(m: AnyMemory, q: MemoryQuery, now: number = this.now()): number {
    const def = MEMORY_REGISTRY[m.type];
    const effConf = this.effectiveConfidence(m, now);
    const ageDays = (now - m.updatedAt) / DAY_MS;
    const recency = decayFactor(ageDays, 30); // نصف عمر حداثة ٣٠ يوماً

    // مطابقة السياق
    let match = 0, signals = 0;
    if (q.stage) { signals++; if (m.educationalStage === q.stage || m.educationalStage === "general") match++; }
    if (q.categories?.length) { signals++; if (q.categories.includes(m.category)) match++; }
    if (q.tags?.length) { signals++; if (q.tags.some((t) => m.tags.includes(t))) match++; }
    if (q.goal) { signals++; if (JSON.stringify(m.value).includes(q.goal)) match++; }
    if (q.conversationTopic) { signals++; if (m.tags.includes(q.conversationTopic)) match++; }
    const contextMatch = signals > 0 ? match / signals : 0.5;

    const pinBoost = def.pinned ? 0.3 : 0;
    return (
      m.importance * 0.4 +
      effConf * 0.2 +
      recency * 0.2 +
      contextMatch * 0.2 +
      pinBoost
    );
  }

  /** استرجاع الأكثر صلة — لا يُعيد الذاكرة كاملة أبداً.
      يضمن دائماً «النواة» (المثبَّتة: الهوية والأهداف) فلا ينسى المرشد اسم الطالب. */
  retrieveRelevantMemory(q: MemoryQuery = {}): AnyMemory[] {
    const now = this.now();
    const limit = q.limit ?? 12;
    const live = this.store.getAll().filter((m) => this.isLive(m, now));
    const filtered = live.filter((m) =>
      (q.minImportance == null || m.importance >= q.minImportance) &&
      (!q.categories?.length || q.categories.includes(m.category))
    );

    const scored = filtered
      .map((m) => ({ m, s: this.relevanceScore(m, q, now) }))
      .sort((a, b) => b.s - a.s);

    const core = scored.filter(({ m }) => MEMORY_REGISTRY[m.type].pinned).map((x) => x.m);
    const rest = scored.filter(({ m }) => !MEMORY_REGISTRY[m.type].pinned).map((x) => x.m);

    const out: AnyMemory[] = [];
    const seen = new Set<string>();
    for (const m of [...core, ...rest]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
      if (out.length >= Math.max(limit, core.length)) break;
    }
    return out;
  }

  /* ─────────── السياق المُركّب ─────────── */

  /** يبني سياقاً مُركّباً مضغوطاً يستهلكه محرّك التوصيات ودويرب (لا ذاكرة خام). */
  buildStudentContext(q: MemoryQuery = {}): StudentContext {
    const now = this.now();
    const live = this.store.getAll().filter((m) => this.isLive(m, now));
    const byType = <T extends MemoryType>(t: T): Memory<T>[] =>
      live.filter((m) => m.type === t) as Memory<T>[];
    const bestConf = <T extends MemoryType>(t: T): Memory<T> | undefined =>
      byType(t).sort((a, b) => this.effectiveConfidence(b, now) - this.effectiveConfidence(a, now))[0];

    const name = bestConf("identity.name")?.value.name;
    const studyLevel = bestConf("identity.studyLevel")?.value.level;
    const grade = bestConf("identity.grade")?.value.grade;
    const region = bestConf("identity.region")?.value.region;
    const school = bestConf("identity.school")?.value.school;

    const targets = byType("goal.targetScore").map((m) => ({ exam: m.value.exam, target: m.value.target }));
    const university = bestConf("goal.targetUniversity")?.value.university;
    const major = bestConf("goal.targetMajor")?.value.major;

    const weakSubjects = byType("learning.weakSubject")
      .sort((a, b) => this.effectiveConfidence(b, now) - this.effectiveConfidence(a, now))
      .map((m) => m.value.subject);
    const strongSubjects = byType("learning.strongSubject")
      .sort((a, b) => this.effectiveConfidence(b, now) - this.effectiveConfidence(a, now))
      .map((m) => m.value.subject);
    const preferredStyle = bestConf("learning.explanationStyle")?.value.style as ExplanationStyle | undefined;
    const preferredMethods = byType("learning.method").map((m) => m.value.method);
    const bestStudyWindow = bestConf("behavior.studyWindow")?.value.window as StudyWindow | undefined;
    const tonePreference = bestConf("relationship.tone")?.value.tone as TonePreference | undefined;
    const recentLifeEvents = byType("relationship.lifeEvent")
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map((m) => m.value.text);
    const openThreads = byType("conversation.openThread")
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map((m) => m.value.question);

    return {
      identity: { name, studyLevel, grade, region, school },
      currentGoal: { university, major, targets },
      weakSubjects, strongSubjects,
      preferredStyle, preferredMethods,
      bestStudyWindow, tonePreference,
      recentLifeEvents, openThreads,
      memoryCount: live.length,
      retrieved: this.retrieveRelevantMemory({ ...q, limit: q.limit ?? 14 }),
    };
  }

  /* ─────────── الضغط/الصيانة ─────────── */

  /** حذف المؤرشفة/المُبطَلة القديمة (تتجاوز نافذة الاحتفاظ) — يحدّ نموّ التخزين.
      النشِطة لا تُمسّ. حتميّ. */
  pruneArchived(retentionDays = 60): number {
    const cutoff = this.now() - retentionDays * DAY_MS;
    let n = 0;
    for (const m of this.store.getAll()) {
      if (m.status !== "active" && m.updatedAt < cutoff) { this.store.delete(m.id); n++; }
    }
    return n;
  }

  /** سقف صلب لعدد الذاكرات — حاجز أخير ضد النموّ غير المحدود.
      يُسقِط المؤرشفة أولاً (الأقدم)، ثم النشِطة غير المثبَّتة الأقل أهمية. */
  capTotal(max = 1000): number {
    let over = this.store.getAll().length - max;
    if (over <= 0) return 0;
    let n = 0;
    const archived = this.store.getAll().filter((m) => m.status !== "active").sort((a, b) => a.updatedAt - b.updatedAt);
    for (const m of archived) { if (over <= 0) break; this.store.delete(m.id); over--; n++; }
    if (over > 0) {
      const active = this.store.getAll()
        .filter((m) => m.status === "active" && !MEMORY_REGISTRY[m.type].pinned)
        .sort((a, b) => a.importance - b.importance || a.updatedAt - b.updatedAt);
      for (const m of active) { if (over <= 0) break; this.store.delete(m.id); over--; n++; }
    }
    return n;
  }

  /** صيانة دورية — تُبقي التخزين محدوداً (انتهاء + ضغط + قصّ + سقف). حتميّ. */
  maintain(): { expired: number; compressed: number; pruned: number; capped: number } {
    const expired = this.sweepExpired();
    const { compressed } = this.compressMemory();
    const pruned = this.pruneArchived();
    const capped = this.capTotal();
    return { expired, compressed, pruned, capped };
  }

  /** أرشفة المنتهية صلاحيتها (تُستدعى دورياً). */
  sweepExpired(): number {
    const now = this.now();
    let n = 0;
    for (const m of this.store.getAll()) {
      if (m.status === "active" && m.expiresAt != null && m.expiresAt <= now) {
        this.store.put({ ...m, status: "archived", updatedAt: now, version: m.version + 1 });
        n++;
      }
    }
    return n;
  }

  /** يلخّص مجموعة ذاكرات إلى ذاكرة summary واحدة (لا يحفظ — للاستخدام المركّب). */
  summarizeMemory(memories: AnyMemory[]): { text: string; count: number } {
    return this.summarizer.summarize(memories);
  }

  /** ضغط حقائق المحادثة المتراكمة إلى خلاصة، وأرشفة الأصول.
      المثبَّتة وعالية الأهمية لا تُضغط أبداً. */
  compressMemory(): { compressed: number } {
    const now = this.now();
    const facts = this.store.getAll().filter(
      (m) => m.status === "active" && m.type === "conversation.salientFact"
    );
    if (facts.length <= CONV_COMPRESS_THRESHOLD) return { compressed: 0 };

    // اضغط الأقدم، أبقِ الأحدث
    const sorted = facts.sort((a, b) => a.updatedAt - b.updatedAt);
    const toCompress = sorted.slice(0, facts.length - Math.floor(CONV_COMPRESS_THRESHOLD / 2));
    if (toCompress.length === 0) return { compressed: 0 };

    const { text, count } = this.summarizer.summarize(toCompress);
    this.remember({
      type: "conversation.summary",
      value: { text, count },
      source: "inferred",
      importance: 0.55,
      evidence: [{ kind: "rollup", ref: `compress:${count}`, at: now, note: `ضغط ${count} حقيقة` }],
    });
    for (const m of toCompress) {
      this.store.put({ ...m, status: "archived", updatedAt: now, version: m.version + 1 });
    }
    return { compressed: toCompress.length };
  }

  /* ─────────── أدوات ─────────── */
  all(): AnyMemory[] { return this.store.getAll(); }
  clearAll(): void { this.store.clear(); }
}

/* مساعدات */
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function toArr<T>(v: T | T[] | undefined): T[] | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v : [v];
}
