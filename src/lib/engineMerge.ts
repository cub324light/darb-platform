/* ─── دمج حالة المحرّكات (نقيّ، بلا تخزين/شبكة) ───
   منفصل عن engineSync كي يُختبَر باستقلال (لا firebase). الدمج حتميّ. */
import { pruneEventWindow } from "./events/store";
import type { AnyMemory } from "./memory/types";
import type { AnyEvent } from "./events/types";

/** يدمج الذاكرات حسب id: الأعلى version (ثم الأحدث updatedAt) يفوز. */
export function mergeMemories(local: AnyMemory[], cloud: AnyMemory[]): AnyMemory[] {
  const byId = new Map<string, AnyMemory>();
  for (const m of cloud) byId.set(m.id, m);
  for (const m of local) {
    const ex = byId.get(m.id);
    if (!ex || m.version > ex.version || (m.version === ex.version && m.updatedAt >= ex.updatedAt)) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()];
}

/** يدمج الأحداث: اتحاد حسب id (الحدث ثابت)، ترتيب زمني، ثم قصّ النافذة. */
export function mergeEvents(local: AnyEvent[], cloud: AnyEvent[], now: number): AnyEvent[] {
  const byId = new Map<string, AnyEvent>();
  for (const e of cloud) byId.set(e.id, e);
  for (const e of local) byId.set(e.id, e);
  const all = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  return pruneEventWindow(all, now);
}
