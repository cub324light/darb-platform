/* ─── مستودع محتوى Firestore (الإنتاج) — Adapter ───
   يحقّق ContentRepository نفسه فوق Firestore. البذرة (الكود) هي الأساس المنشور،
   ومجموعة «content» في Firestore هي طبقة التحرير/الإضافة. تغيير المحتوى يظهر فوراً
   بلا إعادة نشر. لو بدّلنا Firestore بـSupabase/Postgres مستقبلاً، نكتب Adapter
   جديداً بنفس الواجهة — بلا لمس الأدمن أو المنطق.

   ملاحظة تشغيل: يتطلّب قواعد أمان Firestore تسمح للأدمن بالكتابة في «content». */
import { db } from "../../firebase";
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from "firebase/firestore";
import { KB } from "../entities";
import type { KBEntity } from "../entities/schema";
import {
  type ContentRepository, type ContentRecord, type ContentQuery, type ContentStatus,
  matchesQuery, toRecord,
} from "./repository";

const COL = "content";
type Tombstone = { _deleted: true };
const isTomb = (v: unknown): v is Tombstone => !!v && typeof v === "object" && "_deleted" in v;
const today = () => new Date().toISOString().slice(0, 10);
/* معرّف مستند آمن (Firestore يرفض «/») — نُبقي المعرّف الحقيقي داخل السجلّ */
const docId = (id: string) => id.replace(/[/:]/g, "__");

export class FirestoreContentRepository implements ContentRepository {
  readonly backend = "Firestore";
  constructor(private database: Firestore = db) {}

  private baseMap(): Map<string, ContentRecord> {
    const m = new Map<string, ContentRecord>();
    for (const e of KB.all()) m.set(e.id, toRecord(e));
    return m;
  }

  private async merged(): Promise<Map<string, ContentRecord>> {
    const m = this.baseMap();
    const snap = await getDocs(collection(this.database, COL));
    snap.forEach((d) => {
      const data = d.data();
      if (isTomb(data)) { const id = (data as { id?: string }).id; if (id) m.delete(id); return; }
      const rec = data as ContentRecord;
      if (rec.entity?.id) m.set(rec.entity.id, rec);
    });
    return m;
  }

  async list(q?: ContentQuery): Promise<ContentRecord[]> {
    return [...(await this.merged()).values()]
      .filter((r) => matchesQuery(r, q))
      .sort((a, b) => a.entity.name.localeCompare(b.entity.name, "ar"));
  }

  async get(id: string): Promise<ContentRecord | null> {
    const s = await getDoc(doc(this.database, COL, docId(id)));
    if (s.exists()) { const data = s.data(); return isTomb(data) ? null : (data as ContentRecord); }
    return this.baseMap().get(id) ?? null;
  }

  async save(entity: KBEntity, opts?: { status?: ContentStatus; updatedBy?: string }): Promise<ContentRecord> {
    const existing = await this.get(entity.id);
    const status = opts?.status ?? existing?.status ?? "draft";
    const version = (existing?.version ?? 0) + 1;
    const rec: ContentRecord = {
      entity: { ...entity, meta: { ...(entity.meta ?? { version: 1, lastUpdated: today() }), version, lastUpdated: today(), status } },
      status, version, updatedAt: new Date().toISOString(), updatedBy: opts?.updatedBy,
    };
    await setDoc(doc(this.database, COL, docId(entity.id)), rec);
    return rec;
  }

  async setStatus(id: string, status: ContentStatus): Promise<ContentRecord> {
    const cur = await this.get(id);
    if (!cur) throw new Error(`المحتوى غير موجود: ${id}`);
    const rec: ContentRecord = {
      ...cur, status, updatedAt: new Date().toISOString(),
      entity: { ...cur.entity, meta: { ...(cur.entity.meta ?? { version: cur.version, lastUpdated: today() }), status } },
    };
    await setDoc(doc(this.database, COL, docId(id)), rec);
    return rec;
  }

  async remove(id: string): Promise<void> {
    /* شاهدة حذفٍ (tombstone) — لإخفاء عنصرٍ من البذرة أيضاً */
    await setDoc(doc(this.database, COL, docId(id)), { _deleted: true, id });
  }
}
