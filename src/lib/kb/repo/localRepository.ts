/* ─── مستودع محتوى محلي (offline) — Adapter ───
   يحقّق ContentRepository فوق تخزينٍ بسيط (localStorage افتراضاً، أو أي KV للاختبار).
   البذرة (الكود في Git) هي الأساس المنشور، وطبقةُ overlay محلية تحمل تعديلات الأدمن.
   يُستعمل حين لا يتوفّر Firestore (تطوير/دون اتصال) — الواجهة نفسها لا تتغيّر. */
import { KB } from "../entities";
import type { KBEntity } from "../entities/schema";
import {
  type ContentRepository, type ContentRecord, type ContentQuery, type ContentStatus,
  matchesQuery, toRecord,
} from "./repository";

/* تخزينٌ نصّي بسيط — قابلٌ للحقن (اختبارٌ بذاكرةٍ بدل localStorage) */
export interface KV { read(): string | null; write(v: string): void; }
const OVERLAY_KEY = "darb_content_overlay";
const lsKV = (): KV => ({
  read: () => (typeof localStorage !== "undefined" ? localStorage.getItem(OVERLAY_KEY) : null),
  write: (v) => { if (typeof localStorage !== "undefined") localStorage.setItem(OVERLAY_KEY, v); },
});

type Tombstone = { _deleted: true };
type Overlay = Record<string, ContentRecord | Tombstone>;
const isTomb = (v: ContentRecord | Tombstone): v is Tombstone => "_deleted" in v;
const today = () => new Date().toISOString().slice(0, 10);

export class LocalContentRepository implements ContentRepository {
  readonly backend = "محلي (offline)";
  constructor(private kv: KV = lsKV()) {}

  private load(): Overlay { try { return JSON.parse(this.kv.read() ?? "{}") as Overlay; } catch { return {}; } }
  private persist(o: Overlay) { this.kv.write(JSON.stringify(o)); }

  /* الأساس المنشور: كل كيانات البذرة/الكود */
  private merged(): Map<string, ContentRecord> {
    const m = new Map<string, ContentRecord>();
    for (const e of KB.all()) m.set(e.id, toRecord(e));
    for (const [id, val] of Object.entries(this.load())) {
      if (isTomb(val)) m.delete(id); else m.set(id, val);
    }
    return m;
  }

  async list(q?: ContentQuery): Promise<ContentRecord[]> {
    return [...this.merged().values()]
      .filter((r) => matchesQuery(r, q))
      .sort((a, b) => a.entity.name.localeCompare(b.entity.name, "ar"));
  }
  async get(id: string): Promise<ContentRecord | null> {
    return this.merged().get(id) ?? null;
  }

  async save(entity: KBEntity, opts?: { status?: ContentStatus; updatedBy?: string }): Promise<ContentRecord> {
    const existing = this.merged().get(entity.id);
    const status = opts?.status ?? existing?.status ?? "draft";
    const version = (existing?.version ?? 0) + 1;
    const rec: ContentRecord = {
      entity: { ...entity, meta: { ...(entity.meta ?? { version: 1, lastUpdated: today() }), version, lastUpdated: today(), status } },
      status, version, updatedAt: new Date().toISOString(), updatedBy: opts?.updatedBy,
    };
    const o = this.load(); o[entity.id] = rec; this.persist(o);
    return rec;
  }

  async setStatus(id: string, status: ContentStatus): Promise<ContentRecord> {
    const cur = this.merged().get(id);
    if (!cur) throw new Error(`المحتوى غير موجود: ${id}`);
    const rec: ContentRecord = {
      ...cur, status, updatedAt: new Date().toISOString(),
      entity: { ...cur.entity, meta: { ...(cur.entity.meta ?? { version: cur.version, lastUpdated: today() }), status } },
    };
    const o = this.load(); o[id] = rec; this.persist(o);
    return rec;
  }

  async remove(id: string): Promise<void> {
    const o = this.load(); o[id] = { _deleted: true }; this.persist(o);
  }
}
