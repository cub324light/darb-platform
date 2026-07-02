/* ─── المحتوى التعليمي العام — طبقة الخادم ───
   تدمج البذرة مع overlay من Firestore (المجموعات السبع) وتُخبّئها ذاكرياً
   (TTL خمس دقائق) فلا تُقرأ المجموعات مع كل طلب. إن غابت بيئة Admin SDK
   تعمل بالبذرة فقط (offline-first — البناء لا يعتمد على Firestore أبداً).
   خادمية فقط — نفس نمط kb/server.ts. */
import { getAdminDbOptional } from "@/lib/server/firebaseAdmin";
import { buildContentSnapshot } from "./index";
import type {
  ContentSnapshot, ContentOverlay,
  FaqDoc, ReferenceListDoc, TipDoc, TahsiliFlashcardDoc, StudyStrategyDoc, SuccessStoryDoc,
} from "./types";

let cache: { snap: ContentSnapshot; at: number } | null = null;
const TTL_MS = 5 * 60_000;

/* يبطل الخبيئة بعد أي تحديث للمحتوى (مثلاً بعد إعادة الرفع من السكربت) */
export function invalidateContentCache(): void { cache = null; }

/* now اختياري (افتراضياً وقت النداء) — الصفحات الخادمية تناديها بلا وسيط
   كي لا تستدعي Date.now() داخل جسم المكوّن (قاعدة نقاء React Compiler) */
export async function getContentSnapshot(now: number = Date.now()): Promise<ContentSnapshot> {
  if (cache && now - cache.at < TTL_MS) return cache.snap;

  const overlay: ContentOverlay = {};
  try {
    const db = await getAdminDbOptional();
    if (db) {
      const [g, q, r, t, f, s, st] = await Promise.all([
        db.collection("faq_general").limit(500).get(),
        db.collection("faq_qubool").limit(500).get(),
        db.collection("reference_lists").limit(500).get(),
        db.collection("tips").limit(500).get(),
        db.collection("tahsili_flashcards").limit(500).get(),
        db.collection("study_strategies").limit(500).get(),
        db.collection("success_stories").limit(500).get(),
      ]);
      overlay.faq_general = g.docs.map((d) => ({ ...(d.data() as FaqDoc), id: d.id }));
      overlay.faq_qubool = q.docs.map((d) => ({ ...(d.data() as FaqDoc), id: d.id }));
      overlay.reference_lists = r.docs.map((d) => ({ ...(d.data() as ReferenceListDoc), id: d.id }));
      overlay.tips = t.docs.map((d) => ({ ...(d.data() as TipDoc), id: d.id }));
      overlay.tahsili_flashcards = f.docs.map((d) => ({ ...(d.data() as TahsiliFlashcardDoc), id: d.id }));
      overlay.study_strategies = s.docs.map((d) => ({ ...(d.data() as StudyStrategyDoc), id: d.id }));
      overlay.success_stories = st.docs.map((d) => ({ ...(d.data() as SuccessStoryDoc), id: d.id }));
    }
  } catch {
    /* تعذّر القراءة — نكمل بالبذرة فقط */
  }

  const snap = buildContentSnapshot(overlay);
  cache = { snap, at: now };
  return snap;
}
