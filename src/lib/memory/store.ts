/* ═══════════════════════════════════════════════════════════════════════
   Memory Store — طبقة التخزين (واجهة قابلة للتبديل)
   CRUD فقط بلا منطق. المحرّك يعمل فوق هذه الواجهة، فيمكن استبدال التخزين
   (محلي → بعيد على الخادم) عند التوسّع لملايين المستخدمين دون لمس المحرّك.
   ═══════════════════════════════════════════════════════════════════════ */
import type { AnyMemory } from "./types";
import { nsKey } from "../engineNamespace";

export interface MemoryStore {
  getAll(): AnyMemory[];
  get(id: string): AnyMemory | undefined;
  put(m: AnyMemory): void;
  putMany(ms: AnyMemory[]): void;
  delete(id: string): void;
  clear(): void;
}

/* ── مخزن في الذاكرة — للاختبارات (نقيّ، حتمي، بلا تخزين) ── */
export class InMemoryStore implements MemoryStore {
  private map = new Map<string, AnyMemory>();
  constructor(seed?: AnyMemory[]) { if (seed) for (const m of seed) this.map.set(m.id, m); }
  getAll(): AnyMemory[] { return [...this.map.values()]; }
  get(id: string): AnyMemory | undefined { return this.map.get(id); }
  put(m: AnyMemory): void { this.map.set(m.id, m); }
  putMany(ms: AnyMemory[]): void { for (const m of ms) this.map.set(m.id, m); }
  delete(id: string): void { this.map.delete(id); }
  clear(): void { this.map.clear(); }
}

/* ── مخزن محلي — localStorage بغلاف مُصدَّر للنسخة (مع مزامنة سحابية) ──
   مفتاح واحد يحمل كل الذاكرة في مغلّف مُصدَّر للترقية المستقبلية.
   write-through: كل تعديل يُحفظ فوراً، فتبقى دلالات القراءة متزامنة (sync). */
export const MEMORY_STORAGE_KEY = "darb_memory_v1";
const ENVELOPE_VERSION = 1;

interface MemoryEnvelope { v: number; memories: AnyMemory[]; }

export class LocalStore implements MemoryStore {
  private map = new Map<string, AnyMemory>();
  private loaded = false;
  /* المفتاح يُنطَّق بفضاء المستخدم عند الإنشاء (المثيل يُعاد بناؤه عند تبديل الحساب) */
  private readonly key = nsKey(MEMORY_STORAGE_KEY);

  private ensure(): void {
    if (this.loaded || typeof window === "undefined") { this.loaded = true; return; }
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const env = JSON.parse(raw) as MemoryEnvelope;
        if (env && Array.isArray(env.memories)) {
          for (const m of env.memories) this.map.set(m.id, m);
        }
      }
    } catch { /* تجاهل التلف */ }
    this.loaded = true;
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    /* عند امتلاء الحصّة: نُخلي ذاكرات (المؤرشفة أولاً، ثم الأقل أهمية) ونعيد المحاولة
       بدل الفقد الصامت للكتابة. حدّ محاولات يمنع الحلقة اللانهائية. */
    for (let attempt = 0; attempt < 200; attempt++) {
      try {
        const env: MemoryEnvelope = { v: ENVELOPE_VERSION, memories: [...this.map.values()] };
        localStorage.setItem(this.key, JSON.stringify(env));
        return;
      } catch {
        if (!this.evictOne()) return; // لا شيء لإخلائه — نتوقّف بهدوء
      }
    }
  }

  /* إخلاء ذاكرة واحدة عند ضغط الحصّة (آلي، حسب الحالة/الأهمية/القِدَم). */
  private evictOne(): boolean {
    const all = [...this.map.values()];
    const archived = all.filter((m) => m.status !== "active").sort((a, b) => a.updatedAt - b.updatedAt);
    const victim = archived[0]
      ?? all.filter((m) => m.status === "active").sort((a, b) => a.importance - b.importance || a.updatedAt - b.updatedAt)[0];
    if (!victim) return false;
    this.map.delete(victim.id);
    return true;
  }

  getAll(): AnyMemory[] { this.ensure(); return [...this.map.values()]; }
  get(id: string): AnyMemory | undefined { this.ensure(); return this.map.get(id); }
  put(m: AnyMemory): void { this.ensure(); this.map.set(m.id, m); this.persist(); }
  putMany(ms: AnyMemory[]): void { this.ensure(); for (const m of ms) this.map.set(m.id, m); this.persist(); }
  delete(id: string): void { this.ensure(); this.map.delete(id); this.persist(); }
  clear(): void { this.ensure(); this.map.clear(); this.persist(); }
}
