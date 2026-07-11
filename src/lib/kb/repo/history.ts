/* ─── سجلّ تعديلات المحتوى (History) ───
   كل تغييرٍ يُسجَّل: من؟ متى؟ ماذا تغيّر؟ — حتى لو كان المحرّر واحداً الآن. نلفّ
   المستودع بطبقةٍ تُسجّل تلقائياً عند save/setStatus/remove، فلا يعتمد التسجيل على
   ذاكرة المستدعي. التخزين محلي الآن (للإنتاج: مجموعة content_history في Firestore). */
import type { ContentRepository, ContentQuery } from "./repository";
import type { KBEntity, ContentStatus } from "../entities/schema";

export type HistoryAction = "create" | "update" | "status" | "delete";
export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  entityId: string;
  entityName: string;
  status?: ContentStatus;
  by: string;      // اسم المحرِّر
  at: string;      // ISO
}

const KEY = "darb_content_history";
const uid = () => `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function currentEditor(): string {
  if (typeof localStorage === "undefined") return "النظام";
  try { const u = JSON.parse(localStorage.getItem("darb_user") ?? "{}"); return u?.name || "أدمن"; } catch { return "أدمن"; }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try { return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as HistoryEntry[]).sort((a, b) => (a.at < b.at ? 1 : -1)); } catch { return []; }
}

export function recordHistory(e: Omit<HistoryEntry, "id" | "by" | "at">): void {
  if (typeof localStorage === "undefined") return;
  const entry: HistoryEntry = { ...e, id: uid(), by: currentEditor(), at: new Date().toISOString() };
  try {
    const list = [entry, ...loadHistory()].slice(0, 500);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* تجاهل */ }
}

/* غلافٌ يُسجّل تلقائياً — يحافظ على نفس الواجهة (Decorator) */
export function withHistory(inner: ContentRepository): ContentRepository {
  return {
    backend: inner.backend,
    list: (q?: ContentQuery) => inner.list(q),
    get: (id: string) => inner.get(id),
    async save(entity: KBEntity, opts) {
      const existed = await inner.get(entity.id);
      const rec = await inner.save(entity, opts);
      recordHistory({ action: existed ? "update" : "create", entityId: entity.id, entityName: entity.name, status: rec.status });
      return rec;
    },
    async setStatus(id: string, status: ContentStatus) {
      const rec = await inner.setStatus(id, status);
      recordHistory({ action: "status", entityId: id, entityName: rec.entity.name, status });
      return rec;
    },
    async remove(id: string) {
      const cur = await inner.get(id);
      await inner.remove(id);
      recordHistory({ action: "delete", entityId: id, entityName: cur?.entity.name ?? id });
    },
  };
}

export const ACTION_LABEL: Record<HistoryAction, string> = {
  create: "أنشأ", update: "عدّل", status: "غيّر الحالة", delete: "حذف",
};
