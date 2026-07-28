/* ═══════════ تخزين مصادر المذاكرة — طبقة IO رقيقة ═══════════
   ▸ المحرّك النقيّ في `sources.ts` لا يعرف localStorage. هنا القراءة والكتابة فقط، بلا منطق.
   ▸ مفتاحٌ واحد على نمط `calendarStore.ts` — والمصادر مصفوفةٌ واحدة تُصفّى بالاختبار والمادة. */
import type { StudySource } from "./sources";

const KEY = "darb_sources";

export function loadSources(): StudySource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? (arr as StudySource[]) : [];
  } catch { return []; }
}

export function saveSources(list: StudySource[]): StudySource[] {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* تجاهل */ }
  return list;
}

/** مصادر مادةٍ بعينها داخل اختبارٍ بعينه. */
export function sourcesFor(examId: string, subject: string, all = loadSources()): StudySource[] {
  return all.filter((s) => s.examId === examId && s.subject === subject);
}

export function addSource(src: StudySource): StudySource[] {
  return saveSources([...loadSources(), src]);
}

export function updateSource(id: string, next: StudySource): StudySource[] {
  return saveSources(loadSources().map((s) => (s.id === id ? next : s)));
}

export function removeSource(id: string): StudySource[] {
  return saveSources(loadSources().filter((s) => s.id !== id));
}
