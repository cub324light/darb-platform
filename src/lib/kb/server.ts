/* ─── قاعدة المعرفة — طبقة الخادم ───
   تدمج البذرة مع overlay من Firestore (kb_sources / kb_entries) وتُخبّئها
   ذاكرياً (TTL) فلا تُقرأ القاعدة مع كل طلب — يخدم ملايين الطلبات بكفاءة.
   إن غابت بيئة Admin SDK تعمل بالبذرة فقط (offline-first). خادمية فقط. */
import { getAdminDbOptional } from "@/lib/server/firebaseAdmin";
import { buildSnapshot, searchKB, type KBSnapshot, type KBResult } from "./index";
import { KB } from "./entities";
import type { Source, KBEntry, SourceCategory } from "./types";

let cache: { snap: KBSnapshot; at: number } | null = null;
const TTL_MS = 5 * 60_000;

/* يبطل الخبيئة بعد أي تعديل إداري على المصادر/المدخلات */
export function invalidateKBCache(): void { cache = null; }

export async function getKBSnapshot(now: number): Promise<KBSnapshot> {
  if (cache && now - cache.at < TTL_MS) return cache.snap;

  let overlaySources: Source[] = [];
  let overlayEntries: KBEntry[] = [];
  try {
    const db = await getAdminDbOptional();
    if (db) {
      const [sSnap, eSnap] = await Promise.all([
        db.collection("kb_sources").limit(2000).get(),
        db.collection("kb_entries").limit(5000).get(),
      ]);
      overlaySources = sSnap.docs.map((d) => ({ ...(d.data() as Source), id: d.id }));
      overlayEntries = eSnap.docs.map((d) => ({ ...(d.data() as KBEntry), id: d.id }));
    }
  } catch {
    /* تعذّر القراءة — نكمل بالبذرة فقط */
  }

  const snap = buildSnapshot({ sources: overlaySources, entries: overlayEntries });
  cache = { snap, at: now };
  return snap;
}

/* تأريض دويرب من قاعدة المعرفة (offline-first) لاستعلام نصّي.
   جسرٌ لنموذج العالم: نضمّ حقائق الرسم (المفاهيم/الدروس وعلاقاتها) إلى التأريض،
   فيشرح دويرب أي مفهومٍ أو درسٍ بُني في KB دون إعادة هيكلة — مصدر الحقيقة واحد. */
export async function kbGroundingFor(
  query: string,
  opts: { category?: SourceCategory; now: number; limit?: number },
): Promise<KBResult> {
  const snap = await getKBSnapshot(opts.now);
  const result = searchKB(query, snap, opts);

  const worldFacts = KB.groundingFor(query, 2);
  if (worldFacts) {
    result.grounding = [result.grounding, `حقائق من معرفة درب:\n${worldFacts}`].filter(Boolean).join("\n\n");
  }
  return result;
}
